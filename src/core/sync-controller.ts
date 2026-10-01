// SyncController: lê/escreve arquivos de configuração do Antigravity IDE
// Compatível somente com Antigravity IDE 2.0+

import { spawn } from "child_process";
import { readFile, readdir, mkdir, rename, rm, unlink, writeFile } from "fs/promises";
import * as os from "os";
import * as path from "path";
import {
    Extension,
    ExtensionContext,
    Uri,
    commands,
    extensions,
    workspace,
} from "vscode";
import { IExtensionProfileEntry, IProfile, ISyncItem } from "../models/interfaces";
import {
    createGlobalLayoutDocument,
    createLayoutProfile,
    createWorkspaceLayout,
    getWorkspaceLayouts,
    ILayoutProfile,
    isAllowedGlobalLayoutKey,
    isAllowedWorkspaceLayoutEntry,
    normalizeLayoutProfile,
} from "../models/layout-profile";
import {
    IProfileRestorePreview,
    isSafeSnippetFileName,
    validateRemoteProfile,
} from "./profile-validator";
import {
    applyLayoutEntries,
    readGlobalLayoutEntries,
    readWorkspaceLayoutEntries,
} from "./layout-state-database";
import Logger from "./logger";

export interface ILayoutRestorePreview {
    globalEntryCount: number;
    globalKeys: string[];
    workspaces: Array<{
        sourceId: string;
        label: string;
        entryCount: number;
    }>;
}

export interface ILayoutBackupInfo {
    id: string;
    createdAt: string;
    databaseCount: number;
}

type LayoutBackupTarget = "global" | "workspace";

interface ILayoutBackupManifest {
    schemaVersion: 1;
    createdAt: string;
    files: Array<{
        name: string;
        target: LayoutBackupTarget;
        workspaceId?: string;
    }>;
}

interface ILayoutChange {
    name: string;
    target: LayoutBackupTarget;
    workspaceId?: string;
    databasePath: string;
    original: Buffer;
    updated: Uint8Array;
}

interface IProfileFileChange {
    name: string;
    filePath: string;
    original?: Buffer;
    updated: Buffer;
}

interface IProfileBackupManifest {
    schemaVersion: 1;
    createdAt: string;
    files: Array<{ name: string; existed: boolean }>;
}

interface IPendingLayoutReplacement {
    schemaVersion: 1;
    userDataPath: string;
    replacements: Array<{
        sourceName: string;
        targetPath: string;
    }>;
}

export interface IProfileApplicationResult {
    layoutWillApplyAfterExit: boolean;
}

export default class SyncController {
    context: ExtensionContext;
    logger: Logger;

    private constructor(logger: Logger, context: ExtensionContext) {
        this.logger = logger;
        this.context = context;
    }

    /** Inicializa o controlador: localiza settings.json e keybindings.json */
    public static async initialize(
        logger: Logger,
        context: ExtensionContext
    ): Promise<SyncController | undefined> {
        // Localiza ou cria os arquivos oficiais da instalação atual do Antigravity.
        for (const fileType of ["settings", "keybindings"] as const) {
            const found = await SyncController.findConfigFile(fileType, logger);
            if (!found) {
                logger.error(
                    `Não foi possível preparar ${fileType}.json no diretório do Antigravity`,
                    "SyncController.initialize",
                    true
                );
                return undefined;
            }
            await context.globalState.update(`${fileType}Path`, found);
            logger.info(`${fileType}.json localizado automaticamente: ${found}`);
        }

        // Protege contra uma detecção inesperada em que os dois arquivos coincidam.
        const settingsPath = context.globalState.get<string>("settingsPath");
        const keybindingsPath = context.globalState.get<string>("keybindingsPath");
        if (settingsPath && keybindingsPath && settingsPath === keybindingsPath) {
            logger.error(
                "Os arquivos de configurações e atalhos foram resolvidos para o mesmo destino",
                "SyncController.initialize",
                true
            );
            return undefined;
        }

        return new SyncController(logger, context);
    }

