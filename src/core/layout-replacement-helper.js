"use strict";

const path = require("node:path");
const { readFile, rename, rm } = require("node:fs/promises");

const MAX_ATTEMPTS = 240;
const RETRY_DELAY_MS = 500;

function wait(milliseconds) {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function isAllowedTarget(userDataPath, targetPath) {
    const relative = path.relative(userDataPath, targetPath).replace(/\\/g, "/");
    return relative === "globalStorage/state.vscdb"
        || /^workspaceStorage\/[a-f0-9]{16,128}\/state\.vscdb$/i.test(relative);
}

async function readManifest(manifestPath) {
    const pendingPath = path.dirname(manifestPath);
    const raw = await readFile(manifestPath, "utf8");
    const manifest = JSON.parse(raw);
    if (
        !manifest ||
        manifest.schemaVersion !== 1 ||
        typeof manifest.userDataPath !== "string" ||
        !Array.isArray(manifest.replacements) ||
        manifest.replacements.length === 0
    ) {
        throw new Error("Manifesto de layout pendente inválido");
    }

    return manifest.replacements.map((replacement) => {
        if (
            !replacement ||
            typeof replacement.sourceName !== "string" ||
            typeof replacement.targetPath !== "string" ||
            !/^(global-state|workspace-[a-f0-9]{16,128})\.vscdb$/i.test(replacement.sourceName) ||
            !isAllowedTarget(manifest.userDataPath, replacement.targetPath)
        ) {
            throw new Error("Destino de layout pendente inválido");
        }

        const sourcePath = path.resolve(pendingPath, replacement.sourceName);
        if (path.dirname(sourcePath) !== pendingPath) {
            throw new Error("Arquivo de layout pendente inválido");
        }
        return { sourcePath, targetPath: replacement.targetPath };
    });
}

async function replaceWhenReleased(sourcePath, targetPath) {
    let lastError;
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
        try {
            await rename(sourcePath, targetPath);
            return;
        } catch (error) {
            lastError = error;
            if (!["EPERM", "EBUSY", "EACCES", "ENOTEMPTY"].includes(error?.code)) {
                throw error;
            }
            await wait(RETRY_DELAY_MS);
        }
    }
    throw new Error(`A IDE não liberou o arquivo de layout: ${lastError?.code || "erro desconhecido"}`);
}

async function applyPendingLayout(manifestPath) {
    const replacements = await readManifest(manifestPath);
    for (const replacement of replacements) {
        await replaceWhenReleased(replacement.sourcePath, replacement.targetPath);
    }
    await rm(path.dirname(manifestPath), { recursive: true, force: true });
}

if (require.main === module) {
    applyPendingLayout(process.argv[2]).catch((error) => {
        process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
        process.exitCode = 1;
    });
}

module.exports = { applyPendingLayout };
