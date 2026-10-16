import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import test from "node:test";
import {
    collectInstalledExtensions,
    displayNameFromExtensionId,
    findExtensionDirectory,
    isValidExtensionId,
} from "../src/core/installed-extensions";

test("isValidExtensionId valida identificadores corretos e rejeita formatos inválidos", () => {
    assert.equal(isValidExtensionId("editor.tema-escuro"), true);
    assert.equal(isValidExtensionId("ms-python.python"), true);
    assert.equal(isValidExtensionId("invalido"), false);
    assert.equal(isValidExtensionId("invalido."), false);
    assert.equal(isValidExtensionId(".invalido"), false);
    assert.equal(isValidExtensionId("com espaco.ext"), false);
});

test("displayNameFromExtensionId converte identificadores técnicos em nomes legíveis", () => {
    assert.equal(displayNameFromExtensionId("dracula-theme.theme-dracula"), "Theme Dracula");
    assert.equal(displayNameFromExtensionId("ms-python.python"), "Python");
    assert.equal(displayNameFromExtensionId("ms-toolsai.vscode-jupyter-cell-tags"), "Vscode Jupyter CELL TAGS");
    assert.equal(displayNameFromExtensionId("identificador"), "Identificador");
    assert.equal(displayNameFromExtensionId("csv"), "CSV");
});

test("findExtensionDirectory localiza o primeiro diretório candidato contendo extensions.json", async () => {
    const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "sync-ext-find-"));
    const emptyFolder = path.join(temporaryRoot, "vazia");
    const validFolder = path.join(temporaryRoot, "valida");
    const fallbackFolder = path.join(temporaryRoot, "extensions");

    try {
        await mkdir(emptyFolder, { recursive: true });
        await mkdir(validFolder, { recursive: true });
        await mkdir(fallbackFolder, { recursive: true });
        await writeFile(path.join(validFolder, "extensions.json"), "[]", "utf8");

        const detected = await findExtensionDirectory([
            "",
            path.join(temporaryRoot, "inexistente"),
            emptyFolder,
            validFolder,
        ]);

        assert.equal(detected, validFolder);

        // Quando nenhum candidato tiver extensions.json, faz fallback para o primeiro diretório existente
        const fallbackDetected = await findExtensionDirectory([emptyFolder]);
        assert.equal(fallbackDetected, emptyFolder);

        const noneDetected = await findExtensionDirectory([path.join(temporaryRoot, "inexistente")]);
        assert.equal(noneDetected, undefined);
    } finally {
        await rm(temporaryRoot, { recursive: true, force: true });
    }
});

test("collectInstalledExtensions inclui extensões desabilitadas a partir do manifesto em disco", async () => {
    const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "sync-ext-manifest-"));

    try {
        const disabledExtensionDir = path.join(temporaryRoot, "empresa.extensao-desabilitada-1.0.0");
        await mkdir(disabledExtensionDir, { recursive: true });
        await writeFile(
            path.join(disabledExtensionDir, "package.json"),
            JSON.stringify({
                name: "extensao-desabilitada",
                displayName: "Extensão Desabilitada Legal",
                publisher: "empresa",
            }),
            "utf8"
        );

        const disabledWithoutDisplayNameDir = path.join(temporaryRoot, "empresa.extensao-sem-display-1.0.0");
        await mkdir(disabledWithoutDisplayNameDir, { recursive: true });
        await writeFile(
            path.join(disabledWithoutDisplayNameDir, "package.json"),
            JSON.stringify({
                name: "extensao-sem-display",
                publisher: "empresa",
            }),
            "utf8"
        );

        const disabledI18nDir = path.join(temporaryRoot, "empresa.extensao-i18n-1.0.0");
        await mkdir(disabledI18nDir, { recursive: true });
        await writeFile(
            path.join(disabledI18nDir, "package.json"),
            JSON.stringify({
                name: "extensao-i18n",
                displayName: "%ext.displayName%",
                publisher: "empresa",
            }),
            "utf8"
        );

        const manifestContent = [
            {
                identifier: { id: "empresa.extensao-desabilitada" },
                relativeLocation: "empresa.extensao-desabilitada-1.0.0",
            },
            {
                identifier: { id: "empresa.extensao-sem-display" },
                relativeLocation: "empresa.extensao-sem-display-1.0.0",
            },
            {
                identifier: { id: "empresa.extensao-i18n" },
                relativeLocation: "empresa.extensao-i18n-1.0.0",
            },
            {
                identifier: { id: "empresa.extensao-ativa" },
                relativeLocation: "empresa.extensao-ativa-1.0.0",
            },
            {
                identifier: { id: "invalido" },
            },
        ];
        await writeFile(
            path.join(temporaryRoot, "extensions.json"),
            JSON.stringify(manifestContent),
            "utf8"
        );

        // Extensão ativa e uma extensão exclusiva em memória (ex: desenvolvimento local)
        const activeExtensions = [
            {
                id: "empresa.extensao-ativa",
                displayName: "Extensão Ativa",
                isBuiltin: false,
            },
            {
                id: "dev.extensao-em-memoria",
                name: "extensao-em-memoria",
                isBuiltin: false,
            },
            {
                id: "vscode.git",
                displayName: "Git",
                isBuiltin: true,
            },
        ];

        const collected = await collectInstalledExtensions({
            candidates: [temporaryRoot],
            activeExtensions,
            excludeList: [],
        });

        assert.equal(collected.length, 5);

        const disabledEntry = collected.find((item) => item.id === "empresa.extensao-desabilitada");
        assert.ok(disabledEntry, "A extensão desabilitada deve constar na lista sincronizada");
        assert.equal(disabledEntry?.displayName, "Extensão Desabilitada Legal");

        const noDisplayEntry = collected.find((item) => item.id === "empresa.extensao-sem-display");
        assert.ok(noDisplayEntry);
        assert.equal(noDisplayEntry?.displayName, "extensao-sem-display");

        const i18nEntry = collected.find((item) => item.id === "empresa.extensao-i18n");
        assert.ok(i18nEntry, "Extensão com displayName %...% deve fazer fallback para name");
        assert.equal(i18nEntry?.displayName, "extensao-i18n");

        const activeEntry = collected.find((item) => item.id === "empresa.extensao-ativa");
        assert.ok(activeEntry, "A extensão ativa deve constar na lista sincronizada");
        assert.equal(activeEntry?.displayName, "Extensão Ativa");

        const memoryEntry = collected.find((item) => item.id === "dev.extensao-em-memoria");
        assert.ok(memoryEntry, "Extensão ativa em memória deve ser incluída");
        assert.equal(memoryEntry?.displayName, "extensao-em-memoria");
    } finally {
        await rm(temporaryRoot, { recursive: true, force: true });
    }
});

