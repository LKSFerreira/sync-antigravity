const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const Module = require("node:module");
const test = require("node:test");

const catalogoBase = require("../l10n/bundle.l10n.json");
const catalogoPtBr = require("../l10n/bundle.l10n.pt-br.json");
let idiomaAtual = "en";

function traduzir(mensagem, parametros = {}) {
    const objeto = typeof mensagem === "object" && mensagem !== null;
    const textoBase = objeto ? mensagem.message : mensagem;
    const chave = objeto && mensagem.comment
        ? `${textoBase}/${mensagem.comment.join("/")}`
        : textoBase;
    const catalogo = idiomaAtual === "pt-BR" ? catalogoPtBr : catalogoBase;
    const entrada = catalogo[chave];
    const modelo = typeof entrada === "object" && entrada !== null ? entrada.message : entrada || textoBase;
    return modelo.replace(/\{([a-zA-Z0-9_]+)\}/g, (trecho, nome) =>
        Object.prototype.hasOwnProperty.call(parametros, nome) ? String(parametros[nome]) : trecho
    );
}

const vscodeSimulado = {
    env: { get language() { return idiomaAtual; } },
    l10n: { t: traduzir },
};
const carregarOriginal = Module._load;
Module._load = function carregarComVscodeSimulado(request, parent, isMain) {
    return request === "vscode"
        ? vscodeSimulado
        : carregarOriginal.call(this, request, parent, isMain);
};

let catalogo;
let localizarErro;
let criarLocalizacaoDaWebview;
let ErroDaExtensao;
try {
    ({ catalogo, localizarErro } = require("../out/src/localizacao/catalogo.js"));
    ({ criarLocalizacaoDaWebview } = require("../out/src/localizacao/textos-webview.js"));
    ({ ErroDaExtensao } = require("../out/src/core/erro-da-extensao.js"));
} finally {
    Module._load = carregarOriginal;
}

test("resolve títulos de criação e aplicação nos idiomas suportados", () => {
    idiomaAtual = "en";
    assert.equal(catalogo.painel.criandoPerfil("Work"), 'Creating "Work"');
    assert.equal(catalogo.painel.aplicandoPerfil("Work"), 'Applying "Work"');

    idiomaAtual = "pt-BR";
    assert.equal(catalogo.painel.criandoPerfil("Trabalho"), 'Criando "Trabalho"');
    assert.equal(catalogo.painel.aplicandoPerfil("Trabalho"), 'Aplicando "Trabalho"');
});

test("resolve Apply e Aplicar inclusive nas variantes de português", () => {
    idiomaAtual = "en";
    assert.equal(criarLocalizacaoDaWebview("en").textos.comum.aplicar, "Apply");

    idiomaAtual = "pt-BR";
    for (const idioma of ["pt", "pt-BR", "pt-PT"]) {
        assert.equal(criarLocalizacaoDaWebview(idioma).textos.comum.aplicar, "Aplicar");
    }
});

test("mantém erros de domínio localizados e protege fallbacks de erros desconhecidos", () => {
    idiomaAtual = "en";
    assert.equal(
        localizarErro(new ErroDaExtensao("DRIVE_NOME_PERFIL_INVALIDO")),
        "The profile name is invalid"
    );
    assert.equal(localizarErro(new Error("access_token=segredo"), "Failed to load data"), "Failed to load data");
    assert.equal(localizarErro(new Error("detalhe técnico")), "An unexpected error occurred");

    for (const erroDesconhecido of [new Error(), "falha", { message: "segredo" }, null, undefined, 42]) {
        assert.equal(localizarErro(erroDesconhecido, "Safe fallback"), "Safe fallback");
    }

    idiomaAtual = "pt-BR";
    assert.equal(localizarErro(new Error("detalhe técnico")), "Ocorreu um erro inesperado");
});

test("impede textos fixos e dependências indevidas nos contratos alterados", () => {
    const provedor = readFileSync("src/providers/dashboard-provider.ts", "utf8");
    const nucleo = readFileSync("src/core/installed-extensions.ts", "utf8");
    const painel = readFileSync("src/webview/dashboard.js", "utf8");

    assert.doesNotMatch(provedor, /title:\s*`(?:Criando|Aplicando)/);
    assert.match(provedor, /catalogo\.painel\.criandoPerfil\(message\.name\)/);
    assert.match(provedor, /catalogo\.painel\.aplicandoPerfil\(pending\.profileName\)/);
    assert.doesNotMatch(nucleo, /from\s+["']vscode["']/);
    assert.doesNotMatch(nucleo, /localeCompare\([^\n]*["']pt-BR["']/);
    assert.match(painel, /document\.createElement\("ul"\)/);
    assert.match(painel, /item\.textContent\s*=\s*extensionLabel\(extensao\)/);
    assert.match(painel, /preencherConteudo/);
    assert.doesNotMatch(painel, /details\s*\+=/);
});

test("preserva links legais e descrição completa nos metadados", () => {
    const configuracao = readFileSync(".github/ISSUE_TEMPLATE/config.yml", "utf8");
    const manifestoPtBr = require("../package.nls.pt-br.json");
    const manifestoPt = require("../package.nls.pt.json");

    assert.match(configuracao, /https:\/\/sync\.semsusto\.app\/privacidade\//);
    assert.match(configuracao, /https:\/\/sync\.semsusto\.app\/termos\//);
    assert.match(manifestoPtBr["extensao.descricao"], /Backup e restauração na nuvem\./);
    assert.deepEqual(manifestoPt, manifestoPtBr);
});
