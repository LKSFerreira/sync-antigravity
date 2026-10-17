import assert from "node:assert/strict";
import test from "node:test";
import { CodigoErroDaExtensao, ErroDaExtensao, ehErroDaExtensao } from "../src/core/erro-da-extensao";
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

function assertErroDaExtensao(
    operacao: () => unknown,
    codigo: CodigoErroDaExtensao,
    parametros: Readonly<Record<string, string | number | boolean>> = {}
): void {
    assert.throws(operacao, (error: unknown) => {
        assert.ok(error instanceof ErroDaExtensao);
        assert.equal(error.codigo, codigo);
        assert.deepEqual(error.parametros, parametros);
        return true;
    });
}

test("mantém o contrato de erro estruturado imutável e preserva a causa", () => {
    const cause = new Error("causa técnica");
    const error = new ErroDaExtensao("PERFIL_ITEM_DESCONHECIDO", { item: "teste" }, { cause });

    assert.equal(ehErroDaExtensao(error), true);
    assert.equal(ehErroDaExtensao(new Error("comum")), false);
    assert.equal(error.cause, cause);
    assert.equal(Object.isFrozen(error.parametros), true);
    assert.throws(() => {
        (error.parametros as Record<string, string | number | boolean>).item = "alterado";
    }, TypeError);
});

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
    assert.deepEqual(preview.items.find((item) => item.key === "settings")?.detalhe, {
        tipo: "bytes",
        bytes: Buffer.byteLength(BASE64_JSON, "base64"),
    });
    assert.deepEqual(preview.items.find((item) => item.key === "extensions")?.detalhe, {
        tipo: "extensoes",
        quantidade: 1,
    });
    assert.deepEqual(preview.items.find((item) => item.key === "layout")?.detalhe, { tipo: "ausente" });
    assert.deepEqual(preview.extensions?.profileExtensions, [
        { id: "publisher.extensao", displayName: "Extensao" }
    ]);
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
    assertErroDaExtensao(
        () => validateRemoteProfile(criarPerfil({ extensions: ["publisher.extensao", "publisher.extensao"] }), ITEMS),
        "PERFIL_EXTENSOES_DUPLICADAS",
    );
    assertErroDaExtensao(
        () => validateRemoteProfile(criarPerfil({ extensions: ["../maliciosa"] }), ITEMS),
        "PERFIL_EXTENSAO_ID_INVALIDO",
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
    assertErroDaExtensao(
        () => validateRemoteProfile(criarPerfil({
            extensions: [{ id: "publisher.extensao", displayName: "" }],
        }), ITEMS),
        "PERFIL_EXTENSAO_NOME_INVALIDO",
    );
});

test("rejeita snippets com tentativa de travessia de diretório", () => {
    assertErroDaExtensao(
        () => validateRemoteProfile(criarPerfil({ snippets: { "../fora.json": BASE64_JSON } }), ITEMS),
        "PERFIL_SNIPPET_NOME_INVALIDO",
        { arquivo: "../fora.json" },
    );
});

test("rejeita perfis, base64 e itens de sincronização malformados", () => {
    assertErroDaExtensao(
        () => validateRemoteProfile({ profileName: "inválido", data: [] } as unknown as IProfile, ITEMS),
        "PERFIL_ESTRUTURA_INVALIDA",
    );
    assertErroDaExtensao(
        () => validateRemoteProfile(criarPerfil({ settings: "conteúdo inválido" }), ITEMS),
        "PERFIL_ITEM_REMOTO_INVALIDO",
        { item: "settings" },
    );
    assertErroDaExtensao(
        () => validateRemoteProfile(criarPerfil({}), ITEMS),
        "PERFIL_SEM_ITENS_SELECIONADOS",
    );
    assertErroDaExtensao(
        () => validateRemoteProfile(criarPerfil({ desconhecido: [] }), [
            { key: "desconhecido", fileName: "x.json", label: "Desconhecido", icon: "error", enabled: true },
        ]),
        "PERFIL_ITEM_DESCONHECIDO",
        { item: "desconhecido" },
    );
});

