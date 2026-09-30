// Interfaces TypeScript do Sync Antigravity
// Arquitetura extensível de sincronização com registro de SyncItem

/** Define um item de sincronização: padrão de registro */
export interface ISyncItem {
    key: string;           // "settings" | "extensions" | "keybindings" | ...
    fileName: string;      // "settings.json", "extensions.json", ...
    label: string;         // Nome exibido na interface
    icon: string;          // Nome do Codicon
    enabled: boolean;      // Sincroniza por padrão
}

/** Registro padrão: adicione novos tipos de dados incluindo entradas */
export const DEFAULT_SYNC_ITEMS: ISyncItem[] = [
    { key: "settings",    fileName: "settings.json",    label: "Configurações", icon: "settings-gear", enabled: true },
    { key: "extensions",  fileName: "extensions.json",  label: "Extensões",     icon: "extensions",    enabled: true },
    { key: "keybindings", fileName: "keybindings.json", label: "Atalhos",       icon: "keyboard",      enabled: true },
    { key: "snippets",    fileName: "snippets.json",    label: "Snippets",    icon: "symbol-snippet",  enabled: true },
    { key: "layout",      fileName: "layout.json",      label: "Layout",      icon: "layout",          enabled: true },
];

/** Metadados do perfil: armazenados em meta.json dentro da pasta do perfil */
export interface IProfileMeta {
    name: string;
    createdAt: string;  // ISO 8601
    updatedAt: string;  // ISO 8601
    syncKeys: string[]; // Chaves sincronizadas: ["settings", "extensions", "keybindings"]
}

/** Dados completos do perfil: dinâmicos e indexados por ISyncItem.key */
export interface IProfile {
    profileName: string;
    data: Record<string, any>;  // { settings: {...}, extensions: [...], keybindings: [...] }
}

/** sync-meta.json raiz: armazena syncKeys de todos os perfis na raiz de appDataFolder */
export type ISyncMeta = Record<string, string[]>;
// { "work": ["settings", "extensions"], "home": ["settings"] }
