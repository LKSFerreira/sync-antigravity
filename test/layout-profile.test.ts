import assert from "node:assert/strict";
import test from "node:test";
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
    assert.throws(
        () => createGlobalLayoutDocument([{ key: "workbench.comando.perigoso", value: "true" }]),
        /Entrada de layout inválida/,
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
    assert.throws(
        () => validateLayoutEntries([
            { key: "workbench.sideBar.size", value: "200" },
            { key: "workbench.sideBar.size", value: "300" },
        ], (entry) => isAllowedGlobalLayoutKey(entry.key)),
        /Entrada de layout inválida/,
    );
    assert.throws(
        () => createWorkspaceLayout("curto", "", []),
        /Identificador ou nome de workspace inválido/,
    );
});

test("normaliza coleções de workspaces e rejeita duplicidades", () => {
    const first = createWorkspaceLayout("b".repeat(32), "Primeiro", []);
    const second = createWorkspaceLayout("c".repeat(32), "Segundo", []);
    assert.equal(createWorkspaceLayoutsDocument([]), undefined);
    assert.equal(createWorkspaceLayoutsDocument([first, second])?.layouts.length, 2);
    assert.throws(
        () => normalizeWorkspaceLayouts([first, { ...first, label: "Duplicado" }]),
        /duplicado/,
    );
    assert.throws(() => normalizeLayoutProfile({ schemaVersion: 2 }), /Versão de layout incompatível/);
});