    /** Tenta vários caminhos para localizar o arquivo de configuração: cria no caminho padrão se estiver ausente */
    private static async findConfigFile(
        file: "settings" | "keybindings",
        logger: Logger
    ): Promise<string | null> {
        const candidates = SyncController.getConfigPaths(`${file}.json`);
        for (const candidatePath of candidates) {
            try {
                await workspace.fs.stat(Uri.file(candidatePath));
                return candidatePath;
            } catch {
                logger.info(`Não encontrado: ${candidatePath}`);
            }
        }

        // Cria automaticamente no primeiro caminho candidato em vez de exigir o seletor manual
        if (candidates.length > 0) {
            const defaultPath = candidates[0];
            try {
                const defaultContent = file === "settings" ? "{}" : "[]";
                await mkdir(path.dirname(defaultPath), { recursive: true });
                await writeFile(defaultPath, defaultContent);
                logger.info(`${file}.json padrão criado em: ${defaultPath}`);
                return defaultPath;
            } catch (err) {
                logger.error(`Falha ao criar ${file}.json padrão`, "findConfigFile", false, err);
            }
        }

        return null;
    }

    /** Retorna os caminhos possíveis de configuração para um arquivo ou diretório relativo. */
    private static getConfigPaths(relativePath: string): string[] {
        const appName = "Antigravity IDE";
        switch (os.platform()) {
            case "win32":
                return [
                    `${process.env.APPDATA}\\${appName}\\User\\${relativePath}`,
                    `${process.env.USERPROFILE}\\AppData\\Roaming\\${appName}\\User\\${relativePath}`,
                ];
            case "darwin":
                return [
                    `${process.env.HOME}/Library/Application Support/${appName}/User/${relativePath}`,
                    `${os.homedir()}/Library/Application Support/${appName}/User/${relativePath}`,
                ];
            default:
                return [
                    `${process.env.HOME}/.config/${appName}/User/${relativePath}`,
                    `${process.env.XDG_CONFIG_HOME || `${os.homedir()}/.config`}/${appName}/User/${relativePath}`,
                    `${os.homedir()}/.config/${appName}/User/${relativePath}`,
                ];
        }
    }

    /** Lê a configuração atual com base nos itens de sincronização habilitados */
    public async getActiveProfile(syncItems: ISyncItem[], existingLayout?: unknown): Promise<IProfile> {
        const data: Record<string, any> = {};

        for (const item of syncItems.filter(i => i.enabled)) {
            switch (item.key) {
                case "settings":
                    data.settings = await this.readConfigRaw("settings");
                    break;
                case "keybindings":
                    data.keybindings = await this.readConfigRaw("keybindings");
                    break;
                case "extensions":
                    const localExtensions = this.getExtensions();
                    data.extensions = localExtensions.map((entry) => entry.id);
                    data.extensionDisplayNames = Object.fromEntries(
                        localExtensions.map((entry) => [entry.id, entry.displayName])
                    );
                    break;
                case "snippets":
                    data.snippets = await this.readSnippets();
                    break;
                case "layout":
                    data.layout = await this.readLayoutProfile(existingLayout);
                    break;
                default:
                    break;
            }
        }

        return { profileName: "", data };
    }

    /** Escreve a configuração com base nos itens habilitados (as extensões são tratadas separadamente pelo provedor) */
    public async updateLocalProfile(
        profile: IProfile,
        syncItems: ISyncItem[],
        workspaceLayoutId?: string
    ): Promise<IProfileApplicationResult> {
        const validated = this.validateIncomingProfile(profile, syncItems).profile;
        const fileChanges = await this.prepareProfileFileChanges(validated, syncItems);
        const backupPath = fileChanges.length > 0
            ? await this.createProfileRestoreBackup(fileChanges)
            : undefined;
        const applied: IProfileFileChange[] = [];

        try {
            for (const change of fileChanges) {
                await this.replaceFileAtomically(change.filePath, change.updated);
                applied.push(change);
            }
            const layoutWillApplyAfterExit = Object.prototype.hasOwnProperty.call(validated.data, "layout")
                ? await this.restoreLayoutProfile(validated.data.layout, workspaceLayoutId)
                : false;

            if (backupPath) {
                this.logger.info(`Perfil aplicado. Backup local criado em: ${backupPath}`);
            }
            return { layoutWillApplyAfterExit };
        } catch (error) {
            await this.rollbackProfileFileChanges(applied);
            if (backupPath) {
                this.logger.warn(`Restauração revertida. Backup local preservado em: ${backupPath}`);
            }
            throw error;
        }
    }

