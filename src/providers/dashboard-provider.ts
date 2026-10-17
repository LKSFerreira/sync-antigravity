// DashboardProvider: gerencia o painel completo da Webview
// Cria uma aba do editor contendo a interface do painel do Sync Antigravity

import * as vscode from "vscode";
import GoogleAuth from "../core/google-auth";
import GoogleDriveService, { ProgressCallback } from "../core/google-drive";
import { IProfile, ISyncItem } from "../models/interfaces";
import SyncController from "../core/sync-controller";
import Logger from "../core/logger";
import { criarItensDeSincronizacaoPadrao } from "../localizacao/itens-sincronizacao";
import { catalogo, localizarErro } from "../localizacao/catalogo";
import { criarLocalizacaoDaWebview } from "../localizacao/textos-webview";
import { serializarParaScriptInline } from "../localizacao/serializacao-webview";

/** Estado do painel enviado à Webview */
interface DashboardState {
    isAuthenticated: boolean;
    profiles: Array<{ name: string; fileName: string; modifiedTime?: string; syncKeys?: string[] }> | null;
    syncItems: ISyncItem[];
}

/** Mensagem da Webview para a extensão */
interface WebviewMessage {
    command: string;
    name?: string;
    fileName?: string;
    folderId?: string;
    folderName?: string;
    fileId?: string;
    pageToken?: string;
    toInstall?: string[];
    toDelete?: string[];
    syncKeys?: string[];  // Chaves de sincronização selecionadas na interface
    restoreId?: string;
    workspaceLayoutId?: string;
    layoutWillApplyAfterExit?: boolean;
}

interface PendingProfileRestore {
    profile: IProfile;
    profileName: string;
    syncItems: ISyncItem[];
}

export default class DashboardProvider {
    private readonly localizacao = criarLocalizacaoDaWebview();
    private readonly itensDeSincronizacao = criarItensDeSincronizacaoPadrao();
    private panel: vscode.WebviewPanel | undefined;
    private readonly extensionUri: vscode.Uri;
    private readonly auth: GoogleAuth;
    private readonly drive: GoogleDriveService;
    private readonly controller: SyncController;
    private readonly logger: Logger;
    private readonly context: vscode.ExtensionContext;
    private readonly onAuthenticationChanged: () => Promise<void>;
    private readonly pendingProfileRestores = new Map<string, PendingProfileRestore>();
    private profileRestoreSequence = 0;

