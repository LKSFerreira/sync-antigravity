const assert = require("node:assert/strict");
const { readdirSync, readFileSync } = require("node:fs");
const { extname, join, resolve } = require("node:path");
const { getL10nJson } = require("@vscode/l10n-dev");

const EXTENSOES_EXTRAIVEIS = new Set([".ts", ".tsx", ".js", ".jsx"]);
const CHAVES_IGUAIS_PERMITIDAS = new Set([
    "extensao.nome",
    "Item",
    "{quantidade} item",
    "{tamanho}",
    "{quantidade} workspace",
    "{quantidade} workspaces",
    "Snippets/Synchronization item name",
    "Layout/Synchronization item name",
]);

function lerJson(caminho) {
    return JSON.parse(readFileSync(resolve(caminho), "utf8"));
}

function listarArquivos(diretorio) {
    return readdirSync(diretorio, { withFileTypes: true })
        .flatMap((entrada) => {
            const caminho = join(diretorio, entrada.name);
            return entrada.isDirectory() ? listarArquivos(caminho) : [caminho];
        });
}

function coletarFontes(diretorio) {
    return listarArquivos(diretorio)
        .filter((caminho) => EXTENSOES_EXTRAIVEIS.has(extname(caminho)))
        .sort()
        .map((caminho) => ({
            extension: extname(caminho),
            contents: readFileSync(caminho, "utf8"),
        }));
}

function obterMensagem(valor) {
    return typeof valor === "string" ? valor : valor.message;
}

function extrairParametros(mensagem) {
    return [...mensagem.matchAll(/\{([A-Za-z0-9_]+)\}/g)]
        .map((resultado) => resultado[1])
        .sort();
}

function validarCatalogo(base, traducao, nome) {
    const chavesBase = Object.keys(base).sort();
    const chavesTraducao = Object.keys(traducao).sort();
    assert.deepEqual(chavesTraducao, chavesBase, `${nome} possui chaves divergentes do catálogo-base`);

    for (const chave of chavesBase) {
        const mensagemBase = obterMensagem(base[chave]);
        const mensagemTraduzida = obterMensagem(traducao[chave]);
        assert.equal(typeof mensagemTraduzida, "string", `${nome}: ${chave} não contém texto`);
        assert.notEqual(mensagemTraduzida.trim(), "", `${nome}: ${chave} está vazia`);
        assert.doesNotMatch(
            mensagemTraduzida,
            /[<>]/,
            `${nome}: ${chave} contém marcação HTML proibida`
        );
        if (mensagemTraduzida === mensagemBase) {
            assert.ok(
                CHAVES_IGUAIS_PERMITIDAS.has(chave),
                `${nome}: ${chave} permaneceu sem tradução`
            );
        }
        assert.deepEqual(
            extrairParametros(mensagemTraduzida),
            extrairParametros(mensagemBase),
            `${nome}: ${chave} possui parâmetros incompatíveis`
        );
    }
}

function coletarPlaceholdersDoManifesto(valor, encontrados = new Set()) {
    if (typeof valor === "string") {
        for (const resultado of valor.matchAll(/^%([^%]+)%$/g)) {
            encontrados.add(resultado[1]);
        }
        return encontrados;
    }

    if (Array.isArray(valor)) {
        for (const item of valor) {
            coletarPlaceholdersDoManifesto(item, encontrados);
        }
        return encontrados;
    }

    if (valor && typeof valor === "object") {
        for (const item of Object.values(valor)) {
            coletarPlaceholdersDoManifesto(item, encontrados);
        }
    }

    return encontrados;
}

function validarManifesto(pacote, pacoteBase) {
    const placeholders = coletarPlaceholdersDoManifesto(pacote);
    assert.notEqual(placeholders.size, 0, "package.json não contém placeholders de localização");

    for (const chave of placeholders) {
        assert.ok(chave in pacoteBase, `package.json referencia a chave de localização ausente: ${chave}`);
    }
}

async function validar() {
    const pacote = lerJson("package.json");
    const pacoteBase = lerJson("package.nls.json");
    const pacotePtBr = lerJson("package.nls.pt-br.json");
    const pacotePt = lerJson("package.nls.pt.json");
    const bundleBase = lerJson("l10n/bundle.l10n.json");
    const bundlePtBr = lerJson("l10n/bundle.l10n.pt-br.json");
    const bundlePt = lerJson("l10n/bundle.l10n.pt.json");
    const bundleExtraido = await getL10nJson(coletarFontes(resolve("src")));

    validarManifesto(pacote, pacoteBase);
    validarCatalogo(pacoteBase, pacotePtBr, "package.nls.pt-br.json");
    validarCatalogo(bundleBase, bundlePtBr, "bundle.l10n.pt-br.json");
    assert.deepEqual(pacotePt, pacotePtBr, "package.nls.pt.json divergiu do catálogo pt-BR canônico");
    assert.deepEqual(bundlePt, bundlePtBr, "bundle.l10n.pt.json divergiu do catálogo pt-BR canônico");
    assert.deepEqual(bundleBase, bundleExtraido, "bundle.l10n.json está diferente da extração atual");

    console.log("Catálogos de localização validados com sucesso.");
}

validar().catch((erro) => {
    console.error(erro instanceof Error ? erro.stack : erro);
    process.exitCode = 1;
});