    /** Valida um perfil remoto e produz a prévia usada antes da confirmação da pessoa usuária. */
    public validateIncomingProfile(
        profile: IProfile,
        syncItems: ISyncItem[]
    ): { profile: IProfile; preview: IProfileRestorePreview } {
        return validateRemoteProfile(profile, syncItems);
    }

    /** Lê o arquivo de configuração como base64: preserva comentários/espaços em branco */
    private async readConfigRaw(t: "keybindings" | "settings"): Promise<string | undefined> {
        try {
            const filePath = await this.resolveConfigFilePath(t);
            const buffer = await readFile(filePath);
            return buffer.toString("base64");
        } catch {
            this.logger.error(`Falha ao ler o arquivo de ${t} da instalação atual`, "SyncController.readConfigRaw", true);
            return undefined;
        }
    }

    /** Prepara todas as alterações de arquivos antes de escrever a primeira delas. */
    private async prepareProfileFileChanges(profile: IProfile, syncItems: ISyncItem[]): Promise<IProfileFileChange[]> {
        const changes: IProfileFileChange[] = [];
        const enabledKeys = new Set(syncItems.filter((item) => item.enabled).map((item) => item.key));
        if (enabledKeys.has("settings") && Object.prototype.hasOwnProperty.call(profile.data, "settings")) {
            const settingsPath = await this.resolveConfigFilePath("settings");
            changes.push(await this.createProfileFileChange(
                "settings.json",
                settingsPath,
                Buffer.from(profile.data.settings, "base64")
            ));
        }
        if (enabledKeys.has("keybindings") && Object.prototype.hasOwnProperty.call(profile.data, "keybindings")) {
            const keybindingsPath = await this.resolveConfigFilePath("keybindings");
            changes.push(await this.createProfileFileChange(
                "keybindings.json",
                keybindingsPath,
                Buffer.from(profile.data.keybindings, "base64")
            ));
        }
        if (enabledKeys.has("snippets") && Object.prototype.hasOwnProperty.call(profile.data, "snippets")) {
            const snippetDirectory = await this.getSnippetDirectory();
            for (const [fileName, base64Content] of Object.entries(profile.data.snippets as Record<string, string>)) {
                if (!isSafeSnippetFileName(fileName)) {
                    throw new Error("Nome de snippet inválido após validação");
                }
                const filePath = path.resolve(snippetDirectory, fileName);
                if (!filePath.startsWith(`${path.resolve(snippetDirectory)}${path.sep}`)) {
                    throw new Error("Caminho de snippet inválido após validação");
                }
                changes.push(await this.createProfileFileChange(
                    path.join("snippets", fileName),
                    filePath,
                    Buffer.from(base64Content, "base64")
                ));
            }
        }
        return changes;
    }

    /** Monta uma alteração com o conteúdo original necessário para rollback. */
    private async createProfileFileChange(
        name: string,
        filePath: string,
        updated: Buffer
    ): Promise<IProfileFileChange> {
        return { name, filePath, original: await this.readFileIfExists(filePath), updated };
    }

    /** Obtém ou cria somente o caminho esperado para snippets, sem depender de dados remotos. */
    private async getSnippetDirectory(): Promise<string> {
        return (await SyncController.findConfigDir("snippets", this.logger))
            ?? SyncController.getConfigPaths("snippets")[0];
    }

    /** Lê um arquivo existente e distingue ausência de erro de acesso. */
    private async readFileIfExists(filePath: string): Promise<Buffer | undefined> {
        try {
            return await readFile(filePath);
        } catch (error: any) {
            if (error?.code === "ENOENT") {
                return undefined;
            }
            throw error;
        }
    }

