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
    ILayoutProfile,
    isAllowedGlobalLayoutKey,
    isAllowedWorkspaceLayoutEntry,
} from "../models/layout-profile";
import {
    applyLayoutEntries,
    readGlobalLayoutEntries,
    readWorkspaceLayoutEntries,
} from "./layout-state-database";
import Logger from "./logger";

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
    public async getActiveProfile(syncItems: ISyncItem[]): Promise<IProfile> {
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
                    data.layout = await this.readLayoutProfile();
                    break;
                default:
                    break;
            }
        }

        return { profileName: "", data };
    }

    /** Escreve a configuração com base nos itens habilitados (as extensões são tratadas separadamente pelo provedor) */
    public async updateLocalProfile(profile: IProfile, syncItems: ISyncItem[]) {
        for (const item of syncItems.filter(i => i.enabled)) {
            switch (item.key) {
                case "settings": {
                    const settingsPath: string = this.context.globalState.get("settingsPath")!;
                    if (profile.data.settings) {
                        await this.writeConfigRaw(settingsPath, profile.data.settings);
                    }
                    break;
                }
                case "keybindings": {
                    const keybindingsPath: string = this.context.globalState.get("keybindingsPath")!;
                    if (profile.data.keybindings) {
                        await this.writeConfigRaw(keybindingsPath, profile.data.keybindings);
                    }
                    break;
                }
                case "snippets": {
                    if (profile.data.snippets) {
                        await this.writeSnippets(profile.data.snippets);
                    }
                    break;
                }
                case "layout": {
                    if (profile.data.layout) {
                        await this.restoreLayoutProfile(profile.data.layout);
                    }
                    break;
                }
                // As extensões são tratadas pelo provedor (via getExtensionDiff + applyExtensionSync)
                default:
                    break;
            }
        }
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

    /** Grava o arquivo de configuração codificado em base64 no disco */
    private async writeConfigRaw(filePath: string, base64Content: string): Promise<void> {
        try {
            await workspace.fs.writeFile(
                Uri.file(filePath),
                Buffer.from(base64Content, "base64")
            );
            this.logger.info(`Arquivo de configuração atualizado: ${filePath}`);
        } catch (error) {
            this.logger.error(`Falha ao gravar o arquivo de configuração: ${filePath}`, "SyncController.writeConfigRaw", true, error);
            throw error;
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

    /** Lê o layout global e, quando houver, o layout do workspace aberto. */
    private async readLayoutProfile(): Promise<ILayoutProfile> {
        const userDataPath = this.getUserDataPath();
        const globalEntries = await readGlobalLayoutEntries(
            path.join(userDataPath, "globalStorage", "state.vscdb")
        );
        const global = createGlobalLayoutDocument(globalEntries);
        const workspace = await this.findActiveWorkspaceStorage(userDataPath);

        if (!workspace) {
            return createLayoutProfile(global);
        }

        const entries = await readWorkspaceLayoutEntries(workspace.databasePath);
        return createLayoutProfile(
            global,
            createWorkspaceLayout(workspace.id, workspace.label, entries)
        );
    }

    /** Restaura o layout em bancos separados, com cópias de segurança e rollback local. */
    private async restoreLayoutProfile(layout: unknown): Promise<void> {
        const profile = this.parseLayoutProfile(layout);
        const userDataPath = this.getUserDataPath();
        const changes: Array<{
            name: string;
            databasePath: string;
            original: Buffer;
            updated: Uint8Array;
        }> = [];
        const globalDatabasePath = path.join(userDataPath, "globalStorage", "state.vscdb");

        changes.push({
            name: "global-state.vscdb",
            databasePath: globalDatabasePath,
            original: await readFile(globalDatabasePath),
            updated: await applyLayoutEntries(
                globalDatabasePath,
                profile.global.entries,
                (entry) => isAllowedGlobalLayoutKey(entry.key)
            ),
        });

        if (profile.workspace) {
            const workspace = await this.findActiveWorkspaceStorage(userDataPath);
            if (!workspace) {
                throw new Error("Abra o workspace de destino antes de restaurar o layout dele");
            }

            changes.push({
                name: `workspace-${workspace.id}.vscdb`,
                databasePath: workspace.databasePath,
                original: await readFile(workspace.databasePath),
                updated: await applyLayoutEntries(
                    workspace.databasePath,
                    profile.workspace.entries,
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
    private async createLayoutBackup(changes: Array<{ name: string; original: Buffer }>): Promise<string> {
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const backupPath = path.join(this.context.globalStorageUri.fsPath, "layout-backups", timestamp);
        await mkdir(backupPath, { recursive: true });
        for (const change of changes) {
            await writeFile(path.join(backupPath, change.name), change.original, { flag: "wx" });
        }
        return backupPath;
    }

    /** Substitui um banco somente após gravar uma cópia temporária completa. */
    private async replaceDatabaseAtomically(databasePath: string, content: Uint8Array): Promise<void> {
        const temporaryPath = `${databasePath}.antigravity-sync.tmp`;
        try {
            await writeFile(temporaryPath, Buffer.from(content), { flag: "wx" });
            await rename(temporaryPath, databasePath);
        } catch (error) {
            await unlink(temporaryPath).catch(() => undefined);
            throw error;
        }
    }

    /** Revalida dados recebidos do Drive antes de alterar o estado local. */
    private parseLayoutProfile(data: unknown): ILayoutProfile {
        if (!data || typeof data !== "object") {
            throw new Error("Dados de layout inválidos");
        }

        const candidate = data as Partial<ILayoutProfile>;
        if (candidate.schemaVersion !== 1 || !candidate.global) {
            throw new Error("Versão de layout incompatível");
        }

        return createLayoutProfile(candidate.global, candidate.workspace);
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

    /** Grava os snippets agrupados de volta em arquivos individuais */
    private async writeSnippets(bundle: Record<string, string>): Promise<void> {
        let dir = await SyncController.findConfigDir("snippets", this.logger);
        if (!dir) {
            // Alternativa: cria no primeiro caminho candidato
            dir = SyncController.getConfigPaths("snippets")[0];
        }
        await mkdir(dir, { recursive: true });
        for (const [fileName, base64Content] of Object.entries(bundle)) {
            if (!this.isSafeSnippetFileName(fileName)) {
                this.logger.warn(`Nome de snippet ignorado por segurança: ${fileName}`);
                continue;
            }
            const filePath = path.resolve(dir, fileName);
            if (!filePath.startsWith(`${path.resolve(dir)}${path.sep}`)) {
                this.logger.warn(`Caminho de snippet bloqueado por segurança: ${fileName}`);
                continue;
            }
            await writeFile(filePath, Buffer.from(base64Content, "base64"));
        }
        this.logger.info(`Snippets sincronizados: ${Object.keys(bundle).length} arquivo(s)`);
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

    /** Aceita apenas nomes de arquivo simples que o leitor de snippets também captura. */
    private isSafeSnippetFileName(fileName: string): boolean {
        return (
            typeof fileName === "string" &&
            !fileName.includes("/") &&
            !fileName.includes("\\") &&
            !fileName.includes("..") &&
            (fileName.endsWith(".json") || fileName.endsWith(".code-snippets"))
        );
    }

    /** Valida o formato publisher.name antes de acionar comandos de extensão. */
    private isValidExtensionId(id: string): boolean {
        return /^[a-z0-9][a-z0-9-]*\.[a-z0-9][a-z0-9-]*$/i.test(id);
    }
}