    constructor(
        context: vscode.ExtensionContext,
        auth: GoogleAuth,
        drive: GoogleDriveService,
        controller: SyncController,
        logger: Logger,
        onAuthenticationChanged: () => Promise<void> = async () => undefined
    ) {
        this.context = context;
        this.extensionUri = context.extensionUri;
        this.auth = auth;
        this.drive = drive;
        this.controller = controller;
        this.logger = logger;
        this.onAuthenticationChanged = onAuthenticationChanged;
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
            "Sync Antigravity",
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [
                    vscode.Uri.joinPath(this.extensionUri, "dist", "webview"),
                    vscode.Uri.joinPath(this.extensionUri, "images"),
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

            // Fase 1: envia o estado imediatamente com profiles: null (carregando)
            const state: DashboardState = { isAuthenticated, profiles: null, syncItems: this.itensDeSincronizacao };
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
                        catalogo.painel.falhaCarregarPerfis(),
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
                catalogo.painel.falhaAtualizarEstado(),
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
                        await this.onAuthenticationChanged();
                        sendToast("success", catalogo.painel.sessaoIniciada());
                    } catch (loginErr: any) {
                        this.logger.error(
                            catalogo.painel.falhaIniciarSessaoComMotivo(localizarErro(loginErr)),
                            "DashboardProvider.handleMessage",
                            false,
                            loginErr
                        );
                        sendToast("error", localizarErro(loginErr, catalogo.painel.falhaIniciarSessao()));
                    }
                    await this.refreshState();
                    sendLoading("login", false);
                    break;

                case "logout":
                    await this.auth.logout();
                    await this.onAuthenticationChanged();
                    await this.refreshState();
                    sendToast("info", catalogo.painel.sessaoEncerrada());
                    break;

                case "createProfile": {
                    if (!message.name) { return; }
                    const syncItems = this.itensDeSincronizacao.map(item => ({
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
                    sendToast("success", catalogo.painel.perfilCriado(message.name));
                    break;
                }

                case "pullProfile": {
                    if (!message.fileName) { return; }
                    const profileName = message.fileName;
                    const syncItems = this.itensDeSincronizacao.map(item => ({
                        ...item,
                        enabled: message.syncKeys ? message.syncKeys.includes(item.key) : item.enabled,
                    }));
                    sendLoading(`pull-${profileName}`, true);
                    this.panel?.webview.postMessage({ type: "syncStart", title: catalogo.painel.preparandoPerfil(profileName) });
                    const profile = await this.drive.getProfile(profileName, syncItems, sendProgress);
                    if (!profile) {
                        this.panel?.webview.postMessage({ type: "syncDone" });
                        sendToast("error", catalogo.painel.perfilVazio());
                        sendLoading(`pull-${profileName}`, false);
                        return;
                    }
                    const validated = this.controller.validateIncomingProfile(profile, syncItems);
                    if (Array.isArray(validated.profile.data.extensions)) {
                        const extensionDiff = await this.controller.getExtensionDiff(
                            validated.profile.data.extensions,
                            validated.profile.data.extensionDisplayNames
                        );
                        const displayNames = validated.profile.data.extensionDisplayNames || {};
                        const profileExtensions = validated.profile.data.extensions.map((extensionId: string) => ({
                            id: extensionId,
                            displayName: displayNames[extensionId] || extensionId,
                        }));
                        validated.preview.extensions = {
                            ...extensionDiff,
                            profileExtensions,
                        };
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
                        throw new Error(catalogo.painel.previaExpirada());
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
                    sendToast("info", catalogo.painel.aplicacaoCancelada());
                    break;

                case "applyExtensionSync": {
                    const { toInstall, toDelete } = message;
                    sendLoading("extensionSync", true);
                    const needsReload = await this.controller.applyExtensionSync(toInstall || [], toDelete || []);
                    sendLoading("extensionSync", false);
                    sendToast("success", catalogo.painel.extensoesSincronizadas());
                    if (needsReload || message.layoutWillApplyAfterExit) {
                        this.panel?.webview.postMessage({
                            type: "askRestart",
                            layoutWillApplyAfterExit: Boolean(message.layoutWillApplyAfterExit),
                        });
                    }
                    break;
                }

                case "updateProfile": {
                    if (!message.fileName) { return; }
                    const profileName = message.fileName;
                    const syncItems = this.itensDeSincronizacao.map(item => ({
                        ...item,
                        enabled: message.syncKeys ? message.syncKeys.includes(item.key) : item.enabled,
                    }));
                    sendLoading(`push-${profileName}`, true);
                    this.panel?.webview.postMessage({ type: "syncStart", title: catalogo.painel.enviandoPerfil(profileName) });
                    const layoutItem = this.itensDeSincronizacao.find((item) => item.key === "layout");
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
                    sendToast("success", catalogo.painel.perfilAtualizado(profileName));
                    break;
                }

                case "deleteProfile": {
                    if (!message.fileName) { return; }
                    const profileName = message.fileName;
                    sendLoading(`delete-${profileName}`, true);
                    await this.drive.deleteProfile(profileName);
                    await this.refreshState();
                    sendLoading(`delete-${profileName}`, false);
                    sendToast("success", catalogo.painel.perfilExcluido(profileName));
                    break;
                }

                case "showLogs":
                    this.logger.show();
                    break;

                case "reloadWindow":
                    await vscode.commands.executeCommand("workbench.action.reloadWindow");
                    break;

                case "requestRestart":
                    this.panel?.webview.postMessage({
                        type: "askRestart",
                        layoutWillApplyAfterExit: Boolean(message.layoutWillApplyAfterExit),
                    });
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
                            folderName: message.folderName || this.localizacao.textos.pagina.raiz,
                        });
                    } catch (err: any) {
                        sendToast("error", localizarErro(err, catalogo.painel.falhaListarDados()));
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
                            fileName: message.fileName || catalogo.painel.arquivo(),
                        });
                    } catch (err: any) {
                        sendToast("error", localizarErro(err, catalogo.painel.falhaVisualizarArquivo()));
                    }
                    sendLoading("previewFile", false);
                    break;
                }
            }
        } catch (error: any) {
            this.logger.error(
                catalogo.painel.falhaAcao(localizarErro(error)),
                "DashboardProvider.handleMessage",
                true,
                error
            );
            // Fecha o modal de sincronização se estiver aberto (permite dispensar em caso de erro)
            this.panel?.webview.postMessage({ type: "syncDone" });
            sendLoading(message.command, false);
            sendToast("error", localizarErro(error));
        }
    }

    /** Aplica o perfil confirmado e continua o fluxo de extensões e reinicialização. */
    private async completeProfilePull(
        profile: IProfile,
        profileName: string,
        syncItems: ISyncItem[],
        workspaceLayoutId: string | undefined,
        sendToast: (level: "info" | "success" | "error", text: string) => void
    ): Promise<void> {
        const validatedProfile = this.controller.validateIncomingProfile(profile, syncItems).profile;
        const result = await this.controller.updateLocalProfile(validatedProfile, syncItems, workspaceLayoutId);
        const extEnabled = syncItems.find((item) => item.key === "extensions")?.enabled;
        const extData = validatedProfile.data.extensions;
        if (extEnabled && extData && Array.isArray(extData)) {
            const diff = await this.controller.getExtensionDiff(
                extData,
                validatedProfile.data.extensionDisplayNames
            );
            if (diff.toInstall.length > 0 || diff.toDelete.length > 0) {
                this.panel?.webview.postMessage({
                    type: "askExtensionSync",
                    toInstall: diff.toInstall,
                    toDelete: diff.toDelete,
                    layoutWillApplyAfterExit: result.layoutWillApplyAfterExit,
                });
                return;
            }
        }

        sendToast("success", catalogo.painel.perfilAplicado(profileName));
        this.panel?.webview.postMessage({
            type: "askRestart",
            layoutWillApplyAfterExit: result.layoutWillApplyAfterExit,
        });
    }

    /** Gera o conteúdo HTML da Webview */
    private getHtmlContent(webview: vscode.Webview): string {
        const cssUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this.extensionUri, "dist", "webview", "dashboard.css")
        );
        const jsUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this.extensionUri, "dist", "webview", "dashboard.js")
        );
        const localizacaoJsUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this.extensionUri, "dist", "webview", "localizacao.js")
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
        const logoUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this.extensionUri, "images", "icon.png")
        );

        const nonce = getNonce();
        const localizacao = this.localizacao;
        const textos = localizacao.textos;
        const localizacaoSerializada = serializarParaScriptInline(localizacao);

        return /* html */ `<!DOCTYPE html>
<html lang="${localizacao.idiomaHtml}">
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
    <title>${escaparHtml(textos.pagina.titulo)}</title>
</head>
<body>
    <!-- Cabeçalho -->
    <header class="header">
        <div class="header-left">
            <span class="codicon codicon-sync header-icon"></span>
            <h1 class="header-title">${escaparHtml(textos.pagina.titulo)}</h1>
        </div>
        <div class="header-right" id="header-user"></div>
    </header>

    <!-- Conteúdo principal -->
    <main class="main">
        <!-- Sem sessão iniciada -->
        <div id="login-section" class="section login-section" style="display:none;">
            <div class="login-card">
                <img class="login-logo" src="${logoUri}" alt="${escaparHtml(textos.pagina.logoAlt)}" />
                <h2>${escaparHtml(textos.pagina.boasVindas)}</h2>
                <p class="login-desc">${escaparHtml(textos.pagina.descricao)}</p>
                <button class="btn btn-primary btn-lg" id="btn-login">
                    <span class="codicon codicon-sign-in"></span>
                    ${escaparHtml(textos.pagina.iniciarSessaoGoogle)}
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
                        <span>${escaparHtml(textos.pagina.conta)}</span>
                    </div>
                    <div class="card-body">
                        <div class="account-info">
                            <span class="status-dot status-online"></span>
                            <span id="account-email" class="account-email">--</span>
                        </div>
                        <button class="btn btn-secondary btn-sm" id="btn-logout">
                            <span class="codicon codicon-sign-out"></span>
                            ${escaparHtml(textos.pagina.encerrarSessao)}
                        </button>
                    </div>
                </div>

                <div class="card">
                    <div class="card-header">
                        <span class="codicon codicon-tools"></span>
                        <span>${escaparHtml(textos.pagina.acoesRapidas)}</span>
                    </div>
                    <div class="card-body actions-grid">
                        <button class="btn btn-accent" id="btn-create-profile">
                            <span class="codicon codicon-add"></span>
                            ${escaparHtml(textos.pagina.criarPerfil)}
                        </button>
                        <button class="btn btn-secondary" id="btn-show-logs">
                            <span class="codicon codicon-output"></span>
                            ${escaparHtml(textos.pagina.verRegistros)}
                        </button>
                    </div>
                </div>
            </div>

            <!-- Seção de perfis -->
            <div class="card profiles-card">
                <div class="card-header">
                    <div class="card-header-left">
                        <span class="codicon codicon-cloud"></span>
                        <span>${escaparHtml(textos.pagina.perfisGoogleDrive)}</span>
                        <span class="badge" id="profile-count">0</span>
                    </div>
                    <button class="btn-icon" id="btn-refresh" title="${escaparHtml(textos.pagina.atualizar)}" aria-label="${escaparHtml(textos.pagina.atualizar)}">
                        <span class="codicon codicon-refresh"></span>
                    </button>
                </div>
                <div class="card-body">
                    <div id="profiles-empty" class="empty-state" style="display:none;">
                        <span class="codicon codicon-cloud-upload empty-icon"></span>
                        <p>${escaparHtml(textos.pagina.nenhumPerfil)}</p>
                        <p class="empty-hint">${escaparHtml(textos.pagina.primeiroPerfil)}</p>
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
                        <span>${escaparHtml(textos.pagina.explorador)}</span>
                    </div>
                    <div class="appdata-header-actions">
                        <button class="btn-icon" id="btn-back-appdata" title="${escaparHtml(textos.comum.voltar)}" aria-label="${escaparHtml(textos.comum.voltar)}" style="display:none;">
                            <span class="codicon codicon-arrow-left"></span>
                        </button>
                        <button class="btn-icon" id="btn-refresh-appdata" title="${escaparHtml(textos.pagina.atualizar)}" aria-label="${escaparHtml(textos.pagina.atualizar)}">
                            <span class="codicon codicon-refresh"></span>
                        </button>
                    </div>
                </div>
                <div class="card-body">
                    <div class="breadcrumb" id="appdata-breadcrumb">
                        <span class="breadcrumb-item active">${escaparHtml(textos.pagina.raiz)}</span>
                    </div>
                    <div id="appdata-empty" class="empty-state" style="display:none;">
                        <span class="codicon codicon-folder empty-icon"></span>
                        <p>${escaparHtml(textos.pagina.pastaVazia)}</p>
                    </div>
                    <div id="appdata-table-wrapper" class="appdata-table-wrapper">
                        <table class="appdata-table" id="appdata-table">
                            <thead>
                                <tr>
                                    <th>${escaparHtml(textos.pagina.colunaNome)}</th>
                                    <th>${escaparHtml(textos.pagina.colunaTipo)}</th>
                                    <th>${escaparHtml(textos.pagina.colunaTamanho)}</th>
                                    <th>${escaparHtml(textos.pagina.colunaModificado)}</th>
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

    <script nonce="${nonce}">globalThis.__SYNC_ANTIGRAVITY_L10N__ = ${localizacaoSerializada};</script>
    <script nonce="${nonce}" src="${localizacaoJsUri}"></script>
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

/** Escapa textos localizados antes de interpolá-los no HTML estático. */
function escaparHtml(valor: string): string {
    return valor
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}