    /** Grava o backup local da restauração antes de modificar configurações, atalhos ou snippets. */
    private async createProfileRestoreBackup(changes: IProfileFileChange[]): Promise<string> {
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const backupPath = path.join(this.context.globalStorageUri.fsPath, "profile-backups", timestamp);
        await mkdir(backupPath, { recursive: true });
        for (const change of changes) {
            if (change.original === undefined) {
                continue;
            }
            const backupFilePath = path.join(backupPath, change.name);
            await mkdir(path.dirname(backupFilePath), { recursive: true });
            await writeFile(backupFilePath, change.original, { flag: "wx" });
        }
        const manifest: IProfileBackupManifest = {
            schemaVersion: 1,
            createdAt: new Date().toISOString(),
            files: changes.map((change) => ({ name: change.name, existed: change.original !== undefined })),
        };
        await writeFile(path.join(backupPath, "manifest.json"), JSON.stringify(manifest, null, 2), { flag: "wx" });
        return backupPath;
    }

    /** Reverte somente os arquivos já alterados quando uma etapa posterior falhar. */
    private async rollbackProfileFileChanges(changes: IProfileFileChange[]): Promise<void> {
        for (const change of changes.reverse()) {
            try {
                if (change.original === undefined) {
                    await unlink(change.filePath).catch((error: any) => {
                        if (error?.code !== "ENOENT") {
                            throw error;
                        }
                    });
                } else {
                    await this.replaceFileAtomically(change.filePath, change.original);
                }
            } catch (rollbackError) {
                this.logger.error(
                    `Falha ao reverter ${change.name}`,
                    "SyncController.rollbackProfileFileChanges",
                    false,
                    rollbackError
                );
            }
        }
    }

    /** Obtém a lista de extensões instaladas (exceto as nativas) */
    private getExtensions(): IExtensionProfileEntry[] {
        const excludeList =
            workspace
                .getConfiguration("antigravitysync")
                .get<string[]>("excludeExtensions") || [];
        return extensions.all
            .filter((ext: Extension<any>) => !ext.packageJSON.isBuiltin)
            .filter((ext: Extension<any>) => !excludeList.includes(ext.id))
            .map((ext: Extension<any>) => ({
                id: ext.id,
                displayName: String(ext.packageJSON.displayName || ext.packageJSON.name || ext.id),
            }));
    }

    // ===== Layout helpers =====

    /** Lê o layout global e preserva os workspaces já associados ao perfil. */
    private async readLayoutProfile(existingLayout?: unknown): Promise<ILayoutProfile> {
        const userDataPath = await this.getUserDataPath();
        const globalEntries = await readGlobalLayoutEntries(
            path.join(userDataPath, "globalStorage", "state.vscdb")
        );
        const global = createGlobalLayoutDocument(globalEntries);
        const workspace = await this.findActiveWorkspaceStorage(userDataPath);

        const existingWorkspaces = existingLayout
            ? getWorkspaceLayouts(this.parseLayoutProfile(existingLayout))
            : [];
        if (!workspace) {
            return createLayoutProfile(global, existingWorkspaces);
        }

        const entries = await readWorkspaceLayoutEntries(workspace.databasePath);
        const currentWorkspace = createWorkspaceLayout(workspace.id, workspace.label, entries);
        const otherWorkspaces = existingWorkspaces.filter((item) => item.sourceId !== currentWorkspace.sourceId);
        return createLayoutProfile(global, [...otherWorkspaces, currentWorkspace]);
    }

