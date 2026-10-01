// Ponto de entrada da extensão Sync Antigravity (Google Drive)
// Interface exclusiva do painel, StatusBar, inicialização do controlador e serviço do Google Drive

import * as vscode from "vscode";
import Logger from "./core/logger";
import GoogleAuth from "./core/google-auth";
import GoogleDriveService from "./core/google-drive";
import SyncController from "./core/sync-controller";
import DashboardProvider from "./providers/dashboard-provider";

export let logger: Logger;
let statusBarItem: vscode.StatusBarItem;

export async function activate(ctx: vscode.ExtensionContext) {
    try {
        // Inicializa o Logger
        logger = new Logger();
        logger.info("Ativação da extensão iniciada");

        // Compatível somente com Antigravity IDE 2.0+
        if (vscode.env.appName !== "Antigravity IDE") {
            vscode.window.showWarningMessage(
                `Sync Antigravity foi projetado exclusivamente para o Antigravity IDE. ` +
                `Você está usando "${vscode.env.appName}". ` +
                `Alguns recursos podem não funcionar corretamente.`,
                "Continuar mesmo assim",
                "Fechar"
            ).then((choice) => {
                if (choice !== "Continuar mesmo assim") {
                    deactivate(true);
                }
            });
            logger.warn(`IDE diferente do Antigravity detectada: ${vscode.env.appName}`);
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
                "Falha ao inicializar o Sync Antigravity",
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
                statusBarItem.tooltip = "Sync Antigravity: sessão iniciada - clique para abrir o painel";
            } else {
                statusBarItem.text = "$(sync~spin) Sync Antigravity - início de sessão necessário";
                statusBarItem.tooltip = "Clique para abrir o painel e iniciar sessão";
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
                        vscode.window.showInformationMessage("Nenhum backup de layout está disponível");
                        return;
                    }
                    const choice = await vscode.window.showWarningMessage(
                        `Restaurar o backup de layout de ${new Date(backup.createdAt).toLocaleString("pt-BR")}?`,
                        { modal: true },
                        "Restaurar backup"
                    );
                    if (choice !== "Restaurar backup") {
                        return;
                    }

                    await controller.rollbackLatestLayoutBackup();
                    const reload = await vscode.window.showInformationMessage(
                        "Backup de layout restaurado. Recarregue a janela para aplicar a organização visual.",
                        "Recarregar agora"
                    );
                    if (reload === "Recarregar agora") {
                        await vscode.commands.executeCommand("workbench.action.reloadWindow");
                    }
                } catch (error) {
                    logger.error("Falha ao restaurar backup de layout", "rollbackLayout", true, error);
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

        logger.info("Extensão ativada com sucesso", false, "activate");
    } catch (error) {
        logger.error(`${error}`, "activate", false, error);
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
                        () => logger.info("Aba órfã do painel fechada"),
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
    logger?.info("Extensão desativada");
    statusBarItem?.dispose();
    if (!preserveLogger) {
        logger?.dispose();
    }
}
