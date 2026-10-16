/** Módulo responsável por descobrir todas as extensões instaladas (habilitadas e desabilitadas). */

import { existsSync } from "fs";
import { readFile, readdir, stat } from "fs/promises";
import * as path from "path";

import { IExtensionProfileEntry } from "../models/interfaces";

export { IExtensionProfileEntry };

export interface IActiveExtensionInfo {
    id: string;
    isBuiltin?: boolean;
    displayName?: string;
    name?: string;
}

export interface ICollectInstalledExtensionsOptions {
    candidates: string[];
    activeExtensions: readonly IActiveExtensionInfo[];
    excludeList?: readonly string[];
}

interface IExtensionManifestEntry {
    identifier?: { id?: string };
    id?: string;
    relativeLocation?: string;
    location?: { path?: string; fsPath?: string };
}

/** Valida o formato publisher.name antes de aceitar uma extensão. */
export function isValidExtensionId(identifier: string): boolean {
    return /^[a-z0-9][a-z0-9-]*\.[a-z0-9][a-z0-9-]*$/i.test(identifier);
}

/** Gera um nome legível para extensões a partir do identificador quando não houver outro metadado. */
export function displayNameFromExtensionId(identifier: string): string {
    const extensionName = identifier.split(".")[1] || identifier;
    return extensionName
        .split(/[-_]+/)
        .filter(Boolean)
        .map((part) => (part.length <= 4 ? part.toUpperCase() : `${part.charAt(0).toUpperCase()}${part.slice(1)}`))
        .join(" ");
}

/** Localiza o diretório oficial de extensões a partir da lista de candidatos fornecida. */
export async function findExtensionDirectory(candidates: readonly string[]): Promise<string | undefined> {
    for (const candidatePath of candidates) {
        if (!candidatePath) {
            continue;
        }

        try {
            const manifestPath = path.join(candidatePath, "extensions.json");
            const manifestStats = await stat(manifestPath);
            if (manifestStats.isFile()) {
                return candidatePath;
            }
        } catch {
            // Continua a busca caso o manifesto não exista neste candidato
        }
    }

    // Se nenhum candidato tiver extensions.json, tenta o primeiro diretório existente
    for (const candidatePath of candidates) {
        if (!candidatePath) {
            continue;
        }

        try {
            const directoryStats = await stat(candidatePath);
            if (directoryStats.isDirectory()) {
                return candidatePath;
            }
        } catch {
            // Diretório inexistente ou inacessível
        }
    }

    return undefined;
}

/** Lê o conjunto de pastas obsoletas de versões antigas de extensões. */
async function readObsoleteFolderNames(extensionsDirectory: string): Promise<Set<string>> {
    const obsoleteFilePath = path.join(extensionsDirectory, ".obsolete");
    if (!existsSync(obsoleteFilePath)) {
        return new Set();
    }

    try {
        const rawContent = await readFile(obsoleteFilePath, "utf8");
        const parsedContent = JSON.parse(rawContent) as Record<string, unknown>;
        return new Set(Object.keys(parsedContent));
    } catch {
        return new Set();
    }
}

/** Extrai o nome de exibição de um package.json de extensão no disco, tratando fallbacks de localização. */
async function readDisplayNameFromPackageJson(packageJsonPath: string): Promise<string | undefined> {
    try {
        const packageContent = await readFile(packageJsonPath, "utf8");
        const parsedPackage = JSON.parse(packageContent) as { displayName?: string; name?: string };

        const foundDisplayName = parsedPackage.displayName?.trim();
        if (foundDisplayName && !foundDisplayName.startsWith("%")) {
            return foundDisplayName;
        }

        const foundPackageName = parsedPackage.name?.trim();
        if (foundPackageName && !foundPackageName.startsWith("%")) {
            return foundPackageName;
        }
    } catch {
        // Ignora falhas de leitura ou JSON inválido
    }
    return undefined;
}

/** Lê todas as extensões registradas no arquivo extensions.json. */
async function readFromManifestFile(
    extensionsDirectory: string,
    obsoleteFolders: Set<string>,
    activeExtensionsMap: Map<string, IActiveExtensionInfo>
): Promise<Map<string, IExtensionProfileEntry>> {
    const manifestPath = path.join(extensionsDirectory, "extensions.json");
    const collected = new Map<string, IExtensionProfileEntry>();

    if (!existsSync(manifestPath)) {
        return collected;
    }

    try {
        const rawManifest = await readFile(manifestPath, "utf8");
        const parsedEntries = JSON.parse(rawManifest) as IExtensionManifestEntry[];
        if (!Array.isArray(parsedEntries)) {
            return collected;
        }

        for (const entry of parsedEntries) {
            const extensionId = entry.identifier?.id || (typeof entry.id === "string" ? entry.id : undefined);
            if (!extensionId || !isValidExtensionId(extensionId)) {
                continue;
            }

            if (entry.relativeLocation && obsoleteFolders.has(entry.relativeLocation)) {
                continue;
            }

            const lowerCaseId = extensionId.toLowerCase();
            const activeMatch = activeExtensionsMap.get(lowerCaseId);

            let displayName = activeMatch?.displayName || activeMatch?.name;
            if (!displayName && entry.relativeLocation) {
                const packageJsonPath = path.join(extensionsDirectory, entry.relativeLocation, "package.json");
                displayName = await readDisplayNameFromPackageJson(packageJsonPath);
            }

            if (!displayName) {
                displayName = displayNameFromExtensionId(extensionId);
            }

            collected.set(lowerCaseId, {
                id: extensionId,
                displayName,
            });
        }
    } catch {
        // Retorna o que foi coletado até o momento caso ocorra erro no arquivo
    }

    return collected;
}

