// Interfaces TypeScript do Sync Antigravity
// Arquitetura extensível de sincronização com registro de SyncItem

/** Define os dados técnicos e estáveis de um item de sincronização. */
export interface ISyncItemDefinition {
    key: string;           // "settings" | "extensions" | "keybindings" | ...
    fileName: string;      // "settings.json", "extensions.json", ...
    icon: string;          // Nome do Codicon
    enabled: boolean;      // Sincroniza por padrão
}

/** Item pronto para apresentação, com rótulo localizado somente em memória. */
export interface ISyncItem extends ISyncItemDefinition {
    label: string;
}

/** Registro técnico padrão; rótulos são acrescentados pela camada de localização. */
export const DEFAULT_SYNC_ITEM_DEFINITIONS: readonly ISyncItemDefinition[] = Object.freeze([
    { key: "settings", fileName: "settings.json", icon: "settings-gear", enabled: true },
    { key: "extensions", fileName: "extensions.json", icon: "extensions", enabled: true },
    { key: "keybindings", fileName: "keybindings.json", icon: "keyboard", enabled: true },
    { key: "snippets", fileName: "snippets.json", icon: "symbol-snippet", enabled: true },
    { key: "layout", fileName: "layout.json", icon: "layout", enabled: true },
]);

/** Metadados do perfil: armazenados em meta.json dentro da pasta do perfil */
export interface IProfileMeta {
    name: string;
    createdAt: string;  // ISO 8601
    updatedAt: string;  // ISO 8601
    syncKeys: string[]; // Chaves sincronizadas: ["settings", "extensions", "keybindings"]
}

/** Identificação legível de uma extensão sincronizada. */
export interface IExtensionProfileEntry {
    id: string;
    displayName: string;
}

/** Dados completos do perfil: dinâmicos e indexados por ISyncItem.key */
export interface IProfile {
    profileName: string;
    data: Record<string, any>;  // { settings: {...}, extensions: ["publicador.extensao"], extensionDisplayNames: {...} }
}

/** sync-meta.json raiz: armazena syncKeys de todos os perfis na raiz de appDataFolder */
export type ISyncMeta = Record<string, string[]>;
// { "work": ["settings", "extensions"], "home": ["settings"] }
