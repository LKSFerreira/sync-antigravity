/** Serializa dados para um script embutido sem permitir o encerramento do elemento script. */
export function serializarParaScriptInline(valor: unknown): string {
    return JSON.stringify(valor)
        .replaceAll("<", "\\u003c")
        .replaceAll(">", "\\u003e")
        .replaceAll("&", "\\u0026")
        .replaceAll("\u2028", "\\u2028")
        .replaceAll("\u2029", "\\u2029");
}
