import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
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
