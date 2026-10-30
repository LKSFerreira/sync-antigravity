import assert from "node:assert/strict";
import test from "node:test";
import { resumirErroParaRegistro } from "../src/core/registro-erro";

test("redige credenciais, códigos OAuth e parâmetros de URL no diagnóstico", () => {
    const erro = new Error(
        "Falha access_token=token-secreto refresh_token=renovacao-secreta state=estado-secreto "
        + "https://oauth.example/callback?code=codigo-secreto&client_secret=segredo"
    );

    const registro = resumirErroParaRegistro(erro);

    assert.doesNotMatch(registro, /token-secreto|renovacao-secreta|estado-secreto|codigo-secreto|segredo/);
    assert.match(registro, /\[redigido\]/);
    assert.match(registro, /Error: Falha/);
});

test("redige autorização e evita serializar objetos desconhecidos", () => {
    const autorizacao = resumirErroParaRegistro("Authorization: Bearer token-super-secreto");
    const bearer = resumirErroParaRegistro("Bearer outro-token-super-secreto");
    const objeto = resumirErroParaRegistro({ access_token: "nao-expor", detalhe: "sigiloso" });

    assert.doesNotMatch(autorizacao, /token-super-secreto/);
    assert.equal(autorizacao, "Authorization: [redigido]");
    assert.equal(bearer, "Bearer [redigido]");
    assert.equal(objeto, "Valor de erro não escalar (object)");
    assert.equal(resumirErroParaRegistro(null), "Valor de erro não escalar (object)");
    assert.equal(resumirErroParaRegistro(undefined), "Valor de erro não escalar (undefined)");
});

test("limita registros excessivos sem repetir dados fora do recorte", () => {
    const registro = resumirErroParaRegistro("x".repeat(20_000));

    assert.equal(registro.length, 16_000);
});
