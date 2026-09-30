import assert from "node:assert/strict";
import test from "node:test";
import { validateRemoteProfile } from "../core/profile-validator";
import { IProfile, ISyncItem } from "../models/interfaces";

const ITEMS: ISyncItem[] = [
    { key: "settings", fileName: "settings.json", label: "Configurações", icon: "settings", enabled: true },
    { key: "extensions", fileName: "extensions.json", label: "Extensões", icon: "extensions", enabled: true },
    { key: "snippets", fileName: "snippets.json", label: "Snippets", icon: "symbol-snippet", enabled: true },
];

const BASE64_JSON = Buffer.from('{"editor.fontSize":14}', "utf8").toString("base64");

function criarPerfil(data: Record<string, unknown>): IProfile {
    return { profileName: "Perfil de teste", data };
}

test("aceita perfil remoto válido e prepara uma prévia sem escrever arquivos", () => {
    const { profile, preview } = validateRemoteProfile(criarPerfil({
        settings: BASE64_JSON,
        extensions: ["publisher.extensao"],
        snippets: { "javascript.json": BASE64_JSON },
    }), ITEMS);

    assert.deepEqual(profile.data.extensions, ["publisher.extensao"]);
    assert.equal(Object.keys(profile.data.snippets as Record<string, string>).length, 1);
    assert.equal(preview.items.length, 3);
});

test("rejeita IDs de extensão inválidos ou repetidos antes de qualquer instalação", () => {
    assert.throws(
        () => validateRemoteProfile(criarPerfil({ extensions: ["publisher.extensao", "publisher.extensao"] }), ITEMS),
        /duplicidades/,
    );
    assert.throws(
        () => validateRemoteProfile(criarPerfil({ extensions: ["../maliciosa"] }), ITEMS),
        /ID remoto de extensão inválido/,
    );
});

test("rejeita snippets com tentativa de travessia de diretório", () => {
    assert.throws(
        () => validateRemoteProfile(criarPerfil({ snippets: { "../fora.json": BASE64_JSON } }), ITEMS),
        /Nome remoto de snippet inválido/,
    );
});
