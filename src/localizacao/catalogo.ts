import * as vscode from "vscode";
import { CodigoErroDaExtensao, ehErroDaExtensao } from "../core/erro-da-extensao";

function localizarCodigoDeErro(
    codigo: CodigoErroDaExtensao,
    parametros: Readonly<Record<string, string | number | boolean>>
): string {
    switch (codigo) {
        case "PERFIL_ESTRUTURA_INVALIDA":
            return vscode.l10n.t("The profile structure is invalid");
        case "PERFIL_ITEM_REMOTO_INVALIDO":
            return vscode.l10n.t("The remote {item} item is invalid", { item: String(parametros.item) });
        case "PERFIL_LAYOUT_TAMANHO_EXCEDIDO":
            return vscode.l10n.t("The remote layout exceeds the allowed size");
        case "PERFIL_ITEM_DESCONHECIDO":
            return vscode.l10n.t("Unknown synchronization item: {item}", { item: String(parametros.item) });
        case "PERFIL_SEM_ITENS_SELECIONADOS":
            return vscode.l10n.t("The profile does not contain any of the selected items");
        case "PERFIL_EXTENSOES_LISTA_INVALIDA":
            return vscode.l10n.t("The remote extension list is invalid");
        case "PERFIL_EXTENSAO_ID_INVALIDO":
            return vscode.l10n.t("A remote extension ID is invalid");
        case "PERFIL_EXTENSOES_DUPLICADAS":
            return vscode.l10n.t("The remote extension list contains duplicates");
        case "PERFIL_EXTENSAO_METADADOS_INVALIDOS":
            return vscode.l10n.t("The remote extension metadata is invalid");
        case "PERFIL_EXTENSAO_METADADOS_LIMITE_EXCEDIDO":
            return vscode.l10n.t("The remote extension metadata exceeds the allowed limit");
        case "PERFIL_EXTENSAO_NOME_INVALIDO":
            return vscode.l10n.t("A remote extension name is invalid");
        case "PERFIL_SNIPPETS_PACOTE_INVALIDO":
            return vscode.l10n.t("The remote snippet package is invalid");
        case "PERFIL_SNIPPETS_QUANTIDADE_EXCEDIDA":
            return vscode.l10n.t("The number of snippets exceeds the allowed limit");
        case "PERFIL_SNIPPET_NOME_INVALIDO":
            return vscode.l10n.t("The remote snippet file name is invalid: {arquivo}", {
                arquivo: String(parametros.arquivo),
            });
        case "PERFIL_SNIPPETS_TAMANHO_EXCEDIDO":
            return vscode.l10n.t("The remote snippet package exceeds the allowed size");
        case "LAYOUT_QUANTIDADE_ENTRADAS_INVALIDA":
            return vscode.l10n.t("The number of layout entries is invalid");
        case "LAYOUT_ENTRADA_INVALIDA":
            return vscode.l10n.t("A layout entry is invalid");
        case "LAYOUT_WORKSPACE_IDENTIFICACAO_INVALIDA":
            return vscode.l10n.t("The workspace identifier or name is invalid");
        case "LAYOUT_DOCUMENTO_INVALIDO":
            return vscode.l10n.t("The layout document is invalid");
        case "LAYOUT_QUANTIDADE_WORKSPACES_INVALIDA":
            return vscode.l10n.t("The number of workspace layouts is invalid");
        case "LAYOUT_WORKSPACE_DUPLICADO":
            return vscode.l10n.t("The workspace layout is duplicated");
        case "LAYOUT_DOCUMENTO_WORKSPACES_INVALIDO":
            return vscode.l10n.t("The workspace layout document is invalid");
        case "LAYOUT_DADOS_INVALIDOS":
            return vscode.l10n.t("The layout data is invalid");
        case "LAYOUT_VERSAO_INCOMPATIVEL":
            return vscode.l10n.t("The layout version is incompatible");
        case "AUTH_NAO_AUTENTICADO":
            return vscode.l10n.t("You are not signed in. Sign in with Google first.");
        case "AUTH_NAVEGADOR_NAO_ABRIU":
            return vscode.l10n.t("Failed to open the browser for Google sign-in. Try again.");
        case "AUTH_CLIENT_ID_AUSENTE":
            return vscode.l10n.t("GOOGLE_CLIENT_ID is not configured. Create the Sync Antigravity desktop client ID and add it to the .env file before packaging the extension.");
        case "AUTH_CLIENT_SECRET_AUSENTE":
            return vscode.l10n.t("GOOGLE_CLIENT_SECRET is not configured. Copy client_secret from the desktop OAuth client JSON to the .env file before packaging the extension.");
        case "AUTH_TEMPO_EXPIRADO":
            return vscode.l10n.t("The sign-in time limit expired. Try again.");
        case "AUTH_NEGADA":
            return vscode.l10n.t("Google sign-in was denied: {detalhes}", { detalhes: String(parametros.detalhes) });
        case "AUTH_STATE_INVALIDO":
            return vscode.l10n.t("The OAuth state does not match. A possible CSRF attack was blocked.");
        case "AUTH_CODIGO_AUSENTE":
            return vscode.l10n.t("No authorization code was received");
        case "AUTH_SERVIDOR_RETORNO_FALHOU":
            return vscode.l10n.t("Failed to start the sign-in callback server");
        case "AUTH_REFRESH_TOKEN_AUSENTE":
            return vscode.l10n.t("No refresh token is available");
        case "AUTH_RESPOSTA_EXCEDE_LIMITE":
            return vscode.l10n.t("The OAuth response exceeds the allowed size");
        case "AUTH_TROCA_TEMPO_EXPIRADO":
            return vscode.l10n.t("The Google token exchange exceeded the 30-second time limit.");
        case "AUTH_RESPOSTA_TOKEN_INVALIDA":
            return vscode.l10n.t("OAuth returned an invalid token response");
        case "AUTH_FALHA_OAUTH":
            return vscode.l10n.t("OAuth failed: {detalhes}", { detalhes: String(parametros.detalhes) });
        case "AUTH_TOKENS_INCOMPLETOS":
            return vscode.l10n.t("OAuth returned incomplete or invalid tokens");
        case "AUTH_HTTP_FALHOU":
            return vscode.l10n.t("OAuth returned HTTP {status}", { status: String(parametros.status) });
        case "AUTH_REQUISICAO_FALHOU":
            return vscode.l10n.t("The request to Google authentication failed. Try again.");
        case "DRIVE_ARQUIVO_DUPLICADO":
            return vscode.l10n.t("The profile contains duplicate copies of {arquivo}", { arquivo: String(parametros.arquivo) });
        case "DRIVE_ITEM_TAMANHO_EXCEDIDO":
            return vscode.l10n.t("The remote {item} item exceeds the allowed size", { item: String(parametros.item) });
        case "DRIVE_ITEM_JSON_INVALIDO":
            return vscode.l10n.t("The remote {item} item does not contain valid JSON", { item: String(parametros.item) });
        case "DRIVE_META_EXTENSOES_DUPLICADO":
            return vscode.l10n.t("The profile contains duplicate copies of extensions-meta.json");
        case "DRIVE_PERFIL_NAO_ENCONTRADO":
            return vscode.l10n.t("Profile \"{perfil}\" was not found", { perfil: String(parametros.perfil) });
        case "DRIVE_SYNC_META_TAMANHO_EXCEDIDO":
            return vscode.l10n.t("sync-meta.json exceeds the allowed size");
        case "DRIVE_NOME_PERFIL_INVALIDO":
            return vscode.l10n.t("The profile name is invalid");
        case "DRIVE_SYNC_META_INVALIDO":
            return vscode.l10n.t("sync-meta.json is invalid");
        case "DRIVE_SYNC_META_PERFIS_EXCEDIDOS":
            return vscode.l10n.t("sync-meta.json contains too many profiles");
        case "DRIVE_SYNC_META_ITENS_INVALIDOS":
            return vscode.l10n.t("sync-meta.json contains invalid synchronization items");
        case "DRIVE_META_PERFIL_INVALIDO":
            return vscode.l10n.t("meta.json is invalid");
        case "DRIVE_META_PERFIL_DIVERGENTE":
            return vscode.l10n.t("meta.json belongs to a different profile");
        case "DRIVE_ARQUIVO_REMOTO_TAMANHO_EXCEDIDO":
            return vscode.l10n.t("The remote file exceeds the allowed size");
        case "DRIVE_API_FALHOU":
            return vscode.l10n.t("The Google Drive API returned HTTP {status}", { status: String(parametros.status) });
        case "DRIVE_REQUISICAO_FALHOU":
            return vscode.l10n.t("The request to Google Drive failed. Try again.");
        case "SYNC_ARQUIVO_PREPARAR_FALHOU":
            return vscode.l10n.t("Failed to prepare {arquivo} in the Antigravity directory", { arquivo: String(parametros.arquivo) });
        case "SYNC_DESTINOS_CONFIGURACAO_IGUAIS":
            return vscode.l10n.t("The settings and keyboard shortcut files resolved to the same destination");
        case "SYNC_SNIPPET_NOME_INVALIDO":
            return vscode.l10n.t("A snippet name is invalid after validation");
        case "SYNC_SNIPPET_CAMINHO_INVALIDO":
            return vscode.l10n.t("A snippet path is invalid after validation");
        case "SYNC_WORKSPACE_NAO_ABERTO":
            return vscode.l10n.t("Open the target workspace before restoring its layout");
        case "SYNC_BACKUP_NAO_ENCONTRADO":
            return vscode.l10n.t("No layout backup is available to restore");
        case "SYNC_BACKUP_ARQUIVO_INVALIDO":
            return vscode.l10n.t("The backup file is invalid");
        case "SYNC_CONFIGURACAO_NAO_LOCALIZADA":
            return vscode.l10n.t("Could not locate {arquivo} in the Antigravity directory", { arquivo: String(parametros.arquivo) });
        case "SYNC_BACKUP_ID_INVALIDO":
            return vscode.l10n.t("The backup identifier is invalid");
        case "SYNC_BACKUP_MANIFESTO_INVALIDO":
            return vscode.l10n.t("The backup manifest is invalid");
        case "SYNC_BACKUP_ENTRADA_INVALIDA":
            return vscode.l10n.t("A backup entry is invalid");
        case "SYNC_BACKUP_DESTINO_INVALIDO":
            return vscode.l10n.t("The backup destination is invalid");
        case "SYNC_WORKSPACE_SELECAO_NECESSARIA":
            return vscode.l10n.t("Select the workspace layout to be restored");
        case "SYNC_WORKSPACE_FORA_DO_PERFIL":
            return vscode.l10n.t("The selected workspace layout does not belong to the profile");
    }
}

