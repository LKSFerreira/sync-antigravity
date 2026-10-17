export type IdiomaSuportado = "en" | "pt-BR";
export type LocalidadeSuportada = "en-US" | "pt-BR";
export type IdiomaHtml = "en" | "pt-BR";

export interface ContextoDeIdioma {
    readonly idiomaDaIde: string;
    readonly idiomaEfetivo: IdiomaSuportado;
    readonly localidade: LocalidadeSuportada;
    readonly idiomaHtml: IdiomaHtml;
}

function normalizarTagDeIdioma(idiomaDaIde: string): string {
    return idiomaDaIde.trim().toLowerCase().replaceAll("_", "-");
}

function idiomaEhPortugues(idiomaNormalizado: string): boolean {
    return idiomaNormalizado.split("-", 1)[0] === "pt";
}

export function resolverContextoDeIdioma(idiomaDaIde: string): Readonly<ContextoDeIdioma> {
    const idiomaNormalizado = normalizarTagDeIdioma(idiomaDaIde);

    if (idiomaEhPortugues(idiomaNormalizado)) {
        return Object.freeze({
            idiomaDaIde,
            idiomaEfetivo: "pt-BR",
            localidade: "pt-BR",
            idiomaHtml: "pt-BR",
        });
    }

    return Object.freeze({
        idiomaDaIde,
        idiomaEfetivo: "en",
        localidade: "en-US",
        idiomaHtml: "en",
    });
}
