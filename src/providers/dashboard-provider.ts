// DashboardProvider: gerencia o painel completo da Webview
// Cria uma aba do editor contendo a interface do painel do Antigravity Sync

import * as vscode from "vscode";
import GoogleAuth from "../core/google-auth";
import GoogleDriveService, { ProgressCallback } from "../core/google-drive";
import { DEFAULT_SYNC_ITEMS, IProfile, ISyncItem } from "../models/interfaces";
import SyncController from "../core/sync-controller";
import Logger from "../core/logger";

/** Estado do painel enviado à Webview */
interface DashboardState {
    isAuthenticated: boolean;
    email?: string;
    picture?: string;
    profiles: Array<{ name: string; fileName: string; modifiedTime?: string; syncKeys?: string[] }> | null;
    syncItems: ISyncItem[];
}

/** Mensagem da Webview para a extensão */
interface WebviewMessage {
    command: string;
    name?: string;
    fileName?: string;
    type?: "settings" | "keybindings";
    folderId?: string;
    folderName?: string;
    fileId?: string;
    pageToken?: string;
    toInstall?: string[];
    toDelete?: string[];
    syncKeys?: string[];  // Chaves de sincronização selecionadas na interface
    restoreId?: string;
    workspaceLayoutId?: string;
}

interface PendingProfileRestore {
    profile: IProfile;
    profileName: string;
    syncItems: ISyncItem[];
}

export default class DashboardProvider {
    private panel: vscode.WebviewPanel | undefined;
    private readonly extensionUri: vscode.Uri;
    private readonly auth: GoogleAuth;
    private readonly drive: GoogleDriveService;
    private readonly controller: SyncController;
    private readonly logger: Logger;
    private readonly context: vscode.ExtensionContext;
    private readonly pendingProfileRestores = new Map<string, PendingProfileRestore>();
    private profileRestoreSequence = 0;

    constructor(
        context: vscode.ExtensionContext,
        auth: GoogleAuth,
        drive: GoogleDriveService,
        controller: SyncController,
        logger: Logger
    ) {
        this.context = context;
        this.extensionUri = context.extensionUri;
        this.auth = auth;
        this.drive = drive;
        this.controller = controller;
        this.logger = logger;
    }

    /** Abre ou foca o painel */
    public show() {
        if (this.panel) {
            this.panel.reveal(vscode.ViewColumn.One);
            this.refreshState();
            return;
        }

        this.panel = vscode.window.createWebviewPanel(
            "antigravitysync.dashboard",
            "Antigravity Sync",
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [
                    vscode.Uri.joinPath(this.extensionUri, "dist", "webview"),
                ],
            }
        );

        this.panel.iconPath = vscode.Uri.joinPath(
            this.extensionUri,
            "images",
            "icon.png"
        );

        this.panel.webview.html = this.getHtmlContent(this.panel.webview);

        // Trata mensagens da Webview
        this.panel.webview.onDidReceiveMessage(
            (message: WebviewMessage) => this.handleMessage(message),
            undefined,
            this.context.subscriptions
        );

        // Limpa recursos quando o painel é fechado
        this.panel.onDidDispose(
            () => {
                this.panel = undefined;
            },
            undefined,
            this.context.subscriptions
        );

