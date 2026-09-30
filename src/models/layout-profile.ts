/** Contrato validado para sincronização portátil do layout da IDE. */

export interface ILayoutEntry {
    key: string;
    value: string;
}

export interface ILayoutDocument {
    schemaVersion: 1;
    capturedAt: string;
    entries: ILayoutEntry[];
}

export interface IWorkspaceLayout extends ILayoutDocument {
    sourceId: string;
    label: string;
}

export interface IWorkspaceLayoutsDocument {
    schemaVersion: 1;
    capturedAt: string;
    layouts: IWorkspaceLayout[];
}

export interface ILayoutProfile {
    schemaVersion: 1;
    global: ILayoutDocument;
    workspace?: IWorkspaceLayout;
}

export const GLOBAL_LAYOUT_KEYS = new Set<string>([
    "workbench.activity.pinnedViewlets2",
    "workbench.activity.placeholderViewlets",
    "workbench.activityBar.location",
    "workbench.auxiliaryActivityBar.location",
    "workbench.auxiliaryBar.empty",
    "workbench.auxiliaryBar.lastNonMaximizedSize",
    "workbench.auxiliaryBar.size",
    "workbench.panel.alignment",
    "workbench.panel.lastNonMaximizedHeight",
    "workbench.panel.lastNonMaximizedWidth",
    "workbench.panel.pinnedPanels",
    "workbench.panel.placeholderPanels",
    "workbench.panel.size",
    "workbench.sideBar.size",
]);

export const WORKSPACE_LAYOUT_KEYS = new Set<string>([
    "workbench.activity.viewletsWorkspaceState",
    "workbench.activityBar.hidden",
    "workbench.auxiliaryactivity.viewletsWorkspaceState",
    "workbench.auxiliaryActivityBar.hidden",
    "workbench.auxiliarybar.activepanelid",
    "workbench.auxiliaryBar.hidden",
    "workbench.auxiliaryBar.lastNonMaximizedVisibility",
    "workbench.auxiliaryBar.wasLastMaximized",
    "workbench.editor.centered",
    "workbench.editor.hidden",
    "workbench.panel.hidden",
    "workbench.panel.position",
    "workbench.panel.viewContainersWorkspaceState",
    "workbench.panel.wasLastMaximized",
    "workbench.panelpart.activepanelid",
    "workbench.sidebar.activeviewletid",
    "workbench.sideBar.hidden",
    "workbench.sideBar.position",
    "workbench.statusBar.hidden",
    "workbench.zenMode.active",
]);

const VIEW_STATE_KEY = /^workbench\.(?:view|panel)\.[a-zA-Z0-9._-]+\.(?:state|hidden|numberOfVisibleViews)$/;
const BOOLEAN_OR_NUMBER = /^(?:true|false|-?\d+(?:\.\d+)?)$/;
const MAX_ENTRY_BYTES = 16 * 1024;
const MAX_ENTRIES = 128;

/** Retorna se uma chave global pertence à lista de layout permitida. */
export function isAllowedGlobalLayoutKey(key: string): boolean {
    return GLOBAL_LAYOUT_KEYS.has(key);
}

/** Retorna se uma chave de workspace pertence à lista de layout permitida. */
export function isAllowedWorkspaceLayoutEntry(entry: ILayoutEntry): boolean {
    if (WORKSPACE_LAYOUT_KEYS.has(entry.key)) {
        return true;
    }

    return VIEW_STATE_KEY.test(entry.key) && BOOLEAN_OR_NUMBER.test(entry.value);
}

/** Valida entradas antes de persistir ou restaurar o layout. */
export function validateLayoutEntries(
    entries: ILayoutEntry[],
    isAllowed: (entry: ILayoutEntry) => boolean
): ILayoutEntry[] {
    if (!Array.isArray(entries) || entries.length > MAX_ENTRIES) {
        throw new Error("Quantidade inválida de entradas de layout");
    }

    const seenKeys = new Set<string>();
    return entries.map((entry) => {
        if (
            !entry ||
            typeof entry.key !== "string" ||
            typeof entry.value !== "string" ||
            !isAllowed(entry) ||
            seenKeys.has(entry.key) ||
            Buffer.byteLength(entry.value, "utf8") > MAX_ENTRY_BYTES
        ) {
            throw new Error("Entrada de layout inválida");
        }

        seenKeys.add(entry.key);
        return { key: entry.key, value: entry.value };
    });
}

/** Cria um documento de layout global já validado. */
export function createGlobalLayoutDocument(entries: ILayoutEntry[]): ILayoutDocument {
    return {
        schemaVersion: 1,
        capturedAt: new Date().toISOString(),
        entries: validateLayoutEntries(entries, (entry) => isAllowedGlobalLayoutKey(entry.key)),
    };
}

/** Cria um documento de layout de workspace já validado. */
export function createWorkspaceLayout(
    sourceId: string,
    label: string,
    entries: ILayoutEntry[]
): IWorkspaceLayout {
    if (!/^[a-f0-9]{16,128}$/i.test(sourceId) || !label.trim()) {
        throw new Error("Identificador ou nome de workspace inválido");
    }

    return {
        schemaVersion: 1,
        capturedAt: new Date().toISOString(),
        sourceId,
        label: label.trim(),
        entries: validateLayoutEntries(entries, isAllowedWorkspaceLayoutEntry),
    };
}

/** Cria o conteúdo de layout armazenado dentro de um perfil de sincronização. */
export function createLayoutProfile(
    global: ILayoutDocument,
    workspace?: IWorkspaceLayout
): ILayoutProfile {
    return {
        schemaVersion: 1,
        global: {
            schemaVersion: 1,
            capturedAt: global.capturedAt,
            entries: validateLayoutEntries(global.entries, (entry) => isAllowedGlobalLayoutKey(entry.key)),
        },
        workspace: workspace
            ? createWorkspaceLayout(workspace.sourceId, workspace.label, workspace.entries)
            : undefined,
    };
}
