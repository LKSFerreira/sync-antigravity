const assert = require("node:assert/strict");
const test = require("node:test");
const { criarLocalizador } = require("../src/webview/localizacao.js");

function criarContrato(localidade = "pt-BR") {
    return {
        localidade,
        textos: {
            saudacao: "Olá, {nome}!",
            contagem: {
                singular: "{quantidade} item",
                plural: "{quantidade} itens",
            },
        },
    };
}

test("interpola parâmetros nomeados sem executar conteúdo", () => {
    const { t } = criarLocalizador(criarContrato());

    assert.equal(t("saudacao", { nome: "<script>" }), "Olá, <script>!");
    assert.equal(t("saudacao"), "Olá, {nome}!");
    assert.equal(t("chave.ausente"), "[chave.ausente]");
});

test("seleciona plural pela localidade efetiva", () => {
    const { tp } = criarLocalizador(criarContrato());

    assert.equal(tp("contagem.singular", "contagem.plural", 1), "1 item");
    assert.equal(tp("contagem.singular", "contagem.plural", 0), "0 itens");
    assert.equal(tp("contagem.singular", "contagem.plural", 2), "2 itens");
});

test("expõe formatadores consistentes e rejeita contrato inválido", () => {
    const { comparador, formatadorDecimal } = criarLocalizador(criarContrato("pt-BR"));

    assert.equal(comparador.compare("a", "B") < 0, true);
    assert.equal(formatadorDecimal.format(1.5), "1,5");
    assert.throws(() => criarLocalizador(null), /contrato de localização/);
});

test("usa inglês como localidade defensiva quando o contrato não a informa", () => {
    const contrato = criarContrato();
    delete contrato.localidade;

    const { formatadorDecimal } = criarLocalizador(contrato);

    assert.equal(formatadorDecimal.format(1.5), "1.5");
});
