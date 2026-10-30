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

test("extrai mensagem defensivamente quando o valor é um objeto com propriedade message", () => {
    const contrato = {
        localidade: "pt-BR",
        textos: {
            comum: {
                aplicar: { message: "Aplicar", comment: ["Comentário"] },
            },
        },
    };
    const { t } = criarLocalizador(contrato);

    assert.equal(t("comum.aplicar"), "Aplicar");
});

test("diagnostica chave ausente sem incluir dados de sincronização", () => {
    const diagnosticos = [];
    const { t } = criarLocalizador(criarContrato(), (diagnostico) => diagnosticos.push(diagnostico));

    assert.equal(t("perfil.inexistente", { nome: "perfil-sigiloso" }), "[perfil.inexistente]");
    assert.deepEqual(diagnosticos, [{ tipo: "chave-ausente", chave: "perfil.inexistente" }]);
    assert.doesNotMatch(JSON.stringify(diagnosticos), /perfil-sigiloso/);
});

test("diagnostica todos os parâmetros ausentes e preserva seus placeholders", () => {
    const diagnosticos = [];
    const contrato = criarContrato();
    contrato.textos.detalhe = "Perfil {nome} em {pasta}";
    const { t } = criarLocalizador(contrato, (diagnostico) => diagnosticos.push(diagnostico));

    assert.equal(t("detalhe"), "Perfil {nome} em {pasta}");
    assert.deepEqual(diagnosticos, [
        { tipo: "parametro-ausente", chave: "detalhe", parametro: "nome" },
        { tipo: "parametro-ausente", chave: "detalhe", parametro: "pasta" },
    ]);
});

test("não emite diagnóstico para traduções e parâmetros válidos", () => {
    const diagnosticos = [];
    const { t, tp } = criarLocalizador(criarContrato(), (diagnostico) => diagnosticos.push(diagnostico));

    assert.equal(t("saudacao", { nome: "valor-sigiloso" }), "Olá, valor-sigiloso!");
    assert.equal(tp("contagem.singular", "contagem.plural", 2), "2 itens");
    assert.deepEqual(diagnosticos, []);
});
