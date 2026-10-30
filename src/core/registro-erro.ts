const MARCADOR_REDACTADO = "[redigido]";
const LIMITE_DE_REGISTRO = 16_000;

function redigirTexto(texto: string): string {
    return texto
        .replace(/\bAuthorization\s*:\s*[^\r\n,;]+/gi, `Authorization: ${MARCADOR_REDACTADO}`)
        .replace(/\bBearer\s+[^\s,;]+/gi, `Bearer ${MARCADOR_REDACTADO}`)
        .replace(
            /\b((?:access_token|refresh_token|client_secret|code_verifier|code|state|authorization)\s*[:=]\s*)[^\s,;&]+/gi,
            `$1${MARCADOR_REDACTADO}`
        )
        .replace(/(https?:\/\/[^\s?]*)\?[^\s]*/gi, `$1?${MARCADOR_REDACTADO}`)
        .slice(0, LIMITE_DE_REGISTRO);
}

/** Resume a causa técnica sem serializar objetos potencialmente sensíveis. */
export function resumirErroParaRegistro(error: unknown): string {
    if (error instanceof Error) {
        return redigirTexto(error.stack || `${error.name}: ${error.message}`);
    }
    if (typeof error === "string") {
        return redigirTexto(error);
    }
    return `Valor de erro não escalar (${typeof error})`;
}
