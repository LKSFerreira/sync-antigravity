// SyncController: lê/escreve arquivos de configuração do Antigravity IDE
// Compatível somente com Antigravity IDE 2.0+

import { readFile, readdir, mkdir, rename, unlink, writeFile } from "fs/promises";
import * as os from "os";
import * as path from "path";
import {
    Extension,
    ExtensionContext,
    Uri,
    commands,
    extensions,
    window,
    workspace,
} from "vscode";
import { IProfile, ISyncItem } from "../models/interfaces";
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
        // Verifica e localiza os caminhos de configuração de settings.json e keybindings.json
        for (const fileType of ["settings", "keybindings"] as const) {
            const cachedPath: string | undefined = context.globalState.get(`${fileType}Path`);

            // Verifica o caminho em cache: remove se apontar para a pasta errada ou se o arquivo não existir
            if (cachedPath) {
                const isStale = await SyncController.isPathStale(cachedPath, logger);
                if (isStale) {
                    logger.info(`Caminho em cache está desatualizado, detectando novamente: ${cachedPath}`);
                    await context.globalState.update(`${fileType}Path`, undefined);
                }
            }

            if (!context.globalState.get(`${fileType}Path`)) {
                const found = await SyncController.findConfigFile(fileType, logger);
                if (found) {
                    context.globalState.update(`${fileType}Path`, found);
                    logger.info(`${fileType}.json encontrado: ${found}`);
                } else {
                    logger.error(
                        `Não foi possível encontrar ${fileType}.json: abrindo o seletor de arquivos`,
                        "SyncController.initialize",
                        true
                    );
                    try {
                        const manualPath = await SyncController.setManualPath(fileType);
                        context.globalState.update(`${fileType}Path`, manualPath);
                    } catch {
                        logger.error(
                            `${fileType}.json é obrigatório. Reative a extensão.`,
                            "SyncController.initialize",
                            true
                        );
                        return undefined;
                    }
                }
            }
        }

        // Valida: settingsPath e keybindingsPath não podem apontar para o mesmo arquivo
        const settingsPath = context.globalState.get<string>("settingsPath");
        const keybindingsPath = context.globalState.get<string>("keybindingsPath");
        if (settingsPath && keybindingsPath && settingsPath === keybindingsPath) {
            logger.warn(`Os caminhos de configurações e atalhos são idênticos: ${settingsPath} - detectando os atalhos novamente`);
            await context.globalState.update("keybindingsPath", undefined);
            const found = await SyncController.findConfigFile("keybindings", logger);
            if (found) {
                await context.globalState.update("keybindingsPath", found);
                logger.info(`keybindings.json detectado novamente: ${found}`);
            } else {
                logger.error(
                    "Não foi possível encontrar keybindings.json: abrindo o seletor de arquivos",
                    "SyncController.initialize",
                    true
                );
                try {
                    const manualPath = await SyncController.setManualPath("keybindings");
                    await context.globalState.update("keybindingsPath", manualPath);
                } catch {
                    logger.error(
                        "keybindings.json é obrigatório. Reative a extensão.",
                        "SyncController.initialize",
                        true
                    );
                    return undefined;
                }
            }
        }

        return new SyncController(logger, context);
    }

    /** Verifica se o caminho em cache continua válido (arquivo existe e está na pasta correta do Antigravity IDE) */
    private static async isPathStale(cachedPath: string, logger: Logger): Promise<boolean> {
        // Detecta um caminho da pasta legada "Antigravity" (não "Antigravity IDE")
        const normalizedPath = cachedPath.replace(/\\/g, "/");
        if (/\/Antigravity\/User\//i.test(normalizedPath) && !/\/Antigravity IDE\/User\//i.test(normalizedPath)) {
            logger.info(`O caminho pertence ao Antigravity legado (não ao Antigravity IDE): ${cachedPath}`);
            return true;
        }

        // Detecta caminhos de outra plataforma (por exemplo, um caminho do Windows em cache no Linux)
        const currentPlatform = os.platform();
        if (currentPlatform !== "win32" && /^[A-Z]:\\/i.test(cachedPath)) {
            logger.info(`Caminho do Windows detectado em ${currentPlatform}: ${cachedPath}`);
            return true;
        }
        if (currentPlatform === "win32" && cachedPath.startsWith("/")) {
            logger.info(`Caminho Unix detectado no Windows: ${cachedPath}`);
            return true;
        }

        // Verifica se o arquivo existe
        try {
            await workspace.fs.stat(Uri.file(cachedPath));
            return false;
        } catch {
            logger.info(`O arquivo em cache não existe mais: ${cachedPath}`);
            return true;
        }
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

    /** Trả về danh sách các đường dẫn cấu hình khả dĩ cho tệp hoặc thư mục tương đối */
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

    /** Abre a caixa de diálogo para seleção manual do arquivo de configuração */
    public static async setManualPath(
        t: "keybindings" | "settings",
        title?: string
    ): Promise<string> {
        const manualPath = (await window.showOpenDialog({
            canSelectFiles: true,
            canSelectFolders: false,
            canSelectMany: false,
            filters: { "Arquivos JSON": ["json"] },
            title: title || `Selecionar o arquivo ${t}.json`,
        }))!;
        return manualPath[0].fsPath;
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
                    data.extensions = this.getExtensions();
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
    ) {
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
            if (Object.prototype.hasOwnProperty.call(validated.data, "layout")) {
                await this.restoreLayoutProfile(validated.data.layout, workspaceLayoutId);
            }
        } catch (error) {
            await this.rollbackProfileFileChanges(applied);
            if (backupPath) {
                this.logger.warn(`Restauração revertida. Backup local preservado em: ${backupPath}`);
            }
            throw error;
        }

        if (backupPath) {
            this.logger.info(`Perfil restaurado. Backup local criado em: ${backupPath}`);
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
        let filePath: string;
        try {
            filePath = this.context.globalState.get(`${t}Path`)!;
        } catch {
            this.logger.error(`O caminho de ${t} não foi definido`, "SyncController.readConfigRaw", true);
            return undefined;
        }
        try {
            const buffer = await readFile(filePath);
            return buffer.toString("base64");
        } catch (error) {
            this.logger.error(`Falha ao ler o arquivo de ${t}: ${filePath}`, "SyncController.readConfigRaw", true, error);
            return undefined;
        }
    }

    /** Prepara todas as alterações de arquivos antes de escrever a primeira delas. */
    private async prepareProfileFileChanges(profile: IProfile, syncItems: ISyncItem[]): Promise<IProfileFileChange[]> {
        const changes: IProfileFileChange[] = [];
        const enabledKeys = new Set(syncItems.filter((item) => item.enabled).map((item) => item.key));
        if (enabledKeys.has("settings") && Object.prototype.hasOwnProperty.call(profile.data, "settings")) {
            const settingsPath = this.context.globalState.get<string>("settingsPath");
            if (!settingsPath) {
                throw new Error("Caminho de configurações não definido");
            }
            changes.push(await this.createProfileFileChange(
                "settings.json",
                settingsPath,
                Buffer.from(profile.data.settings, "base64")
            ));
        }
        if (enabledKeys.has("keybindings") && Object.prototype.hasOwnProperty.call(profile.data, "keybindings")) {
            const keybindingsPath = this.context.globalState.get<string>("keybindingsPath");
            if (!keybindingsPath) {
                throw new Error("Caminho de atalhos não definido");
            }
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
    private getExtensions(): string[] {
        const excludeList =
            workspace
                .getConfiguration("antigravitysync")
                .get<string[]>("excludeExtensions") || [];
        return extensions.all
            .filter((ext: Extension<any>) => !ext.packageJSON.isBuiltin)
            .map((ext: Extension<any>) => ext.id)
            .filter((id) => !excludeList.includes(id));
    }

    // ===== Layout helpers =====

    /** Lê o layout global e preserva os workspaces já associados ao perfil. */
    private async readLayoutProfile(existingLayout?: unknown): Promise<ILayoutProfile> {
        const userDataPath = this.getUserDataPath();
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

    /** Restaura o layout em bancos separados, com cópias de segurança e rollback local. */
    private async restoreLayoutProfile(layout: unknown, workspaceLayoutId?: string): Promise<void> {
        const profile = this.parseLayoutProfile(layout);
        const userDataPath = this.getUserDataPath();
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
        const applied: typeof changes = [];
        try {
            for (const change of changes) {
                await this.replaceDatabaseAtomically(change.databasePath, change.updated);
                applied.push(change);
            }
            this.logger.info(`Layout restaurado. Backup criado em: ${backupPath}`, true);
        } catch (error) {
            for (const change of applied.reverse()) {
                try {
                    await this.replaceDatabaseAtomically(change.databasePath, change.original);
                } catch (rollbackError) {
                    this.logger.error(
                        `Falha ao reverter o layout: ${change.name}`,
                        "SyncController.restoreLayoutProfile",
                        false,
                        rollbackError
                    );
                }
            }
            throw error;
        }
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
        const userDataPath = this.getUserDataPath();
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
        const applied: ILayoutChange[] = [];
        try {
            for (const change of changes) {
                await this.replaceDatabaseAtomically(change.databasePath, change.updated);
                applied.push(change);
            }
        } catch (error) {
            for (const change of applied.reverse()) {
                await this.replaceDatabaseAtomically(change.databasePath, change.original).catch(() => undefined);
            }
            throw error;
        }

        this.logger.info(
            `Backup de layout restaurado: ${backup.id}. Snapshot de segurança: ${rollbackBackupPath}`,
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

    /** Obtém a pasta User do Antigravity sem confiar em caminhos fixos de plataforma. */
    private getUserDataPath(): string {
        const settingsPath = this.context.globalState.get<string>("settingsPath");
        if (!settingsPath || path.basename(settingsPath) !== "settings.json") {
            throw new Error("Não foi possível determinar a pasta de dados do Antigravity");
        }
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

    /** Substitui um banco somente após gravar uma cópia temporária completa. */
    private async replaceDatabaseAtomically(databasePath: string, content: Uint8Array): Promise<void> {
        await this.replaceFileAtomically(databasePath, Buffer.from(content));
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
    public getExtensionDiff(remoteList: string[]): { toInstall: string[]; toDelete: string[] } {
        const localList = this.getExtensions();
        const localSet = new Set(localList);
        const safeRemoteList = remoteList.filter((id) => this.isValidExtensionId(id));
        const remoteSet = new Set(safeRemoteList);

        return {
            toInstall: safeRemoteList.filter((id) => !localSet.has(id)),
            toDelete: localList.filter((id) => !remoteSet.has(id)),
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

    /** Valida o formato publisher.name antes de acionar comandos de extensão. */
    private isValidExtensionId(id: string): boolean {
        return /^[a-z0-9][a-z0-9-]*\.[a-z0-9][a-z0-9-]*$/i.test(id);
    }
}
