const { copyFileSync } = require("node:fs");
const { resolve } = require("node:path");

const ALIASES_DE_PORTUGUES = [
    ["package.nls.pt-br.json", "package.nls.pt.json"],
    ["l10n/bundle.l10n.pt-br.json", "l10n/bundle.l10n.pt.json"],
];

for (const [origem, destino] of ALIASES_DE_PORTUGUES) {
    copyFileSync(resolve(origem), resolve(destino));
}

console.log("Aliases genéricos de português sincronizados com os catálogos pt-BR.");
