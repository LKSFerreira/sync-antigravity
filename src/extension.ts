// Ponto de entrada da extensão Sync Antigravity (Google Drive)
// Interface exclusiva do painel, StatusBar, inicialização do controlador e serviço do Google Drive

import * as vscode from "vscode";
import Logger from "./core/logger";
import GoogleAuth from "./core/google-auth";
import GoogleDriveService from "./core/google-drive";
import SyncController from "./core/sync-controller";
import DashboardProvider from "./providers/dashboard-provider";
import { catalogo, localizarErro } from "./localizacao/catalogo";
import { resolverContextoDeIdioma } from "./localizacao/idioma";

export let logger: Logger;
let statusBarItem: vscode.StatusBarItem;

export async function activate(ctx: vscode.ExtensionContext) {
    try {
        const contextoDeIdioma = resolverContextoDeIdioma(vscode.env.language);

        // Inicializa o Logger
        logger = new Logger();
        logger.info(catalogo.logs.ativacaoIniciada());

        // Compatível somente com Antigravity IDE 2.0+
        if (vscode.env.appName !== "Antigravity IDE") {
            const continuarMesmoAssim = catalogo.compatibilidade.continuarMesmoAssim();
            const fechar = catalogo.geral.fechar();
            vscode.window.showWarningMessage(
                catalogo.compatibilidade.avisoIdeIncompativel(vscode.env.appName),
                continuarMesmoAssim,
                fechar
            ).then((choice) => {
                if (choice !== continuarMesmoAssim) {
                    deactivate(true);
                }
            });
            logger.warn(catalogo.logs.ideIncompativel(vscode.env.appName));
        }

        // Inicializa a barra de status
        statusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Right,
            100
        );
        statusBarItem.command = "antigravitysync.showDashboard";
        statusBarItem.show();

        // Inicializa o SyncController
        const controller = await SyncController.initialize(logger, ctx);
        if (!controller) {
            logger.error(
                catalogo.logs.falhaInicializacao(),
                "activate",
                true
            );
            deactivate(true);
            return;
        }

        // Inicializa a autenticação do Google
        const auth = new GoogleAuth(logger, ctx);

        // Inicializa o serviço do Google Drive
        const drive = new GoogleDriveService(auth, logger);

        // Inicializa o provedor do painel
        const dashboard = new DashboardProvider(ctx, auth, drive, controller, logger, updateStatusBar);

        // Atualiza a barra de status com base no estado de autenticação
        async function updateStatusBar() {
            const authenticated = await auth.isAuthenticated();
            if (authenticated) {
                statusBarItem.text = "$(sync) Sync Antigravity";
                statusBarItem.tooltip = catalogo.status.sessaoIniciada();
            } else {
                statusBarItem.text = `$(sync~spin) ${catalogo.status.inicioNecessario()}`;
                statusBarItem.tooltip = catalogo.status.abrirParaIniciar();
            }
        }
        await updateStatusBar();

        // ===== Comandos =====

        const ShowDashboard = vscode.commands.registerCommand(
            "antigravitysync.showDashboard",
            () => { dashboard.show(); }
        );

        const RollbackLayout = vscode.commands.registerCommand(
            "antigravitysync.rollbackLayout",
            async () => {
                try {
                    const backup = await controller.getLatestLayoutBackup();
                    if (!backup) {
                        vscode.window.showInformationMessage(catalogo.layout.nenhumBackup());
                        return;
                    }
                    const dataDoBackup = new Intl.DateTimeFormat(contextoDeIdioma.localidade, {
                        dateStyle: "short",
                        timeStyle: "medium",
                    }).format(new Date(backup.createdAt));
                    const restaurarBackup = catalogo.layout.restaurarBackup();
                    const choice = await vscode.window.showWarningMessage(
                        catalogo.layout.confirmarRestauracao(dataDoBackup),
                        { modal: true },
                        restaurarBackup
                    );
                    if (choice !== restaurarBackup) {
                        return;
                    }

                    await controller.rollbackLatestLayoutBackup();
                    const recarregarAgora = catalogo.layout.recarregarAgora();
                    const reload = await vscode.window.showInformationMessage(
                        catalogo.layout.restaurado(),
                        recarregarAgora
                    );
                    if (reload === recarregarAgora) {
                        await vscode.commands.executeCommand("workbench.action.reloadWindow");
                    }
                } catch (error) {
                    logger.error(catalogo.layout.falhaRestauracao(), "rollbackLayout", true, error);
                }
            }
        );

        // Registra todos os comandos
        ctx.subscriptions.push(
            ShowDashboard,
            RollbackLayout,
            statusBarItem, logger
        );

        // Fecha painéis órfãos da sessão anterior da extensão
        closeOrphanedPanels();

        logger.info(catalogo.logs.ativacaoConcluida(), false, "activate");
    } catch (error) {
        logger?.error(localizarErro(error, catalogo.logs.falhaInicializacao()), "activate", false, error);
    }
}

/** Fecha abas órfãs do painel que permanecem após reiniciar a extensão */
function closeOrphanedPanels() {
    for (const group of vscode.window.tabGroups.all) {
        for (const tab of group.tabs) {
            if (tab.input instanceof vscode.TabInputWebview) {
                const viewType = (tab.input as any).viewType as string;
                if (viewType?.includes("antigravitysync.dashboard")) {
                    vscode.window.tabGroups.close(tab).then(
                        () => logger.info(catalogo.logs.abaOrfaFechada()),
                        () => { /* ignora */ }
                    );
                }
            }
        }
    }
}

/** Auxiliar: garante que a pessoa usuária tenha iniciado sessão antes da ação */
export async function ensureAuth(auth: GoogleAuth): Promise<boolean> {
    if (await auth.isAuthenticated()) {
        return true;
    }
    return false;
}

export function deactivate(preserveLogger: boolean = false) {
    logger?.info(catalogo.logs.extensaoDesativada());
    statusBarItem?.dispose();
    if (!preserveLogger) {
        logger?.dispose();
    }
}
