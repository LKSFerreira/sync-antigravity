import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { setTimeout as aguardar } from "node:timers/promises";
import test from "node:test";

const { applyPendingLayout } = require(path.join(
    process.cwd(),
    "src",
    "core",
    "layout-replacement-helper.js"
)) as { applyPendingLayout(manifestPath: string): Promise<void> };

test("aplica somente o banco de layout permitido quando a IDE libera o arquivo", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "sync-antigravity-layout-helper-"));
    const userDataPath = path.join(root, "User");
    const targetPath = path.join(userDataPath, "globalStorage", "state.vscdb");
    const pendingPath = path.join(root, "pending");
    const sourceName = "global-state.vscdb";

    try {
        await writeFile(targetPath, "original", { encoding: "utf8", flag: "w" });
    } catch {
        await mkdir(path.dirname(targetPath), { recursive: true });
        await writeFile(targetPath, "original", "utf8");
    }

    await mkdir(pendingPath, { recursive: true });
    await writeFile(path.join(pendingPath, sourceName), "atualizado", "utf8");
    const manifestPath = path.join(pendingPath, "manifest.json");
    await writeFile(manifestPath, JSON.stringify({
        schemaVersion: 1,
        userDataPath,
        replacements: [{ sourceName, targetPath }],
    }), "utf8");

    await applyPendingLayout(manifestPath);

    assert.equal(await readFile(targetPath, "utf8"), "atualizado");
    await assert.rejects(readFile(manifestPath));
    await assert.rejects(readFile(path.join(pendingPath, sourceName)));
    await rm(root, { recursive: true, force: true });
});

test("aplica banco de workspace somente no diretório permitido", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "sync-antigravity-layout-workspace-"));
    const userDataPath = path.join(root, "User");
    const workspaceId = "a".repeat(32);
    const targetPath = path.join(userDataPath, "workspaceStorage", workspaceId, "state.vscdb");
    const pendingPath = path.join(root, "pending");
    const sourceName = `workspace-${workspaceId}.vscdb`;

    await mkdir(path.dirname(targetPath), { recursive: true });
    await writeFile(targetPath, "original", "utf8");
    await mkdir(pendingPath, { recursive: true });
    await writeFile(path.join(pendingPath, sourceName), "atualizado", "utf8");
    const manifestPath = path.join(pendingPath, "manifest.json");
    await writeFile(manifestPath, JSON.stringify({
        schemaVersion: 1,
        userDataPath,
        replacements: [{ sourceName, targetPath }],
    }), "utf8");

    try {
        await applyPendingLayout(manifestPath);
        assert.equal(await readFile(targetPath, "utf8"), "atualizado");
    } finally {
        await rm(root, { recursive: true, force: true });
    }
});

test("rejeita manifesto de substituição estruturalmente inválido", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "sync-antigravity-layout-invalid-"));
    const manifestPath = path.join(root, "manifest.json");
    await writeFile(manifestPath, JSON.stringify({ schemaVersion: 2, replacements: [] }), "utf8");

    try {
        await assert.rejects(
            applyPendingLayout(manifestPath),
            /Manifesto de layout pendente inválido/,
        );
    } finally {
        await rm(root, { recursive: true, force: true });
    }
});

test("rejeita origem ou destino fora do contrato de substituição", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "sync-antigravity-layout-target-"));
    const userDataPath = path.join(root, "User");
    const manifestPath = path.join(root, "manifest.json");

    try {
        for (const replacement of [
            {
                sourceName: "arquivo-invalido.vscdb",
                targetPath: path.join(userDataPath, "globalStorage", "state.vscdb"),
            },
            {
                sourceName: "global-state.vscdb",
                targetPath: path.join(root, "fora", "state.vscdb"),
            },
        ]) {
            await writeFile(manifestPath, JSON.stringify({
                schemaVersion: 1,
                userDataPath,
                replacements: [replacement],
            }), "utf8");
            await assert.rejects(
                applyPendingLayout(manifestPath),
                /Destino de layout pendente inválido/,
            );
        }
    } finally {
        await rm(root, { recursive: true, force: true });
    }
});

test("propaga erro não recuperável ao substituir arquivo ausente", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "sync-antigravity-layout-missing-"));
    const userDataPath = path.join(root, "User");
    const targetPath = path.join(userDataPath, "globalStorage", "state.vscdb");
    const manifestPath = path.join(root, "manifest.json");

    await mkdir(path.dirname(targetPath), { recursive: true });
    await writeFile(targetPath, "original", "utf8");
    await writeFile(manifestPath, JSON.stringify({
        schemaVersion: 1,
        userDataPath,
        replacements: [{ sourceName: "global-state.vscdb", targetPath }],
    }), "utf8");

    try {
        await assert.rejects(
            applyPendingLayout(manifestPath),
            (error: NodeJS.ErrnoException) => error.code === "ENOENT",
        );
        assert.equal(await readFile(targetPath, "utf8"), "original");
    } finally {
        await rm(root, { recursive: true, force: true });
    }
});

test("repete a substituição após bloqueio transitório do destino", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "sync-antigravity-layout-retry-"));
    const userDataPath = path.join(root, "User");
    const targetPath = path.join(userDataPath, "globalStorage", "state.vscdb");
    const pendingPath = path.join(root, "pending");
    const sourcePath = path.join(pendingPath, "global-state.vscdb");
    const manifestPath = path.join(pendingPath, "manifest.json");

    await mkdir(sourcePath, { recursive: true });
    await writeFile(path.join(sourcePath, "conteudo"), "atualizado", "utf8");
    await mkdir(targetPath, { recursive: true });
    await writeFile(path.join(targetPath, "bloqueio"), "ocupado", "utf8");
    await writeFile(manifestPath, JSON.stringify({
        schemaVersion: 1,
        userDataPath,
        replacements: [{ sourceName: "global-state.vscdb", targetPath }],
    }), "utf8");

    const liberarDestino = aguardar(100).then(() => rm(targetPath, { recursive: true, force: true }));
    try {
        await applyPendingLayout(manifestPath);
        await liberarDestino;
        assert.equal(await readFile(path.join(targetPath, "conteudo"), "utf8"), "atualizado");
    } finally {
        await liberarDestino;
        await rm(root, { recursive: true, force: true });
    }
});

test("retorna falha legível quando executado pela linha de comando", () => {
    const helperPath = path.join(process.cwd(), "src", "core", "layout-replacement-helper.js");
    const result = spawnSync(process.execPath, [helperPath, path.join(os.tmpdir(), "manifesto-ausente.json")], {
        encoding: "utf8",
    });

    assert.equal(result.status, 1);
    assert.match(result.stderr, /ENOENT/);
});
