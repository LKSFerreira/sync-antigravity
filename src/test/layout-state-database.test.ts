import assert from "node:assert/strict";
import { mkdtemp, copyFile, readFile, rm, writeFile } from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import test from "node:test";
import initSqlJs from "sql.js";
import {
    applyLayoutEntries,
    readGlobalLayoutEntries,
} from "../core/layout-state-database";
import { isAllowedGlobalLayoutKey } from "../models/layout-profile";

async function criarBancoTemporario(): Promise<{ directory: string; databasePath: string }> {
    const directory = await mkdtemp(path.join(os.tmpdir(), "sync-antigravity-test-"));
    const databasePath = path.join(directory, "state.vscdb");
    const SQL = await initSqlJs({
        locateFile: (fileName) => path.join(process.cwd(), "node_modules", "sql.js", "dist", fileName),
    });
    const database = new SQL.Database();
    database.run("CREATE TABLE ItemTable (key TEXT PRIMARY KEY, value TEXT)");
    database.run("INSERT INTO ItemTable(key, value) VALUES (?, ?)", ["workbench.sideBar.size", "220"]);
    await writeFile(databasePath, database.export());
    database.close();
    return { directory, databasePath };
}

test("lê e prepara uma atualização SQLite em memória sem alterar o banco original", async () => {
    const wasmDeOrigem = path.join(process.cwd(), "node_modules", "sql.js", "dist", "sql-wasm.wasm");
    const wasmDeTeste = path.join(__dirname, "..", "core", "sql-wasm.wasm");
    await copyFile(wasmDeOrigem, wasmDeTeste);

    const { directory, databasePath } = await criarBancoTemporario();
    try {
        const original = await readFile(databasePath);
        assert.deepEqual(await readGlobalLayoutEntries(databasePath), [
            { key: "workbench.sideBar.size", value: "220" },
        ]);

        const updated = await applyLayoutEntries(
            databasePath,
            [{ key: "workbench.sideBar.size", value: "340" }],
            (entry) => isAllowedGlobalLayoutKey(entry.key),
        );

        assert.ok(updated.byteLength > 0);
        assert.deepEqual(await readFile(databasePath), original);
    } finally {
        await rm(directory, { recursive: true, force: true });
        await rm(wasmDeTeste, { force: true });
    }
});
