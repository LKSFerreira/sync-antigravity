import assert from "node:assert/strict";
import test from "node:test";
import { isSafeSnippetFileName, validateRemoteProfile } from "../src/core/profile-validator";
import { IProfile, ISyncItem } from "../src/models/interfaces";

const ITEMS: ISyncItem[] = [
    { key: "settings", fileName: "settings.json", label: "Configurações", icon: "settings", enabled: true },
    { key: "extensions", fileName: "extensions.json", label: "Extensões", icon: "extensions", enabled: true },
    { key: "snippets", fileName: "snippets.json", label: "Snippets", icon: "symbol-snippet", enabled: true },
    { key: "keybindings", fileName: "keybindings.json", label: "Atalhos", icon: "keyboard", enabled: true },
    { key: "layout", fileName: "layout.json", label: "Layout", icon: "layout", enabled: true },
];

const BASE64_JSON = Buffer.from('{"editor.fontSize":14}', "utf8").toString("base64");

function criarPerfil(data: Record<string, unknown>): IProfile {
    return { profileName: "Perfil de teste", data };
}

test("aceita perfil remoto válido e prepara uma prévia sem escrever arquivos", () => {
    const { profile, preview } = validateRemoteProfile(criarPerfil({
        settings: BASE64_JSON,
        extensions: ["publisher.extensao"],
        snippets: { "javascript.json": BASE64_JSON },
    }), ITEMS);

    assert.deepEqual(profile.data.extensions, ["publisher.extensao"]);
    assert.deepEqual(profile.data.extensionDisplayNames, { "publisher.extensao": "Extensao" });
    assert.equal(Object.keys(profile.data.snippets as Record<string, string>).length, 1);
    assert.equal(preview.items.length, 5);
});

test("aceita configurações, atalhos e layout, inclusive o formato legado de workspace", () => {
    const capturedAt = "2026-09-30T12:00:00.000Z";
    const { profile, preview } = validateRemoteProfile(criarPerfil({
        settings: BASE64_JSON,
        keybindings: BASE64_JSON,
        layout: {
            schemaVersion: 1,
            global: {
                schemaVersion: 1,
                capturedAt,
                entries: [{ key: "workbench.sideBar.size", value: "280" }],
            },
            workspace: {
                schemaVersion: 1,
                capturedAt,
                sourceId: "a".repeat(32),
                label: "Projeto legado",
                entries: [{ key: "workbench.panel.hidden", value: "false" }],
            },
        },
    }), ITEMS);

    assert.equal(profile.data.settings, BASE64_JSON);
    assert.equal(profile.data.keybindings, BASE64_JSON);
    assert.equal(preview.layout?.workspaces[0].label, "Projeto legado");
});

test("rejeita IDs de extensão inválidos ou repetidos antes de qualquer instalação", () => {
    assert.throws(
        () => validateRemoteProfile(criarPerfil({ extensions: ["publisher.extensao", "publisher.extensao"] }), ITEMS),
        /duplicidades/,
    );
    assert.throws(
        () => validateRemoteProfile(criarPerfil({ extensions: ["../maliciosa"] }), ITEMS),
        /ID remoto de extensão inválido/,
    );
});

test("preserva o nome público da extensão e aceita o formato legado", () => {
    const { profile } = validateRemoteProfile(criarPerfil({
        extensions: [
            { id: "charliermarsh.ruff", displayName: "Ruff" },
            "publisher.extensao-legada",
        ],
        extensionDisplayNames: {
            "publisher.extensao-legada": "Extensão legada",
        },
    }), ITEMS);

    assert.deepEqual(profile.data.extensions, ["charliermarsh.ruff", "publisher.extensao-legada"]);
    assert.deepEqual(profile.data.extensionDisplayNames, {
        "charliermarsh.ruff": "Ruff",
        "publisher.extensao-legada": "Extensão legada",
    });
    assert.throws(
        () => validateRemoteProfile(criarPerfil({
            extensions: [{ id: "publisher.extensao", displayName: "" }],
        }), ITEMS),
        /Nome remoto de extensão inválido/,
    );
});

test("rejeita snippets com tentativa de travessia de diretório", () => {
    assert.throws(
        () => validateRemoteProfile(criarPerfil({ snippets: { "../fora.json": BASE64_JSON } }), ITEMS),
        /Nome remoto de snippet inválido/,
    );
});

test("rejeita perfis, base64 e itens de sincronização malformados", () => {
    assert.throws(
        () => validateRemoteProfile({ profileName: "inválido", data: [] } as unknown as IProfile, ITEMS),
        /Estrutura de perfil inválida/,
    );
    assert.throws(
        () => validateRemoteProfile(criarPerfil({ settings: "conteúdo inválido" }), ITEMS),
        /Configurações remoto inválido/,
    );
    assert.throws(
        () => validateRemoteProfile(criarPerfil({}), ITEMS),
        /não contém nenhum/,
    );
    assert.throws(
        () => validateRemoteProfile(criarPerfil({ desconhecido: [] }), [
            { key: "desconhecido", fileName: "x.json", label: "Desconhecido", icon: "error", enabled: true },
        ]),
        /Item de sincronização desconhecido/,
    );
});

test("valida todas as restrições de nome de snippet", () => {
    assert.equal(isSafeSnippetFileName("typescript.code-snippets"), true);
    for (const name of ["", "../fora.json", "pasta/arquivo.json", "pasta\\arquivo.json", "texto.txt", "a".repeat(129) + ".json"]) {
        assert.equal(isSafeSnippetFileName(name), false);
    }
});