    /** Prepara o layout em bancos separados e o agenda para o momento em que a IDE liberar os arquivos. */
    private async restoreLayoutProfile(layout: unknown, workspaceLayoutId?: string): Promise<boolean> {
        const profile = this.parseLayoutProfile(layout);
        const userDataPath = await this.getUserDataPath();
        const changes: ILayoutChange[] = [];
        const globalDatabasePath = path.join(userDataPath, "globalStorage", "state.vscdb");

        changes.push({
            name: "global-state.vscdb",
            target: "global",
            databasePath: globalDatabasePath,
            original: await readFile(globalDatabasePath),
            updated: await applyLayoutEntries(
                globalDatabasePath,
                profile.global.entries,
                (entry) => isAllowedGlobalLayoutKey(entry.key)
            ),
        });

        const workspaceLayout = this.selectWorkspaceLayout(profile, workspaceLayoutId);
        if (workspaceLayout) {
            const workspace = await this.findActiveWorkspaceStorage(userDataPath);
            if (!workspace) {
                throw new Error("Abra o workspace de destino antes de restaurar o layout dele");
            }

            changes.push({
                name: `workspace-${workspace.id}.vscdb`,
                target: "workspace",
                workspaceId: workspace.id,
                databasePath: workspace.databasePath,
                original: await readFile(workspace.databasePath),
                updated: await applyLayoutEntries(
                    workspace.databasePath,
                    workspaceLayout.entries,
                    isAllowedWorkspaceLayoutEntry
                ),
            });
        }

        const backupPath = await this.createLayoutBackup(changes);
        const pendingPath = await this.scheduleLayoutReplacement(changes, userDataPath);
        this.logger.info(
            `Layout programado para a próxima saída completa do Antigravity. Backup: ${backupPath}; pendência: ${pendingPath}`,
            true
        );
        return true;
    }

    /** Produz a prévia segura dos grupos e chaves que poderão ser restaurados. */
    public getLayoutRestorePreview(layout: unknown): ILayoutRestorePreview {
        const profile = this.parseLayoutProfile(layout);
        return {
            globalEntryCount: profile.global.entries.length,
            globalKeys: profile.global.entries.map((entry) => entry.key),
            workspaces: getWorkspaceLayouts(profile).map((workspaceLayout) => ({
                sourceId: workspaceLayout.sourceId,
                label: workspaceLayout.label,
                entryCount: workspaceLayout.entries.length,
            })),
        };
    }

    /** Retorna o backup de layout mais recente que pode ser restaurado com segurança. */
    public async getLatestLayoutBackup(): Promise<ILayoutBackupInfo | undefined> {
        const root = this.getLayoutBackupRoot();
        try {
            const entries = await readdir(root, { withFileTypes: true });
            const backupIds = entries
                .filter((entry) => entry.isDirectory() && this.isSafeLayoutBackupId(entry.name))
                .map((entry) => entry.name)
                .sort()
                .reverse();
            for (const backupId of backupIds) {
                const manifest = await this.readLayoutBackupManifest(backupId).catch(() => undefined);
                if (manifest) {
                    return {
                        id: backupId,
                        createdAt: manifest.createdAt,
                        databaseCount: manifest.files.length,
                    };
                }
            }
        } catch {
            // Nenhum backup ainda foi criado.
        }
        return undefined;
    }

    /** Restaura o snapshot de layout mais recente e cria outro snapshot para desfazer a reversão. */
    public async rollbackLatestLayoutBackup(): Promise<ILayoutBackupInfo> {
        const backup = await this.getLatestLayoutBackup();
        if (!backup) {
            throw new Error("Nenhum backup de layout disponível para restaurar");
        }

        const manifest = await this.readLayoutBackupManifest(backup.id);
        const userDataPath = await this.getUserDataPath();
        const backupPath = this.getLayoutBackupPath(backup.id);
        const changes: ILayoutChange[] = [];

        for (const file of manifest.files) {
            const databasePath = this.getBackupTargetDatabasePath(file, userDataPath);
            const snapshotPath = path.resolve(backupPath, file.name);
            if (!snapshotPath.startsWith(`${backupPath}${path.sep}`)) {
                throw new Error("Arquivo de backup inválido");
            }
            changes.push({
                ...file,
                databasePath,
                original: await readFile(databasePath),
                updated: await readFile(snapshotPath),
            });
        }

        const rollbackBackupPath = await this.createLayoutBackup(changes);
        const pendingPath = await this.scheduleLayoutReplacement(changes, userDataPath);

        this.logger.info(
            `Backup de layout programado: ${backup.id}. Snapshot de segurança: ${rollbackBackupPath}; pendência: ${pendingPath}`,
            true
        );
        return backup;
    }