test("collectInstalledExtensions ignora pastas obsoletas e respeita lista de exclusão", async () => {
    const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "sync-ext-obsolete-"));

    try {
        const obsoleteDir = path.join(temporaryRoot, "antiga.extensao-0.9.0");
        const modernDir = path.join(temporaryRoot, "antiga.extensao-1.0.0");
        await mkdir(obsoleteDir, { recursive: true });
        await mkdir(modernDir, { recursive: true });

        await writeFile(
            path.join(temporaryRoot, ".obsolete"),
            JSON.stringify({ "antiga.extensao-0.9.0": true }),
            "utf8"
        );

        await writeFile(
            path.join(temporaryRoot, "extensions.json"),
            JSON.stringify([
                {
                    identifier: { id: "antiga.extensao" },
                    relativeLocation: "antiga.extensao-0.9.0",
                },
                {
                    identifier: { id: "antiga.extensao" },
                    relativeLocation: "antiga.extensao-1.0.0",
                },
                {
                    identifier: { id: "ignorar.esta-extensao" },
                    relativeLocation: "ignorar.esta-extensao-1.0.0",
                },
            ]),
            "utf8"
        );

        const collected = await collectInstalledExtensions({
            candidates: [temporaryRoot],
            activeExtensions: [],
            excludeList: ["ignorar.esta-extensao"],
        });

        assert.equal(collected.length, 1);
        assert.equal(collected[0].id, "antiga.extensao");
    } finally {
        await rm(temporaryRoot, { recursive: true, force: true });
    }
});

test("collectInstalledExtensions faz fallback para varredura de subdiretórios se extensions.json faltar", async () => {
    const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "sync-ext-scan-"));

    try {
        const folder = path.join(temporaryRoot, "autor.desabilitada-sem-manifesto");
        await mkdir(folder, { recursive: true });
        await writeFile(
            path.join(folder, "package.json"),
            JSON.stringify({
                publisher: "autor",
                name: "desabilitada-sem-manifesto",
                displayName: "Fallback Scanner",
            }),
            "utf8"
        );

        // Arquivo solto (não diretório), diretório oculto, diretório com nome inválido, diretório obsoleto
        await writeFile(path.join(temporaryRoot, "arquivo-solto.txt"), "ignorar", "utf8");
        await mkdir(path.join(temporaryRoot, ".oculto"), { recursive: true });

        const obsoleteFolder = path.join(temporaryRoot, "autor.obsoleta-sem-manifesto");
        await mkdir(obsoleteFolder, { recursive: true });
        await writeFile(
            path.join(temporaryRoot, ".obsolete"),
            JSON.stringify({ "autor.obsoleta-sem-manifesto": true }),
            "utf8"
        );

        const invalidFolder = path.join(temporaryRoot, "invalido");
        await mkdir(invalidFolder, { recursive: true });
        await writeFile(
            path.join(invalidFolder, "package.json"),
            JSON.stringify({
                publisher: "invalido com espaco",
                name: "sem-id-valido",
            }),
            "utf8"
        );

        const emptyFolder = path.join(temporaryRoot, "pasta-vazia");
        await mkdir(emptyFolder, { recursive: true });

        const collected = await collectInstalledExtensions({
            candidates: [temporaryRoot],
            activeExtensions: [],
            excludeList: [],
        });

        assert.equal(collected.length, 1);
        assert.equal(collected[0].id, "autor.desabilitada-sem-manifesto");
        assert.equal(collected[0].displayName, "Fallback Scanner");
    } finally {
        await rm(temporaryRoot, { recursive: true, force: true });
    }
});