/** Converte falhas estruturadas em texto somente na fronteira de apresentação. */
export function localizarErro(error: unknown, fallback?: string): string {
    if (ehErroDaExtensao(error)) {
        return localizarCodigoDeErro(error.codigo, error.parametros);
    }
    if (error instanceof Error && error.message) {
        return error.message;
    }
    return fallback ?? vscode.l10n.t("An unexpected error occurred");
}

export const catalogo = {
    geral: {
        fechar: (): string => vscode.l10n.t("Close"),
        desconhecido: (): string => vscode.l10n.t("Unknown"),
    },
    itensDeSincronizacao: {
        nome: (item: string): string => {
            switch (item) {
                case "settings":
                    return vscode.l10n.t({ message: "Settings", comment: ["Synchronization item name"] });
                case "extensions":
                    return vscode.l10n.t({ message: "Extensions", comment: ["Synchronization item name"] });
                case "keybindings":
                    return vscode.l10n.t({ message: "Keyboard shortcuts", comment: ["Synchronization item name"] });
                case "snippets":
                    return vscode.l10n.t({ message: "Snippets", comment: ["Synchronization item name"] });
                case "layout":
                    return vscode.l10n.t({ message: "Layout", comment: ["Synchronization item name"] });
                default:
                    return item;
            }
        },
    },
    compatibilidade: {
        avisoIdeIncompativel: (nomeIde: string): string => vscode.l10n.t(
            "Sync Antigravity was designed exclusively for Antigravity IDE. You are using \"{nomeIde}\". Some features may not work correctly.",
            { nomeIde }
        ),
        continuarMesmoAssim: (): string => vscode.l10n.t("Continue anyway"),
    },
    status: {
        sessaoIniciada: (): string => vscode.l10n.t("Sync Antigravity: signed in — click to open the dashboard"),
        inicioNecessario: (): string => vscode.l10n.t("Sync Antigravity — sign-in required"),
        abrirParaIniciar: (): string => vscode.l10n.t("Click to open the dashboard and sign in"),
    },
    painel: {
        sessaoIniciada: (): string => vscode.l10n.t("Signed in successfully"),
        falhaIniciarSessao: (): string => vscode.l10n.t("Failed to sign in"),
        sessaoEncerrada: (): string => vscode.l10n.t("Signed out"),
        perfilCriado: (nome: string): string => vscode.l10n.t("Profile \"{nome}\" created", { nome }),
        preparandoPerfil: (nome: string): string => vscode.l10n.t("Preparing \"{nome}\"", { nome }),
        perfilVazio: (): string => vscode.l10n.t("The profile data is empty"),
        previaExpirada: (): string => vscode.l10n.t("The profile preview expired. Apply the profile again."),
        aplicacaoCancelada: (): string => vscode.l10n.t("Profile application canceled"),
        extensoesSincronizadas: (): string => vscode.l10n.t("Extensions synchronized"),
        enviandoPerfil: (nome: string): string => vscode.l10n.t("Uploading \"{nome}\"", { nome }),
        perfilAtualizado: (nome: string): string => vscode.l10n.t("Profile \"{nome}\" updated", { nome }),
        perfilExcluido: (nome: string): string => vscode.l10n.t("Profile \"{nome}\" deleted", { nome }),
        falhaCarregarPerfis: (): string => vscode.l10n.t("Failed to load the profile list"),
        falhaAtualizarEstado: (): string => vscode.l10n.t("Failed to refresh the dashboard state"),
        falhaIniciarSessaoComMotivo: (erro: string): string => vscode.l10n.t(
            "Failed to sign in: {erro}",
            { erro }
        ),
        falhaListarDados: (): string => vscode.l10n.t("Failed to list application data files"),
        falhaVisualizarArquivo: (): string => vscode.l10n.t("Failed to view the file"),
        arquivo: (): string => vscode.l10n.t("file"),
        falhaAcao: (erro: string): string => vscode.l10n.t("Dashboard action failed: {erro}", { erro }),
        perfilAplicado: (nome: string): string => vscode.l10n.t("Profile \"{nome}\" applied", { nome }),
    },
    progresso: {
        localizandoPerfil: (): string => vscode.l10n.t("Locating profile"),
        baixandoItem: (item: string): string => vscode.l10n.t("Downloading {item}", { item }),
        criandoPasta: (): string => vscode.l10n.t("Creating folder"),
        enviandoItem: (item: string): string => vscode.l10n.t("Uploading {item}", { item }),
        salvandoMetadados: (): string => vscode.l10n.t("Saving metadata"),
        atualizandoMetadados: (): string => vscode.l10n.t("Updating metadata"),
    },
    autenticacao: {
        abrindoNavegador: (): string => vscode.l10n.t("Opening the browser for Google sign-in..."),
        codigoRecebido: (): string => vscode.l10n.t("Authorization code received. Exchanging it for tokens..."),
        sessaoIniciada: (): string => vscode.l10n.t("Signed in to Google successfully"),
        sessaoEncerrada: (): string => vscode.l10n.t("Signed out of Google"),
        fluxoConcluido: (): string => vscode.l10n.t("The sign-in flow has already finished"),
        naoEncontrado: (): string => vscode.l10n.t("Not found"),
        tokenAtualizado: (): string => vscode.l10n.t("Access token updated successfully"),
        sessaoExpirada: (): string => vscode.l10n.t("The Google session expired or was revoked. Sign in again."),
        falhaAtualizarToken: (): string => vscode.l10n.t("Failed to refresh the access token"),
        tokensRestaurados: (): string => vscode.l10n.t("Tokens restored from secure storage"),
        paginaTitulo: (): string => vscode.l10n.t("Completing sign-in - Sync Antigravity"),
        paginaPendenteTitulo: (): string => vscode.l10n.t("Completing sign-in..."),
        paginaPendenteDescricao: (): string => vscode.l10n.t("Validating the session in Antigravity."),
        paginaSucessoTitulo: (): string => vscode.l10n.t("Signed in successfully!"),
        paginaSucessoDescricao: (): string => vscode.l10n.t("You can close this tab and return to Antigravity."),
        paginaFalhaTitulo: (): string => vscode.l10n.t("Failed to sign in"),
        paginaFalhaDescricao: (): string => vscode.l10n.t("Close this tab and try again in Antigravity."),
    },
    registros: {
        objetoDeErro: (): string => vscode.l10n.t("Error object"),
        drive: {
            falhaAnalisarArquivo: (arquivo: string, perfil: string): string => vscode.l10n.t(
                "Failed to parse {arquivo} in {perfil}",
                { arquivo, perfil }
            ),
            metadadosExtensoesInvalidos: (perfil: string): string => vscode.l10n.t(
                "Invalid extension metadata in {perfil}; display names will be rebuilt",
                { perfil }
            ),
            perfilCriado: (perfil: string): string => vscode.l10n.t("Profile created: {perfil}", { perfil }),
            perfilAtualizado: (perfil: string): string => vscode.l10n.t("Profile updated: {perfil}", { perfil }),
            perfilExcluido: (perfil: string): string => vscode.l10n.t("Profile deleted: {perfil}", { perfil }),
            syncMetaIgnorado: (erro: string): string => vscode.l10n.t(
                "sync-meta.json was ignored for security: {erro}",
                { erro }
            ),
            falhaAtualizarSyncMeta: (): string => vscode.l10n.t("Failed to update sync-meta.json"),
        },
        sincronizacao: {
            configuracaoLocalizada: (arquivo: string, caminho: string): string => vscode.l10n.t(
                "{arquivo} was located automatically: {caminho}",
                { arquivo, caminho }
            ),
            naoEncontrado: (caminho: string): string => vscode.l10n.t("Not found: {caminho}", { caminho }),
            configuracaoCriada: (arquivo: string, caminho: string): string => vscode.l10n.t(
                "Default {arquivo} created at: {caminho}",
                { arquivo, caminho }
            ),
            falhaCriarConfiguracao: (arquivo: string): string => vscode.l10n.t(
                "Failed to create the default {arquivo}",
                { arquivo }
            ),
            perfilAplicadoComBackup: (caminho: string): string => vscode.l10n.t(
                "Profile applied. Local backup created at: {caminho}",
                { caminho }
            ),
            restauracaoRevertida: (caminho: string): string => vscode.l10n.t(
                "Restore rolled back. Local backup preserved at: {caminho}",
                { caminho }
            ),
            falhaLerArquivo: (item: string): string => vscode.l10n.t(
                "Failed to read the current installation's {item} file",
                { item }
            ),
            falhaReverter: (item: string): string => vscode.l10n.t("Failed to roll back {item}", { item }),
            layoutProgramado: (backup: string, pendencia: string): string => vscode.l10n.t(
                "Layout scheduled for the next complete Antigravity shutdown. Backup: {backup}; pending change: {pendencia}",
                { backup, pendencia }
            ),
            backupProgramado: (id: string, snapshot: string, pendencia: string): string => vscode.l10n.t(
                "Layout backup scheduled: {id}. Safety snapshot: {snapshot}; pending change: {pendencia}",
                { id, snapshot, pendencia }
            ),
            extensaoInvalidaIgnorada: (id: string): string => vscode.l10n.t(
                "Invalid extension ID ignored: {id}",
                { id }
            ),
            falhaDesinstalarExtensao: (id: string): string => vscode.l10n.t("Failed to uninstall {id}", { id }),
            falhaInstalarExtensao: (id: string): string => vscode.l10n.t("Failed to install {id}", { id }),
        },
    },
    layout: {
        nenhumBackup: (): string => vscode.l10n.t("No layout backup is available"),
        confirmarRestauracao: (data: string): string => vscode.l10n.t(
            "Restore the layout backup from {data}?",
            { data }
        ),
        restaurarBackup: (): string => vscode.l10n.t("Restore backup"),
        restaurado: (): string => vscode.l10n.t(
            "Layout backup restored. Reload the window to apply the visual organization."
        ),
        recarregarAgora: (): string => vscode.l10n.t("Reload now"),
        falhaRestauracao: (): string => vscode.l10n.t("Failed to restore the layout backup"),
    },
    logs: {
        ativacaoIniciada: (): string => vscode.l10n.t("Extension activation started"),
        ideIncompativel: (nomeIde: string): string => vscode.l10n.t(
            "A different IDE was detected: {nomeIde}",
            { nomeIde }
        ),
        falhaInicializacao: (): string => vscode.l10n.t("Failed to initialize Sync Antigravity"),
        ativacaoConcluida: (): string => vscode.l10n.t("Extension activated successfully"),
        abaOrfaFechada: (): string => vscode.l10n.t("Orphaned dashboard tab closed"),
        extensaoDesativada: (): string => vscode.l10n.t("Extension deactivated"),
    },
} as const;