        // Envia o estado inicial quando a Webview estiver pronta
        this.refreshState();
    }

    /** Envia o estado atualizado à Webview */
    public async refreshState() {
        if (!this.panel) { return; }

        try {
            const isAuthenticated = await this.auth.isAuthenticated();
            let email: string | undefined;
            let picture: string | undefined;

            if (isAuthenticated) {
                try {
                    const info = await this.auth.getAccountInfo();
                    email = info?.email;
                    picture = info?.picture;
                } catch (error) {
                    this.logger.error(
                        "Falha ao buscar as informações da conta",
                        "DashboardProvider.refreshState",
                        false,
                        error
                    );
                }
            }

            // Fase 1: envia o estado imediatamente com profiles: null (carregando)
            const state: DashboardState = { isAuthenticated, email, picture, profiles: null, syncItems: DEFAULT_SYNC_ITEMS };
            this.panel.webview.postMessage({ type: "state", data: state });

            // Fase 2: carrega os perfis e envia a atualização
            if (isAuthenticated) {
                try {
                    const folders = await this.drive.listProfiles();
                    const profiles = folders.map((f) => ({
                        name: f.name,
                        fileName: f.name,
                        modifiedTime: f.modifiedTime,
                        syncKeys: f.syncKeys,
                    }));
                    this.panel?.webview.postMessage({ type: "profiles", data: profiles });
                } catch (error) {
                    this.logger.error(
                        "Falha ao carregar a lista de perfis",
                        "DashboardProvider.refreshState",
                        false,
                        error
                    );
                    // Envia perfis vazios em caso de erro: limpa o estado de carregamento
                    this.panel?.webview.postMessage({ type: "profiles", data: [] });
                }
            }
        } catch (error) {
            this.logger.error(
                "Falha ao atualizar o estado do painel",
                "DashboardProvider.refreshState",
                false,
                error
            );
        }
    }

    /** Trata mensagens da Webview */
    private async handleMessage(message: WebviewMessage) {
        const sendLoading = (action: string, loading: boolean) => {
            this.panel?.webview.postMessage({ type: "loading", action, loading });
        };
        const sendToast = (level: "info" | "success" | "error", text: string) => {
            this.panel?.webview.postMessage({ type: "toast", level, message: text });
        };
        const sendProgress: ProgressCallback = (step, current, total, status) => {
            this.panel?.webview.postMessage({ type: "syncProgress", step, current, total, status });
        };

        try {
            switch (message.command) {
                case "getState":
                    await this.refreshState();
                    break;

                case "login":
                    sendLoading("login", true);
                    try {
                        await this.auth.login();
                        sendToast("success", "Sessão iniciada com sucesso!");
                    } catch (loginErr: any) {
                        sendToast("error", loginErr?.message || "Falha ao iniciar sessão");
                    }
                    await this.refreshState();
                    sendLoading("login", false);
                    break;

                case "logout":
                    await this.auth.logout();
                    await this.refreshState();
                    sendToast("info", "Sessão encerrada");
                    break;

                case "createProfile": {
                    if (!message.name) { return; }
                    const syncItems = DEFAULT_SYNC_ITEMS.map(item => ({
                        ...item,
                        enabled: message.syncKeys ? message.syncKeys.includes(item.key) : item.enabled,
                    }));
                    sendLoading("createProfile", true);
                    this.panel?.webview.postMessage({ type: "syncStart", title: `Criando "${message.name}"` });
                    const current = await this.controller.getActiveProfile(syncItems);
                    current.profileName = message.name;
                    await this.drive.saveProfile(current, syncItems, sendProgress);
                    this.panel?.webview.postMessage({ type: "syncDone" });
                    await this.refreshState();
                    sendLoading("createProfile", false);
                    sendToast("success", `Perfil "${message.name}" criado`);
                    break;
                }

                case "pullProfile": {
                    if (!message.fileName) { return; }
                    const profileName = message.fileName;
                    const syncItems = DEFAULT_SYNC_ITEMS.map(item => ({
                        ...item,
                        enabled: message.syncKeys ? message.syncKeys.includes(item.key) : item.enabled,
                    }));
                    sendLoading(`pull-${profileName}`, true);
                    this.panel?.webview.postMessage({ type: "syncStart", title: `Baixando "${profileName}"` });
                    const profile = await this.drive.getProfile(profileName, syncItems, sendProgress);
                    if (!profile) {
                        this.panel?.webview.postMessage({ type: "syncDone" });
                        sendToast("error", "Os dados do perfil estão vazios");
                        sendLoading(`pull-${profileName}`, false);
                        return;
                    }
                    const validated = this.controller.validateIncomingProfile(profile, syncItems);
                    if (Array.isArray(validated.profile.data.extensions)) {
                        validated.preview.extensions = this.controller.getExtensionDiff(validated.profile.data.extensions);
                    }
                    const restoreId = String(++this.profileRestoreSequence);
                    this.pendingProfileRestores.set(restoreId, {
                        profile: validated.profile,
                        profileName,
                        syncItems,
                    });
                    this.panel?.webview.postMessage({ type: "syncDone" });
                    sendLoading(`pull-${profileName}`, false);
                    this.panel?.webview.postMessage({
                        type: "profileRestorePreview",
                        restoreId,
                        profileName,
                        preview: validated.preview,
                    });
                    break;
                }

                case "confirmProfileRestore": {
                    if (!message.restoreId) { return; }
                    const pending = this.pendingProfileRestores.get(message.restoreId);
                    if (!pending) {
                        throw new Error("A prévia do perfil expirou. Baixe o perfil novamente.");
                    }
                    this.pendingProfileRestores.delete(message.restoreId);
                    sendLoading(`pull-${pending.profileName}`, true);
                    this.panel?.webview.postMessage({ type: "syncStart", title: `Aplicando "${pending.profileName}"` });
                    await this.completeProfilePull(
                        pending.profile,
                        pending.profileName,
                        pending.syncItems,
                        message.workspaceLayoutId,
                        sendToast
                    );
                    this.panel?.webview.postMessage({ type: "syncDone" });
                    sendLoading(`pull-${pending.profileName}`, false);
                    break;
                }

                case "cancelProfileRestore":
                    if (message.restoreId) {
                        this.pendingProfileRestores.delete(message.restoreId);
                    }
                    sendToast("info", "Aplicação do perfil cancelada");
                    break;

                case "applyExtensionSync": {
                    const { toInstall, toDelete } = message;
                    sendLoading("extensionSync", true);
                    const needsReload = await this.controller.applyExtensionSync(toInstall || [], toDelete || []);
                    sendLoading("extensionSync", false);
                    sendToast("success", "Extensões sincronizadas");
                    if (needsReload) {
                        this.panel?.webview.postMessage({ type: "askReload" });
                    }
                    break;
                }

                case "updateProfile": {
                    if (!message.fileName) { return; }
                    const profileName = message.fileName;
                    const syncItems = DEFAULT_SYNC_ITEMS.map(item => ({
                        ...item,
                        enabled: message.syncKeys ? message.syncKeys.includes(item.key) : item.enabled,
                    }));
                    sendLoading(`push-${profileName}`, true);
                    this.panel?.webview.postMessage({ type: "syncStart", title: `Enviando "${profileName}"` });
                    const layoutItem = DEFAULT_SYNC_ITEMS.find((item) => item.key === "layout");
                    const layoutEnabled = syncItems.some((item) => item.key === "layout" && item.enabled);
                    const existingLayout = layoutEnabled && layoutItem
                        ? (await this.drive.getProfile(profileName, [{ ...layoutItem, enabled: true }]))?.data.layout
                        : undefined;
                    const current = await this.controller.getActiveProfile(syncItems, existingLayout);
                    current.profileName = profileName;
                    await this.drive.saveProfile(current, syncItems, sendProgress);
                    this.panel?.webview.postMessage({ type: "syncDone" });
                    await this.refreshState();
                    sendLoading(`push-${profileName}`, false);
                    sendToast("success", `Perfil "${profileName}" atualizado`);
                    break;
                }

                case "deleteProfile": {
                    if (!message.fileName) { return; }
                    const profileName = message.fileName;
                    sendLoading(`delete-${profileName}`, true);
                    await this.drive.deleteProfile(profileName);
                    await this.refreshState();
                    sendLoading(`delete-${profileName}`, false);
                    sendToast("success", `Perfil "${profileName}" excluído`);
                    break;
                }

                case "showLogs":
                    this.logger.show();
                    break;

                case "setPaths": {
                    const pathType = message.type || "settings";
                    try {
                        const filePath = await SyncController.setManualPath(pathType);
                        this.context.globalState.update(`${pathType}Path`, filePath);
                        sendToast("success", `Caminho de ${pathType} atualizado`);
                    } catch (err: any) {
                        // TypeError: a pessoa usuária cancelou a caixa de diálogo (undefined[0].fsPath)
                        if (!(err instanceof TypeError)) {
                            this.logger.error(`Falha ao definir o caminho de ${pathType}`, "setPaths", false, err);
                            sendToast("error", `Falha ao definir o caminho de ${pathType}`);
                        }
                    }
                    break;
                }

                case "reloadWindow":
                    await vscode.commands.executeCommand("workbench.action.reloadWindow");
                    break;

                case "refresh":
                    await this.refreshState();
                    break;

                case "listAppData": {
                    sendLoading("listAppData", true);
                    try {
                        const result = await this.drive.listAppDataFiles(message.folderId, message.pageToken);
                        this.panel?.webview.postMessage({
                            type: "appDataFiles",
                            files: result.files,
                            nextPageToken: result.nextPageToken || null,
                            folderId: message.folderId || null,
                            folderName: message.folderName || "Raiz",
                        });
                    } catch (err: any) {
                        sendToast("error", err?.message || "Falha ao listar os arquivos de dados do aplicativo");
                    }
                    sendLoading("listAppData", false);
                    break;
                }

                case "previewFile": {
                    if (!message.fileId) { return; }
                    sendLoading("previewFile", true);
                    try {
                        const content = await this.drive.downloadFileContent(message.fileId);
                        this.panel?.webview.postMessage({
                            type: "filePreview",
                            content,
                            fileName: message.fileName || "arquivo",
                        });
                    } catch (err: any) {
                        sendToast("error", err?.message || "Falha ao visualizar o arquivo");
                    }
                    sendLoading("previewFile", false);
                    break;
                }
            }
        } catch (error: any) {
            this.logger.error(
                `Falha na ação do painel: ${error?.message}`,
                "DashboardProvider.handleMessage",
                true,
                error
            );
            // Fecha o modal de sincronização se estiver aberto (permite dispensar em caso de erro)
            this.panel?.webview.postMessage({ type: "syncDone" });
            sendLoading(message.command, false);
            sendToast("error", error?.message || "Ocorreu um erro");
        }
    }

    /** Aplica o perfil confirmado e continua o fluxo de extensões e recarregamento. */
    private async completeProfilePull(
        profile: IProfile,
        profileName: string,
        syncItems: ISyncItem[],
        workspaceLayoutId: string | undefined,
        sendToast: (level: "info" | "success" | "error", text: string) => void
    ): Promise<void> {
        const validatedProfile = this.controller.validateIncomingProfile(profile, syncItems).profile;
        await this.controller.updateLocalProfile(validatedProfile, syncItems, workspaceLayoutId);

        const extEnabled = syncItems.find((item) => item.key === "extensions")?.enabled;
        const extData = validatedProfile.data.extensions;
        if (extEnabled && extData && Array.isArray(extData)) {
            const diff = this.controller.getExtensionDiff(extData);
            if (diff.toInstall.length > 0 || diff.toDelete.length > 0) {
                this.panel?.webview.postMessage({
                    type: "askExtensionSync",
                    toInstall: diff.toInstall,
                    toDelete: diff.toDelete,
                });
                return;
            }
        }

        sendToast("success", `Perfil "${profileName}" baixado`);
        this.panel?.webview.postMessage({ type: "askReload" });
    }

    /** Gera o conteúdo HTML da Webview */
    private getHtmlContent(webview: vscode.Webview): string {
        const cssUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this.extensionUri, "dist", "webview", "dashboard.css")
        );
        const jsUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this.extensionUri, "dist", "webview", "dashboard.js")
        );
        const codiconsUri = webview.asWebviewUri(
            vscode.Uri.joinPath(
                this.extensionUri,
                "dist",
                "webview",
                "codicons",
                "codicon.css"
            )
        );

        const nonce = getNonce();

        return /* html */ `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy"
          content="default-src 'none';
                   style-src ${webview.cspSource} 'unsafe-inline';
                   script-src 'nonce-${nonce}';
                   font-src ${webview.cspSource};
                   img-src ${webview.cspSource} https:;">
    <link href="${codiconsUri}" rel="stylesheet" />
    <link href="${cssUri}" rel="stylesheet" />
    <title>Antigravity Sync</title>
</head>
<body>
    <!-- Cabeçalho -->
    <header class="header">
        <div class="header-left">
            <span class="codicon codicon-sync header-icon"></span>
            <h1 class="header-title">Antigravity Sync</h1>
        </div>
        <div class="header-right" id="header-user"></div>
    </header>

    <!-- Conteúdo principal -->
    <main class="main">
        <!-- Sem sessão iniciada -->
        <div id="login-section" class="section login-section" style="display:none;">
            <div class="login-card">
                <span class="codicon codicon-account login-icon"></span>
                <h2>Boas-vindas ao Antigravity Sync</h2>
                <p class="login-desc">Sincronize suas configurações, extensões e atalhos entre dispositivos pelo Google Drive.</p>
                <button class="btn btn-primary btn-lg" id="btn-login">
                    <span class="codicon codicon-sign-in"></span>
                    Iniciar sessão com o Google
                </button>
            </div>
        </div>

        <!-- Painel (sessão iniciada) -->
        <div id="dashboard-section" style="display:none;">
            <!-- Linha de conta e ações rápidas -->
            <div class="grid-row">
                <div class="card">
                    <div class="card-header">
                        <span class="codicon codicon-account"></span>
                        <span>Conta</span>
                    </div>
                    <div class="card-body">
                        <div class="account-info">
                            <span class="status-dot status-online"></span>
                            <span id="account-email" class="account-email">--</span>
                        </div>
                        <button class="btn btn-secondary btn-sm" id="btn-logout">
                            <span class="codicon codicon-sign-out"></span>
                            Encerrar sessão
                        </button>
                    </div>
                </div>

                <div class="card">
                    <div class="card-header">
                        <span class="codicon codicon-tools"></span>
                        <span>Ações rápidas</span>
                    </div>
                    <div class="card-body actions-grid">
                        <button class="btn btn-accent" id="btn-create-profile">
                            <span class="codicon codicon-add"></span>
                            Criar perfil
                        </button>
                        <button class="btn btn-secondary" id="btn-set-settings-path">
                            <span class="codicon codicon-settings-gear"></span>
                            Caminho das configurações
                        </button>
                        <button class="btn btn-secondary" id="btn-set-keybindings-path">
                            <span class="codicon codicon-keyboard"></span>
                            Caminho dos atalhos
                        </button>
                        <button class="btn btn-secondary" id="btn-show-logs">
                            <span class="codicon codicon-output"></span>
                            Ver registros
                        </button>
                    </div>
                </div>
            </div>

            <!-- Seção de perfis -->
            <div class="card profiles-card">
                <div class="card-header">
                    <div class="card-header-left">
                        <span class="codicon codicon-cloud"></span>
                        <span>Perfis no Google Drive</span>
                        <span class="badge" id="profile-count">0</span>
                    </div>
                    <button class="btn-icon" id="btn-refresh" title="Atualizar">
                        <span class="codicon codicon-refresh"></span>
                    </button>
                </div>
                <div class="card-body">
                    <div id="profiles-empty" class="empty-state" style="display:none;">
                        <span class="codicon codicon-cloud-upload empty-icon"></span>
                        <p>Ainda não há perfis</p>
                        <p class="empty-hint">Crie seu primeiro perfil para começar a sincronizar.</p>
                    </div>
                    <div id="profiles-list" class="profiles-grid"></div>
                </div>
            </div>
        </div>

        <!-- Explorador de dados do aplicativo (sessão iniciada) -->
        <div id="appdata-section" style="display:none;">
            <div class="card appdata-card">
                <div class="card-header">
                    <div class="card-header-left">
                        <span class="codicon codicon-folder-opened"></span>
                        <span>Explorador de dados do aplicativo</span>
                    </div>
                    <div class="appdata-header-actions">
                        <button class="btn-icon" id="btn-back-appdata" title="Voltar" style="display:none;">
                            <span class="codicon codicon-arrow-left"></span>
                        </button>
                        <button class="btn-icon" id="btn-refresh-appdata" title="Atualizar">
                            <span class="codicon codicon-refresh"></span>
                        </button>
                    </div>
                </div>
                <div class="card-body">
                    <div class="breadcrumb" id="appdata-breadcrumb">
                        <span class="breadcrumb-item active">Raiz</span>
                    </div>
                    <div id="appdata-empty" class="empty-state" style="display:none;">
                        <span class="codicon codicon-folder empty-icon"></span>
                        <p>Esta pasta está vazia</p>
                    </div>
                    <div id="appdata-table-wrapper" class="appdata-table-wrapper">
                        <table class="appdata-table" id="appdata-table">
                            <thead>
                                <tr>
                                    <th>Nome</th>
                                    <th>Tipo</th>
                                    <th>Tamanho</th>
                                    <th>Modificado</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody id="appdata-list"></tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    </main>

    <!-- Contêiner de notificações -->
    <div id="toast-container" class="toast-container"></div>

    <script nonce="${nonce}" src="${jsUri}"></script>
</body>
</html>`;
    }

    public dispose() {
        this.panel?.dispose();
    }
}

/** Gera um nonce aleatório para a CSP */
function getNonce(): string {
    let text = "";
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (let i = 0; i < 32; i++) {
        text += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return text;
}
