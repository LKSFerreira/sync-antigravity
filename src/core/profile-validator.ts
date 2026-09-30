/** Validação estrita e prévia segura de perfis recebidos do Google Drive. */

import { IProfile, ISyncItem } from "../models/interfaces";
import { getWorkspaceLayouts, normalizeLayoutProfile } from "../models/layout-profile";

export const MAX_REMOTE_PROFILE_FILE_BYTES = 3 * 1024 * 1024;
const MAX_CONFIG_BYTES = 1024 * 1024;
const MAX_EXTENSION_IDS = 2048;
const MAX_SNIPPET_FILES = 128;
const MAX_SNIPPET_FILE_BYTES = 256 * 1024;
const MAX_SNIPPETS_TOTAL_BYTES = 4 * 1024 * 1024;
const MAX_LAYOUT_SERIALIZED_BYTES = 1024 * 1024;

export interface IProfilePreviewItem {
    key: string;
    label: string;
    detail: string;
}

export interface IProfileRestorePreview {
    items: IProfilePreviewItem[];
    extensions?: {
        toInstall: string[];
        toDelete: string[];
    };
    layout?: {
        globalEntryCount: number;
        globalKeys: string[];
        workspaces: Array<{
            sourceId: string;
            label: string;
            entryCount: number;
        }>;
    };
}

/** Valida e normaliza todos os itens selecionados antes de qualquer escrita local. */
export function validateRemoteProfile(
    profile: IProfile,
    syncItems: ISyncItem[]
): { profile: IProfile; preview: IProfileRestorePreview } {
    if (!profile || typeof profile.profileName !== "string" || !profile.data || typeof profile.data !== "object" || Array.isArray(profile.data)) {
        throw new Error("Estrutura de perfil inválida");
    }

    const data: Record<string, unknown> = {};
    const preview: IProfileRestorePreview = { items: [] };
    let availableItems = 0;
    for (const item of syncItems.filter((syncItem) => syncItem.enabled)) {
        if (!Object.prototype.hasOwnProperty.call(profile.data, item.key)) {
            preview.items.push({ key: item.key, label: item.label, detail: "Não presente no perfil" });
            continue;
        }

        const value = profile.data[item.key];
        availableItems++;
        switch (item.key) {
            case "settings":
            case "keybindings": {
                const content = validateBase64(value, item.label, MAX_CONFIG_BYTES);
                data[item.key] = content;
                preview.items.push({ key: item.key, label: item.label, detail: formatBytes(Buffer.byteLength(content, "base64")) });
                break;
            }
            case "extensions": {
                const extensionIds = validateExtensionIds(value);
                data.extensions = extensionIds;
                preview.items.push({ key: item.key, label: item.label, detail: `${extensionIds.length} extensão(ões)` });
                break;
            }
            case "snippets": {
                const snippets = validateSnippets(value);
                data.snippets = snippets.files;
                preview.items.push({ key: item.key, label: item.label, detail: `${snippets.count} arquivo(s), ${formatBytes(snippets.totalBytes)}` });
                break;
            }
            case "layout": {
                const serializedBytes = Buffer.byteLength(JSON.stringify(value), "utf8");
                if (serializedBytes > MAX_LAYOUT_SERIALIZED_BYTES) {
                    throw new Error("Layout remoto excede o tamanho permitido");
                }
                const layout = normalizeLayoutProfile(value);
                const workspaces = getWorkspaceLayouts(layout);
                data.layout = layout;
                preview.layout = {
                    globalEntryCount: layout.global.entries.length,
                    globalKeys: layout.global.entries.map((entry) => entry.key),
                    workspaces: workspaces.map((workspace) => ({
                        sourceId: workspace.sourceId,
                        label: workspace.label,
                        entryCount: workspace.entries.length,
                    })),
                };
                preview.items.push({
                    key: item.key,
                    label: item.label,
                    detail: `${layout.global.entries.length} item(ns) globais, ${workspaces.length} workspace(s)`,
                });
                break;
            }
            default:
                throw new Error(`Item de sincronização desconhecido: ${item.key}`);
        }
    }

    if (availableItems === 0) {
        throw new Error("O perfil não contém nenhum dos itens selecionados");
    }
    return { profile: { profileName: profile.profileName, data }, preview };
}

/** Impede payloads de base64 malformados ou desproporcionalmente grandes. */
function validateBase64(value: unknown, label: string, maxBytes: number): string {
    if (typeof value !== "string" || value.length > Math.ceil(maxBytes / 3) * 4 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)) {
        throw new Error(`${label} remoto inválido`);
    }
    const decoded = Buffer.from(value, "base64");
    if (decoded.byteLength > maxBytes || decoded.toString("base64") !== value) {
        throw new Error(`${label} remoto inválido`);
    }
    return value;
}

/** Valida IDs antes de qualquer cálculo de diferença ou acionamento de comando da IDE. */
function validateExtensionIds(value: unknown): string[] {
    if (!Array.isArray(value) || value.length > MAX_EXTENSION_IDS) {
        throw new Error("Lista remota de extensões inválida");
    }
    const ids = value.map((id) => {
        if (typeof id !== "string" || !/^[a-z0-9][a-z0-9-]*\.[a-z0-9][a-z0-9-]*$/i.test(id)) {
            throw new Error("ID remoto de extensão inválido");
        }
        return id;
    });
    if (new Set(ids).size !== ids.length) {
        throw new Error("Lista remota de extensões contém duplicidades");
    }
    return ids;
}

/** Valida nomes e conteúdo de snippets como um pacote fechado, sem aplicação parcial. */
function validateSnippets(value: unknown): { files: Record<string, string>; count: number; totalBytes: number } {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        throw new Error("Pacote remoto de snippets inválido");
    }
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length > MAX_SNIPPET_FILES) {
        throw new Error("Quantidade de snippets excede o limite permitido");
    }

    let totalBytes = 0;
    const files: Record<string, string> = {};
    for (const [fileName, content] of entries) {
        if (!isSafeSnippetFileName(fileName)) {
            throw new Error("Nome remoto de snippet inválido");
        }
        const base64 = validateBase64(content, `Snippet ${fileName}`, MAX_SNIPPET_FILE_BYTES);
        totalBytes += Buffer.byteLength(base64, "base64");
        if (totalBytes > MAX_SNIPPETS_TOTAL_BYTES) {
            throw new Error("Pacote remoto de snippets excede o tamanho permitido");
        }
        files[fileName] = base64;
    }
    return { files, count: entries.length, totalBytes };
}

export function isSafeSnippetFileName(fileName: string): boolean {
    return (
        typeof fileName === "string" &&
        fileName.length > 0 &&
        fileName.length <= 128 &&
        !fileName.includes("/") &&
        !fileName.includes("\\") &&
        !fileName.includes("..") &&
        (fileName.endsWith(".json") || fileName.endsWith(".code-snippets"))
    );
}

function formatBytes(bytes: number): string {
    if (bytes < 1024) {
        return `${bytes} B`;
    }
    return `${(bytes / 1024).toFixed(1)} KiB`;
}
