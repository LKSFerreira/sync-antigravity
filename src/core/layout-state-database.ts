/** Adaptador SQLite para extrair e preparar alterações de layout permitidas. */

import { readFile } from "fs/promises";
import * as path from "path";
import initSqlJs from "sql.js";
import {
    ILayoutEntry,
    GLOBAL_LAYOUT_KEYS,
    WORKSPACE_LAYOUT_KEYS,
    isAllowedGlobalLayoutKey,
    isAllowedWorkspaceLayoutEntry,
    validateLayoutEntries,
} from "../models/layout-profile";

type EntryValidator = (entry: ILayoutEntry) => boolean;

let sqlPromise: ReturnType<typeof initSqlJs> | undefined;

async function getSql() {
    sqlPromise ??= initSqlJs({
        locateFile: (fileName) => path.join(__dirname, fileName),
    });
    return sqlPromise;
}

/** Lê somente as entradas de layout permitidas de um banco state.vscdb. */
export async function readLayoutEntries(
    databasePath: string,
    allowedKeys: readonly string[],
    validator: EntryValidator
): Promise<ILayoutEntry[]> {
    const SQL = await getSql();
    const database = new SQL.Database(await readFile(databasePath));

    try {
        const entries: ILayoutEntry[] = [];
        for (const key of allowedKeys) {
            const result = database.exec(
                "SELECT key, value FROM ItemTable WHERE key = ?",
                [key]
            )[0];
            if (!result) {
                continue;
            }

            const [storedKey, storedValue] = result.values[0] || [];
            if (typeof storedKey !== "string" || typeof storedValue !== "string") {
                continue;
            }

            const entry = { key: storedKey, value: storedValue };
            if (validator(entry)) {
                entries.push(entry);
            }
        }

        return validateLayoutEntries(entries, validator);
    } finally {
        database.close();
    }
}

/** Lê entradas que atendam a uma expressão SQLite e à validação da extensão. */
async function readLayoutEntriesByPattern(
    databasePath: string,
    pattern: string,
    validator: EntryValidator
): Promise<ILayoutEntry[]> {
    const SQL = await getSql();
    const database = new SQL.Database(await readFile(databasePath));

    try {
        const result = database.exec(
            "SELECT key, value FROM ItemTable WHERE key GLOB ?",
            [pattern]
        )[0];
        if (!result) {
            return [];
        }

        const entries = result.values.flatMap(([key, value]) => {
            if (typeof key !== "string" || typeof value !== "string") {
                return [];
            }
            const entry = { key, value };
            return validator(entry) ? [entry] : [];
        });
        return validateLayoutEntries(entries, validator);
    } finally {
        database.close();
    }
}

/** Prepara em memória uma cópia atualizada do banco, sem escrevê-la no disco. */
export async function applyLayoutEntries(
    databasePath: string,
    entries: ILayoutEntry[],
    validator: EntryValidator
): Promise<Uint8Array> {
    const validatedEntries = validateLayoutEntries(entries, validator);
    const SQL = await getSql();
    const database = new SQL.Database(await readFile(databasePath));

    try {
        database.run("BEGIN IMMEDIATE");
        for (const entry of validatedEntries) {
            database.run(
                "INSERT INTO ItemTable(key, value) VALUES (?, ?) " +
                "ON CONFLICT(key) DO UPDATE SET value = excluded.value",
                [entry.key, entry.value]
            );
        }
        database.run("COMMIT");
        return database.export();
    } catch (error) {
        try {
            database.run("ROLLBACK");
        } catch {
            // Não há transação ativa para reverter.
        }
        throw error;
    } finally {
        database.close();
    }
}

/** Lê as chaves globais de layout aprovadas. */
export function readGlobalLayoutEntries(databasePath: string): Promise<ILayoutEntry[]> {
    return readLayoutEntries(databasePath, [...GLOBAL_LAYOUT_KEYS], (entry) => isAllowedGlobalLayoutKey(entry.key));
}

/** Lê as chaves de layout aprovadas para um workspace. */
export async function readWorkspaceLayoutEntries(databasePath: string): Promise<ILayoutEntry[]> {
    const validator = validateWorkspaceLayoutEntry;
    const exactEntries = await readLayoutEntries(databasePath, [...WORKSPACE_LAYOUT_KEYS], validator);
    const dynamicEntries = (
        await Promise.all([
            readLayoutEntriesByPattern(databasePath, "workbench.view.*.state", validator),
            readLayoutEntriesByPattern(databasePath, "workbench.view.*.numberOfVisibleViews", validator),
            readLayoutEntriesByPattern(databasePath, "workbench.panel.*.numberOfVisibleViews", validator),
        ])
    ).flat();

    return validateLayoutEntries([...exactEntries, ...dynamicEntries], validator);
}

/** Retorna o validador usado por adaptadores de layout de workspace. */
export function validateWorkspaceLayoutEntry(entry: ILayoutEntry): boolean {
    return isAllowedWorkspaceLayoutEntry(entry);
}
