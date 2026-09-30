import assert from "node:assert/strict";
import test from "node:test";
import {
    createGlobalLayoutDocument,
    createWorkspaceLayout,
    normalizeLayoutProfile,
} from "../models/layout-profile";

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