    /** Localiza o banco do workspace aberto sem incluir o caminho no perfil sincronizado. */
    private async findActiveWorkspaceStorage(userDataPath: string): Promise<{
        id: string;
        label: string;
        databasePath: string;
    } | undefined> {
        const activeFolder = workspace.workspaceFolders?.[0];
        if (!activeFolder) {
            return undefined;
        }

        const workspaceStoragePath = path.join(userDataPath, "workspaceStorage");
        const workspaceIds = await readdir(workspaceStoragePath, { withFileTypes: true });
        for (const workspaceId of workspaceIds) {
            if (!workspaceId.isDirectory() || !/^[a-f0-9]{16,128}$/i.test(workspaceId.name)) {
                continue;
            }

            const rootPath = path.join(workspaceStoragePath, workspaceId.name);
            try {
                const metadata = JSON.parse(
                    await readFile(path.join(rootPath, "workspace.json"), "utf8")
                ) as { folder?: string };
                if (metadata.folder !== activeFolder.uri.toString()) {
                    continue;
                }

                return {
                    id: workspaceId.name,
                    label: path.basename(activeFolder.uri.fsPath) || "Workspace",
                    databasePath: path.join(rootPath, "state.vscdb"),
                };
            } catch {
                // Ignora entradas incompletas ou incompatíveis de workspaceStorage.
            }
        }

        return undefined;
    }

    /** Resolve o arquivo oficial da instalação atual, sem aceitar diretórios escolhidos manualmente. */
    private async resolveConfigFilePath(t: "keybindings" | "settings"): Promise<string> {
        const filePath = await SyncController.findConfigFile(t, this.logger);
        if (!filePath) {
            throw new Error(`Não foi possível localizar ${t}.json no diretório do Antigravity`);
        }
        await this.context.globalState.update(`${t}Path`, filePath);
        return filePath;
    }

    /** Obtém a pasta User do Antigravity a partir do arquivo de configurações detectado. */
    private async getUserDataPath(): Promise<string> {
        const settingsPath = await this.resolveConfigFilePath("settings");
        return path.dirname(settingsPath);
    }

    /** Salva cópias de segurança antes de alterar qualquer banco de layout. */
    private async createLayoutBackup(changes: ILayoutChange[]): Promise<string> {
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const backupPath = this.getLayoutBackupPath(timestamp);
        await mkdir(backupPath, { recursive: true });
        for (const change of changes) {
            await writeFile(path.join(backupPath, change.name), change.original, { flag: "wx" });
        }
        const manifest: ILayoutBackupManifest = {
            schemaVersion: 1,
            createdAt: new Date().toISOString(),
            files: changes.map((change) => ({
                name: change.name,
                target: change.target,
                workspaceId: change.workspaceId,
            })),
        };
        await writeFile(
            path.join(backupPath, "manifest.json"),
            JSON.stringify(manifest, null, 2),
            { flag: "wx" }
        );
        return backupPath;
    }

    /** Raiz local e exclusiva dos snapshots criados pela extensão. */
    private getLayoutBackupRoot(): string {
        return path.join(this.context.globalStorageUri.fsPath, "layout-backups");
    }

    /** Resolve uma pasta de backup sem aceitar segmentos de caminho externos. */
    private getLayoutBackupPath(backupId: string): string {
        if (!this.isSafeLayoutBackupId(backupId)) {
            throw new Error("Identificador de backup inválido");
        }
        return path.join(this.getLayoutBackupRoot(), backupId);
    }

    /** Lê e valida o manifesto antes de usar qualquer caminho armazenado em backup. */
    private async readLayoutBackupManifest(backupId: string): Promise<ILayoutBackupManifest> {
        const backupPath = this.getLayoutBackupPath(backupId);
        const data = JSON.parse(await readFile(path.join(backupPath, "manifest.json"), "utf8")) as Partial<ILayoutBackupManifest>;
        if (data.schemaVersion !== 1 || typeof data.createdAt !== "string" || !Array.isArray(data.files) || data.files.length === 0) {
            throw new Error("Manifesto de backup inválido");
        }

        const files = data.files.map((file) => {
            if (
                !file ||
                typeof file.name !== "string" ||
                !/^(?:global-state|workspace-[a-f0-9]{16,128})\.vscdb$/i.test(file.name) ||
                (file.target !== "global" && file.target !== "workspace") ||
                (file.target === "workspace" && !/^[a-f0-9]{16,128}$/i.test(file.workspaceId || ""))
            ) {
                throw new Error("Entrada de backup inválida");
            }
            return {
                name: file.name,
                target: file.target,
                workspaceId: file.workspaceId,
            };
        });
        return { schemaVersion: 1, createdAt: data.createdAt, files };
    }

