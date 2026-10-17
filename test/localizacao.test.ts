import assert from "node:assert/strict";
import test from "node:test";
import { resolverContextoDeIdioma } from "../src/localizacao/idioma";
import { serializarParaScriptInline } from "../src/localizacao/serializacao-webview";
import { DEFAULT_SYNC_ITEM_DEFINITIONS } from "../src/models/interfaces";

const VARIANTES_DE_PORTUGUES = [
    "pt",
    "pt-BR",
    "pt-br",
    "PT-BR",
    "pt_PT",
    "pt-PT",
    "pt-AO",
    "  PT_mz  ",
];

test("resolverContextoDeIdioma direciona toda variante de português para pt-BR", () => {
    for (const idiomaDaIde of VARIANTES_DE_PORTUGUES) {
        assert.deepEqual(resolverContextoDeIdioma(idiomaDaIde), {
            idiomaDaIde,
            idiomaEfetivo: "pt-BR",
            localidade: "pt-BR",
            idiomaHtml: "pt-BR",
        });
    }
});

test("resolverContextoDeIdioma mantém inglês e idiomas não suportados no fallback inglês", () => {
    for (const idiomaDaIde of ["en", "en-US", "en-GB", "es", "fr", "de", "ja", "zh-CN", "", "  "]) {
        assert.deepEqual(resolverContextoDeIdioma(idiomaDaIde), {
            idiomaDaIde,
            idiomaEfetivo: "en",
            localidade: "en-US",
            idiomaHtml: "en",
        });
    }
});

test("resolverContextoDeIdioma retorna um contexto imutável", () => {
    assert.equal(Object.isFrozen(resolverContextoDeIdioma("pt-BR")), true);
});

test("serializa o contrato da webview sem permitir encerramento do script", () => {
    const serializado = serializarParaScriptInline({ texto: "</script><script>alert('&')</script>\u2028" });

    assert.equal(serializado.includes("<"), false);
    assert.equal(serializado.includes(">"), false);
    assert.equal(serializado.includes("&"), false);
    assert.equal(serializado.includes("\u2028"), false);
    assert.deepEqual(JSON.parse(serializado), { texto: "</script><script>alert('&')</script>\u2028" });
});

test("mantém os rótulos fora das definições técnicas de sincronização", () => {
    assert.deepEqual(DEFAULT_SYNC_ITEM_DEFINITIONS.map((item) => item.key), [
        "settings",
        "extensions",
        "keybindings",
        "snippets",
        "layout",
    ]);
    for (const item of DEFAULT_SYNC_ITEM_DEFINITIONS) {
        assert.equal(Object.prototype.hasOwnProperty.call(item, "label"), false);
    }
});