test("valida todas as restrições de nome de snippet", () => {
    assert.equal(isSafeSnippetFileName("typescript.code-snippets"), true);
    for (const name of ["", "../fora.json", "pasta/arquivo.json", "pasta\\arquivo.json", "texto.txt", "a".repeat(129) + ".json"]) {
        assert.equal(isSafeSnippetFileName(name), false);
    }
});

test("rejeita limites excedidos antes de processar conteúdo remoto", () => {
    assertErroDaExtensao(
        () => validateRemoteProfile(criarPerfil({
            extensions: Array.from({ length: 2049 }, (_, indice) => `publisher.extensao-${indice}`),
        }), ITEMS),
        "PERFIL_EXTENSOES_LISTA_INVALIDA",
    );

    const muitosNomes = Object.fromEntries(
        Array.from({ length: 2049 }, (_, indice) => [`publisher.extensao-${indice}`, `Extensão ${indice}`]),
    );
    assertErroDaExtensao(
        () => validateRemoteProfile(criarPerfil({
            extensions: [],
            extensionDisplayNames: muitosNomes,
        }), ITEMS),
        "PERFIL_EXTENSAO_METADADOS_LIMITE_EXCEDIDO",
        { limite: 2048 },
    );

    const muitosSnippets = Object.fromEntries(
        Array.from({ length: 129 }, (_, indice) => [`snippet-${indice}.json`, ""]),
    );
    assertErroDaExtensao(
        () => validateRemoteProfile(criarPerfil({ snippets: muitosSnippets }), ITEMS),
        "PERFIL_SNIPPETS_QUANTIDADE_EXCEDIDA",
        { limite: 128 },
    );

    assertErroDaExtensao(
        () => validateRemoteProfile(criarPerfil({
            layout: { preenchimento: "x".repeat(1024 * 1024) },
        }), ITEMS),
        "PERFIL_LAYOUT_TAMANHO_EXCEDIDO",
        { limiteBytes: 1024 * 1024 },
    );
});

test("rejeita metadados de extensão malformados", () => {
    assertErroDaExtensao(
        () => validateRemoteProfile(criarPerfil({
            extensions: [],
            extensionDisplayNames: [],
        }), ITEMS),
        "PERFIL_EXTENSAO_METADADOS_INVALIDOS",
    );
    assertErroDaExtensao(
        () => validateRemoteProfile(criarPerfil({
            extensions: [],
            extensionDisplayNames: { invalido: "Nome" },
        }), ITEMS),
        "PERFIL_EXTENSAO_ID_INVALIDO",
    );
    assertErroDaExtensao(
        () => validateRemoteProfile(criarPerfil({
            extensions: [],
            extensionDisplayNames: { "publisher.extensao": undefined },
        }), ITEMS),
        "PERFIL_EXTENSAO_NOME_INVALIDO",
    );
    assertErroDaExtensao(
        () => validateRemoteProfile(criarPerfil({ extensions: {} }), ITEMS),
        "PERFIL_EXTENSOES_LISTA_INVALIDA",
    );
});

test("rejeita base64 não canônico e pacotes de snippets inválidos", () => {
    assertErroDaExtensao(
        () => validateRemoteProfile(criarPerfil({ settings: "Zh==" }), ITEMS),
        "PERFIL_ITEM_REMOTO_INVALIDO",
        { item: "settings" },
    );
    assertErroDaExtensao(
        () => validateRemoteProfile(criarPerfil({ snippets: [] }), ITEMS),
        "PERFIL_SNIPPETS_PACOTE_INVALIDO",
    );

    const conteudoNoLimite = Buffer.alloc(256 * 1024).toString("base64");
    const snippetsAcimaDoTotal = Object.fromEntries(
        Array.from({ length: 17 }, (_, indice) => [`snippet-${indice}.json`, conteudoNoLimite]),
    );
    assertErroDaExtensao(
        () => validateRemoteProfile(criarPerfil({ snippets: snippetsAcimaDoTotal }), ITEMS),
        "PERFIL_SNIPPETS_TAMANHO_EXCEDIDO",
        { limiteBytes: 4 * 1024 * 1024 },
    );
});