/** Varre subdiretórios de extensões quando o arquivo extensions.json estiver ausente. */
async function scanSubdirectoriesForExtensions(
    extensionsDirectory: string,
    obsoleteFolders: Set<string>,
    activeExtensionsMap: Map<string, IActiveExtensionInfo>
): Promise<Map<string, IExtensionProfileEntry>> {
    const collected = new Map<string, IExtensionProfileEntry>();

    try {
        const directoryEntries = await readdir(extensionsDirectory, { withFileTypes: true });

        for (const directoryEntry of directoryEntries) {
            if (!directoryEntry.isDirectory() || directoryEntry.name.startsWith(".")) {
                continue;
            }

            if (obsoleteFolders.has(directoryEntry.name)) {
                continue;
            }

            const packageJsonPath = path.join(extensionsDirectory, directoryEntry.name, "package.json");
            try {
                const packageContent = await readFile(packageJsonPath, "utf8");
                const parsedPackage = JSON.parse(packageContent) as {
                    publisher?: string;
                    name?: string;
                    displayName?: string;
                };

                if (!parsedPackage.publisher || !parsedPackage.name) {
                    continue;
                }

                const extensionId = `${parsedPackage.publisher}.${parsedPackage.name}`;
                if (!isValidExtensionId(extensionId)) {
                    continue;
                }

                const lowerCaseId = extensionId.toLowerCase();
                const activeMatch = activeExtensionsMap.get(lowerCaseId);
                const displayName =
                    activeMatch?.displayName ||
                    activeMatch?.name ||
                    parsedPackage.displayName ||
                    parsedPackage.name ||
                    displayNameFromExtensionId(extensionId);

                collected.set(lowerCaseId, {
                    id: extensionId,
                    displayName,
                });
            } catch {
                // Pasta sem package.json válido, ignora
            }
        }
    } catch {
        // Falha ao listar diretório
    }

    return collected;
}

/** Coleta todas as extensões instaladas no sistema, incluindo desabilitadas e ativas. */
export async function collectInstalledExtensions(
    options: ICollectInstalledExtensionsOptions
): Promise<IExtensionProfileEntry[]> {
    const excludeSet = new Set(
        (options.excludeList || []).map((excludedId) => excludedId.toLowerCase())
    );

    const activeExtensionsMap = new Map<string, IActiveExtensionInfo>();
    for (const activeExtension of options.activeExtensions) {
        if (!activeExtension.isBuiltin && isValidExtensionId(activeExtension.id)) {
            activeExtensionsMap.set(activeExtension.id.toLowerCase(), activeExtension);
        }
    }

    const resultMap = new Map<string, IExtensionProfileEntry>();

    const detectedDirectory = await findExtensionDirectory(options.candidates);
    if (detectedDirectory) {
        const obsoleteFolders = await readObsoleteFolderNames(detectedDirectory);
        const manifestEntries = await readFromManifestFile(detectedDirectory, obsoleteFolders, activeExtensionsMap);

        for (const [key, entry] of manifestEntries) {
            resultMap.set(key, entry);
        }

        if (manifestEntries.size === 0) {
            const scannedEntries = await scanSubdirectoriesForExtensions(
                detectedDirectory,
                obsoleteFolders,
                activeExtensionsMap
            );
            for (const [key, entry] of scannedEntries) {
                resultMap.set(key, entry);
            }
        }
    }

    // Garante que qualquer extensão ativa que não esteja no manifesto em disco também seja incluída
    for (const [lowerCaseId, activeExtension] of activeExtensionsMap) {
        if (!resultMap.has(lowerCaseId)) {
            resultMap.set(lowerCaseId, {
                id: activeExtension.id,
                displayName:
                    activeExtension.displayName ||
                    activeExtension.name ||
                    displayNameFromExtensionId(activeExtension.id),
            });
        }
    }

    // Aplica a lista de exclusão configurada pelo usuário
    const filteredEntries = Array.from(resultMap.values()).filter(
        (entry) => !excludeSet.has(entry.id.toLowerCase())
    );

    filteredEntries.sort((firstEntry, secondEntry) =>
        firstEntry.id.localeCompare(secondEntry.id, "pt-BR", { sensitivity: "base" })
    );

    return filteredEntries;
}