    /** Determina o destino local a partir de campos validados do manifesto. */
    private getBackupTargetDatabasePath(
        file: ILayoutBackupManifest["files"][number],
        userDataPath: string
    ): string {
        if (file.target === "global" && file.name === "global-state.vscdb") {
            return path.join(userDataPath, "globalStorage", "state.vscdb");
        }
        if (file.target === "workspace" && file.workspaceId && file.name === `workspace-${file.workspaceId}.vscdb`) {
            return path.join(userDataPath, "workspaceStorage", file.workspaceId, "state.vscdb");
        }
        throw new Error("Destino de backup inválido");
    }

    /** Aceita somente timestamps gerados pela extensão. */
    private isSafeLayoutBackupId(backupId: string): boolean {
        return /^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z$/.test(backupId);
    }

    /** Salva bancos preparados e inicia um processo que aguarda a IDE liberar seus arquivos. */
    private async scheduleLayoutReplacement(
        changes: ILayoutChange[],
        userDataPath: string
    ): Promise<string> {
        const id = new Date().toISOString().replace(/[:.]/g, "-");
        const pendingPath = path.join(this.context.globalStorageUri.fsPath, "layout-pending", id);
        await mkdir(pendingPath, { recursive: true });

        const replacements: IPendingLayoutReplacement["replacements"] = [];
        try {
            for (const change of changes) {
                const sourceName = change.name;
                const sourcePath = path.join(pendingPath, sourceName);
                await writeFile(sourcePath, change.updated, { flag: "wx" });
                replacements.push({ sourceName, targetPath: change.databasePath });
            }

            const manifest: IPendingLayoutReplacement = {
                schemaVersion: 1,
                userDataPath,
                replacements,
            };
            const manifestPath = path.join(pendingPath, "manifest.json");
            await writeFile(manifestPath, JSON.stringify(manifest), { flag: "wx" });
            this.startLayoutReplacementHelper(manifestPath);
            return pendingPath;
        } catch (error) {
            await rm(pendingPath, { recursive: true, force: true }).catch(() => undefined);
            throw error;
        }
    }

    /** Inicia o processo independente que conclui a troca após o encerramento da IDE. */
    private startLayoutReplacementHelper(manifestPath: string): void {
        const helperPath = path.join(
            this.context.extensionUri.fsPath,
            "dist",
            "layout-replacement-helper.js"
        );
        const helper = spawn(process.execPath, [helperPath, manifestPath], {
            detached: true,
            stdio: "ignore",
            windowsHide: true,
            env: { ...process.env, ELECTRON_RUN_AS_NODE: "1" },
        });
        helper.unref();
    }

    /** Substitui um arquivo somente após gravar uma cópia temporária completa. */
    private async replaceFileAtomically(filePath: string, content: Uint8Array): Promise<void> {
        await mkdir(path.dirname(filePath), { recursive: true });
        const temporaryPath = `${filePath}.antigravity-sync.tmp`;
        try {
            await writeFile(temporaryPath, Buffer.from(content), { flag: "wx" });
            await rename(temporaryPath, filePath);
        } catch (error) {
            await unlink(temporaryPath).catch(() => undefined);
            throw error;
        }
    }

    /** Escolhe o layout do workspace somente após uma seleção explícita quando houver mais de um. */
    private selectWorkspaceLayout(
        profile: ILayoutProfile,
        workspaceLayoutId?: string
    ) {
        const layouts = getWorkspaceLayouts(profile);
        if (layouts.length === 0) {
            return undefined;
        }
        if (layouts.length === 1) {
            return layouts[0];
        }
        if (!workspaceLayoutId) {
            throw new Error("Selecione o layout de workspace que deve ser restaurado");
        }

        const selected = layouts.find((layout) => layout.sourceId === workspaceLayoutId);
        if (!selected) {
            throw new Error("O layout de workspace selecionado não pertence ao perfil");
        }
        return selected;
    }

