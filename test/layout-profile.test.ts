import assert from "node:assert/strict";
import test from "node:test";
import { CodigoErroDaExtensao, ErroDaExtensao } from "../src/core/erro-da-extensao";
import {
    createGlobalLayoutDocument,
    createWorkspaceLayoutsDocument,
    createWorkspaceLayout,
    isAllowedGlobalLayoutKey,
    isAllowedWorkspaceLayoutEntry,
    normalizeLayoutProfile,
    normalizeWorkspaceLayouts,
    validateLayoutEntries,
} from "../src/models/layout-profile";

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

test("normaliza um perfil de layout com chaves permitidas", () => {
    const global = createGlobalLayoutDocument([
        { key: "workbench.sideBar.size", value: "300" },
    ]);
    const workspace = createWorkspaceLayout("a".repeat(32), "Projeto", [
        { key: "workbench.panel.hidden", value: "false" },
    ]);

    const profile = normalizeLayoutProfile({
        schemaVersion: 1,
        global,
        workspaces: {
            schemaVersion: 1,
            capturedAt: global.capturedAt,
            layouts: [workspace],
        },
    });

    assert.equal(profile.global.entries[0].key, "workbench.sideBar.size");
    assert.equal(profile.workspaces?.layouts[0].label, "Projeto");
});

test("rejeita chaves de layout que não pertencem à lista permitida", () => {
    assertErroDaExtensao(
        () => createGlobalLayoutDocument([{ key: "workbench.comando.perigoso", value: "true" }]),
        "LAYOUT_ENTRADA_INVALIDA",
    );
});

test("aceita chaves dinâmicas de workspace e rejeita valores ou chaves fora da lista", () => {
    assert.equal(isAllowedGlobalLayoutKey("workbench.sideBar.size"), true);
    assert.equal(isAllowedGlobalLayoutKey("workbench.comando.perigoso"), false);
    assert.equal(isAllowedWorkspaceLayoutEntry({ key: "workbench.view.explorer.state", value: "true" }), true);
    assert.equal(isAllowedWorkspaceLayoutEntry({ key: "workbench.panel.terminal.numberOfVisibleViews", value: "3" }), true);
    assert.equal(isAllowedWorkspaceLayoutEntry({ key: "workbench.view.explorer.state", value: "objeto" }), false);
    assert.equal(isAllowedWorkspaceLayoutEntry({ key: "workbench.view.explorer.executar", value: "true" }), false);
});

test("rejeita entradas duplicadas e workspaces inválidos", () => {
    assertErroDaExtensao(
        () => validateLayoutEntries([
            { key: "workbench.sideBar.size", value: "200" },
            { key: "workbench.sideBar.size", value: "300" },
        ], (entry) => isAllowedGlobalLayoutKey(entry.key)),
        "LAYOUT_ENTRADA_INVALIDA",
    );
    assertErroDaExtensao(
        () => createWorkspaceLayout("curto", "", []),
        "LAYOUT_WORKSPACE_IDENTIFICACAO_INVALIDA",
    );
});

test("normaliza coleções de workspaces e rejeita duplicidades", () => {
    const first = createWorkspaceLayout("b".repeat(32), "Primeiro", []);
    const second = createWorkspaceLayout("c".repeat(32), "Segundo", []);
    assert.equal(createWorkspaceLayoutsDocument([]), undefined);
    assert.equal(createWorkspaceLayoutsDocument([first, second])?.layouts.length, 2);
    assertErroDaExtensao(
        () => normalizeWorkspaceLayouts([first, { ...first, label: "Duplicado" }]),
        "LAYOUT_WORKSPACE_DUPLICADO",
        { workspace: first.sourceId },
    );
    assertErroDaExtensao(
        () => normalizeLayoutProfile({ schemaVersion: 2 }),
        "LAYOUT_VERSAO_INCOMPATIVEL",
    );
});

test("rejeita limites e formas inválidas de entradas de layout", () => {
    assertErroDaExtensao(
        () => validateLayoutEntries(null as unknown as [], () => true),
        "LAYOUT_QUANTIDADE_ENTRADAS_INVALIDA",
        { limite: 128 },
    );
    assertErroDaExtensao(
        () => validateLayoutEntries(
            Array.from({ length: 129 }, (_, indice) => ({ key: `chave-${indice}`, value: "true" })),
            () => true,
        ),
        "LAYOUT_QUANTIDADE_ENTRADAS_INVALIDA",
        { limite: 128 },
    );
    assertErroDaExtensao(
        () => validateLayoutEntries([null] as unknown as [], () => true),
        "LAYOUT_ENTRADA_INVALIDA",
    );
    assertErroDaExtensao(
        () => validateLayoutEntries(
            [{ key: "workbench.sideBar.size", value: "x".repeat(16 * 1024 + 1) }],
            (entry) => isAllowedGlobalLayoutKey(entry.key),
        ),
        "LAYOUT_ENTRADA_INVALIDA",
    );
});

test("rejeita documentos e coleções de workspace incompatíveis", () => {
    const global = createGlobalLayoutDocument([]);
    const workspace = createWorkspaceLayout("d".repeat(32), "Projeto", []);

    assertErroDaExtensao(
        () => normalizeLayoutProfile(null),
        "LAYOUT_DADOS_INVALIDOS",
    );
    assertErroDaExtensao(
        () => normalizeLayoutProfile({
            schemaVersion: 1,
            global: { ...global, capturedAt: "data inválida" },
        }),
        "LAYOUT_DOCUMENTO_INVALIDO",
    );
    assertErroDaExtensao(
        () => normalizeWorkspaceLayouts(null as unknown as []),
        "LAYOUT_QUANTIDADE_WORKSPACES_INVALIDA",
        { limite: 12 },
    );
    assertErroDaExtensao(
        () => normalizeWorkspaceLayouts(Array.from({ length: 13 }, () => workspace)),
        "LAYOUT_QUANTIDADE_WORKSPACES_INVALIDA",
        { limite: 12 },
    );

    for (const workspaces of [
        { schemaVersion: 2, capturedAt: global.capturedAt, layouts: [] },
        { schemaVersion: 1, capturedAt: "data inválida", layouts: [] },
        { schemaVersion: 1, capturedAt: global.capturedAt, layouts: null },
    ]) {
        assertErroDaExtensao(
            () => normalizeLayoutProfile({ schemaVersion: 1, global, workspaces }),
            "LAYOUT_DOCUMENTO_WORKSPACES_INVALIDO",
        );
    }

    assertErroDaExtensao(
        () => createWorkspaceLayout("e".repeat(32), "x".repeat(201), []),
        "LAYOUT_WORKSPACE_IDENTIFICACAO_INVALIDA",
    );
});
