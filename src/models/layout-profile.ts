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
    workspaces?: IWorkspaceLayoutsDocument;
    /** Compatibilidade com perfis criados antes do suporte a vários workspaces. */
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
const MAX_WORKSPACE_LAYOUTS = 12;

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
    if (!/^[a-f0-9]{16,128}$/i.test(sourceId) || !label.trim() || label.trim().length > 200) {
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

/** Garante a forma de um documento de layout recebido antes de reutilizá-lo. */
function normalizeLayoutDocument(
    document: ILayoutDocument,
    isAllowed: (entry: ILayoutEntry) => boolean
): ILayoutDocument {
    if (
        !document ||
        document.schemaVersion !== 1 ||
        typeof document.capturedAt !== "string" ||
        !Number.isFinite(Date.parse(document.capturedAt))
    ) {
        throw new Error("Documento de layout inválido");
    }
    return {
        schemaVersion: 1,
        capturedAt: document.capturedAt,
        entries: validateLayoutEntries(document.entries, isAllowed),
    };
}

/** Garante a forma de um layout de workspace recebido antes de reutilizá-lo. */
function normalizeWorkspaceLayout(layout: IWorkspaceLayout): IWorkspaceLayout {
    const document = normalizeLayoutDocument(layout, isAllowedWorkspaceLayoutEntry);
    const normalized = createWorkspaceLayout(layout.sourceId, layout.label, document.entries);
    return { ...normalized, capturedAt: document.capturedAt };
}

/** Normaliza os layouts de workspace e impede duplicidade por armazenamento local. */
export function normalizeWorkspaceLayouts(layouts: IWorkspaceLayout[]): IWorkspaceLayout[] {
    if (!Array.isArray(layouts) || layouts.length > MAX_WORKSPACE_LAYOUTS) {
        throw new Error("Quantidade inválida de layouts de workspace");
    }

    const sourceIds = new Set<string>();
    return layouts.map((layout) => {
        const normalized = normalizeWorkspaceLayout(layout);
        if (sourceIds.has(normalized.sourceId)) {
            throw new Error("Layout de workspace duplicado");
        }
        sourceIds.add(normalized.sourceId);
        return normalized;
    });
}

/** Lê layouts novos e também o formato de um único workspace usado anteriormente. */
export function getWorkspaceLayouts(profile: ILayoutProfile): IWorkspaceLayout[] {
    if (profile.workspaces && (
        profile.workspaces.schemaVersion !== 1 ||
        typeof profile.workspaces.capturedAt !== "string" ||
        !Number.isFinite(Date.parse(profile.workspaces.capturedAt)) ||
        !Array.isArray(profile.workspaces.layouts)
    )) {
        throw new Error("Documento de workspaces inválido");
    }
    const layouts = profile.workspaces?.layouts ?? (profile.workspace ? [profile.workspace] : []);
    return normalizeWorkspaceLayouts(layouts);
}

/** Cria o documento que agrupa os layouts vinculados a um perfil. */
export function createWorkspaceLayoutsDocument(
    layouts: IWorkspaceLayout[]
): IWorkspaceLayoutsDocument | undefined {
    const normalized = normalizeWorkspaceLayouts(layouts);
    if (normalized.length === 0) {
        return undefined;
    }

    return {
        schemaVersion: 1,
        capturedAt: new Date().toISOString(),
        layouts: normalized,
    };
}

/** Cria o conteúdo de layout armazenado dentro de um perfil de sincronização. */
export function createLayoutProfile(
    global: ILayoutDocument,
    workspaces: IWorkspaceLayout[] = []
): ILayoutProfile {
    return {
        schemaVersion: 1,
        global: normalizeLayoutDocument(global, (entry) => isAllowedGlobalLayoutKey(entry.key)),
        workspaces: createWorkspaceLayoutsDocument(workspaces),
    };
}