    /** Revalida dados recebidos do Drive antes de alterar o estado local. */
    private parseLayoutProfile(data: unknown): ILayoutProfile {
        return normalizeLayoutProfile(data);
    }

    // ===== Auxiliares de snippets =====

    /** Tenta vários caminhos para localizar uma pasta de configuração */
    private static async findConfigDir(dir: string, logger: Logger): Promise<string | null> {
        const candidates = SyncController.getConfigPaths(dir);
        for (const p of candidates) {
            try {
                await workspace.fs.stat(Uri.file(p));
                return p;
            } catch {
                logger.info(`Não encontrado: ${p}`);
            }
        }
        return null;
    }

    /** Lê todos os arquivos de snippets e cria o objeto agrupado { fileName: base64content } */
    private async readSnippets(): Promise<Record<string, string>> {
        const dir = await SyncController.findConfigDir("snippets", this.logger);
        const bundle: Record<string, string> = {};
        if (!dir) { return bundle; }
        try {
            const entries = await readdir(dir);
            for (const entry of entries) {
                if (entry.endsWith(".json") || entry.endsWith(".code-snippets")) {
                    const filePath = path.join(dir, entry);
                    const raw = await readFile(filePath);
                    bundle[entry] = raw.toString("base64");
                }
            }
        } catch {
            // A pasta não existe ou está vazia
        }
        return bundle;
    }

    /** Compara extensões locais e remotas: retorna as diferenças para confirmação do provedor */
    public getExtensionDiff(
        remoteList: string[],
        remoteDisplayNames: Record<string, string> = {}
    ): { toInstall: IExtensionProfileEntry[]; toDelete: IExtensionProfileEntry[] } {
        const localList = this.getExtensions();
        const localSet = new Set(localList.map((entry) => entry.id));
        const safeRemoteList = remoteList
            .filter((id) => this.isValidExtensionId(id))
            .map((id) => ({
                id,
                displayName: remoteDisplayNames[id] || this.displayNameFromExtensionId(id),
            }));
        const remoteSet = new Set(safeRemoteList.map((entry) => entry.id));

        return {
            toInstall: safeRemoteList.filter((entry) => !localSet.has(entry.id)),
            toDelete: localList.filter((entry) => !remoteSet.has(entry.id)),
        };
    }

    /** Aplica a sincronização de extensões: instala/desinstala sem confirmar (o provedor já confirmou) */
    public async applyExtensionSync(toInstall: string[], toDelete: string[]): Promise<boolean> {
        let needsReload = false;

        for (const id of toDelete) {
            if (!this.isValidExtensionId(id)) {
                this.logger.warn(`ID de extensão inválido ignorado: ${id}`);
                continue;
            }
            try {
                await commands.executeCommand("workbench.extensions.uninstallExtension", id);
                needsReload = true;
            } catch (error) {
                this.logger.error(`Falha ao desinstalar ${id}`, "applyExtensionSync", false, error);
            }
        }

        for (const id of toInstall) {
            if (!this.isValidExtensionId(id)) {
                this.logger.warn(`ID de extensão inválido ignorado: ${id}`);
                continue;
            }
            try {
                await commands.executeCommand("workbench.extensions.installExtension", id);
                needsReload = true;
            } catch (error) {
                this.logger.error(`Falha ao instalar ${id}`, "applyExtensionSync", false, error);
            }
        }

        return needsReload;
    }

    /** Nome legível para perfis antigos que ainda não contêm metadados públicos. */
    private displayNameFromExtensionId(id: string): string {
        const extensionName = id.split(".")[1] || id;
        return extensionName
            .split(/[-_]+/)
            .filter(Boolean)
            .map((part) => part.length <= 4 ? part.toUpperCase() : `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
            .join(" ");
    }

    /** Valida o formato publisher.name antes de acionar comandos de extensão. */
    private isValidExtensionId(id: string): boolean {
        return /^[a-z0-9][a-z0-9-]*\.[a-z0-9][a-z0-9-]*$/i.test(id);
    }
}
