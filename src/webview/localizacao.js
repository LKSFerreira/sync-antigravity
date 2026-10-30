// Helper puro de localização compartilhado pela webview e pelos testes em Node.
(function registrarLocalizacao(raiz, fabrica) {
    const api = fabrica();
    if (typeof module === "object" && module.exports) {
        module.exports = api;
    }
    if (raiz) {
        raiz.SyncAntigravityLocalizacao = api;
    }
})(typeof globalThis === "object" ? globalThis : this, function criarApi() {
    "use strict";

    function criarLocalizador(localizacao, registrarDiagnostico = () => undefined) {
        if (!localizacao || typeof localizacao !== "object" || !localizacao.textos) {
            throw new TypeError("O contrato de localização da webview é inválido");
        }

        const localidade = localizacao.localidade || "en-US";
        function t(chave, parametros = {}) {
            let valor = chave.split(".").reduce((atual, parte) => atual?.[parte], localizacao.textos);
            if (valor && typeof valor === "object" && typeof valor.message === "string") {
                valor = valor.message;
            }
            if (typeof valor !== "string") {
                registrarDiagnostico({ tipo: "chave-ausente", chave });
                return `[${chave}]`;
            }
            return valor.replace(/\{([a-zA-Z0-9_]+)\}/g, (trecho, nome) => {
                if (Object.prototype.hasOwnProperty.call(parametros, nome)) {
                    return String(parametros[nome]);
                }
                registrarDiagnostico({ tipo: "parametro-ausente", chave, parametro: nome });
                return trecho;
            });
        }

        function tp(chaveSingular, chavePlural, quantidade, parametros = {}) {
            const chave = quantidade === 1 ? chaveSingular : chavePlural;
            return t(chave, { ...parametros, quantidade });
        }

        return Object.freeze({
            t,
            tp,
            comparador: new Intl.Collator(localidade, { sensitivity: "base" }),
            formatadorDecimal: new Intl.NumberFormat(localidade, { maximumFractionDigits: 1 }),
        });
    }

    return Object.freeze({ criarLocalizador });
});
