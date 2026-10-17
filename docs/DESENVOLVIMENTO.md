# Desenvolvimento do Sync Antigravity

Este guia é destinado a quem pretende contribuir, testar alterações ou preparar uma release. A instalação e o uso da extensão estão explicados no [README](../README.md).

## Pré-requisitos

- Node.js 20 ou superior.
- Antigravity IDE, para testes manuais.
- Um Client ID OAuth próprio do Google Cloud, do tipo **Aplicativo para computador**.

## Preparação

```powershell
git clone https://github.com/LKSFerreira/sync-antigravity.git
cd sync-antigravity
npm ci
Copy-Item .env.example .env
```

Preencha `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` no `.env`, usando os campos `client_id` e `client_secret` do JSON do cliente OAuth desktop. Esse arquivo é local, está no `.gitignore` e nunca deve ser publicado. No fluxo desktop, esse valor técnico é compilado no VSIX porque o Google o exige; ele não substitui o PKCE nem protege tokens de pessoas usuárias.

## Executar durante o desenvolvimento

No Antigravity, abra a pasta do repositório e pressione `F5`. Isso inicia um Host de Desenvolvimento de Extensão, isolado da instalação normal.

Para recompilar ao alterar arquivos:

```powershell
npm run watch
```

## Verificações obrigatórias

```powershell
npm test
npm run l10n:check
npm run package:vsix
Get-FileHash artifacts\sync-antigravity.vsix -Algorithm SHA256
```

O teste exige cobertura global mínima de 95% para linhas, statements e funções e de 90% para branches nos módulos críticos medidos. O último comando cria o artefato que deve ser instalado manualmente para a validação em uma instalação limpa.

## Localização da extensão

O inglês é o idioma-base. Qualquer código cuja subtag primária seja `pt` é apresentado em pt-BR; demais idiomas não suportados usam inglês. O idioma é obtido da IDE e nunca é gravado nos perfis nem sincronizado pelo Google Drive.

Arquivos principais:

- `package.nls.json`: manifesto-base em inglês;
- `package.nls.pt-br.json`: tradução canônica do manifesto;
- `l10n/bundle.l10n.json`: catálogo de runtime extraído do código;
- `l10n/bundle.l10n.pt-br.json`: tradução canônica do runtime;
- `package.nls.pt.json` e `l10n/bundle.l10n.pt.json`: aliases gerados para cobrir qualquer variante de português;
- `src/localizacao/catalogo.ts`: adaptador usado no Extension Host;
- `src/localizacao/textos-webview.ts`: contrato único dos textos estáticos e dinâmicos do painel;
- `src/webview/localizacao.js`: helper puro de leitura, interpolação e plural;
- `src/localizacao/idioma.ts`: normalização testável do idioma efetivo.

Para adicionar ou alterar uma mensagem de runtime:

1. declare a mensagem-base em inglês por uma chamada direta a `vscode.l10n.t`;
2. use `comment` quando o mesmo texto-base puder ter sentidos diferentes;
3. execute `npm run l10n:export`;
4. traduza a nova chave em `l10n/bundle.l10n.pt-br.json`, preservando todos os placeholders;
5. execute `npm run l10n:sync-pt` para regenerar os aliases, sem editá-los manualmente;
6. execute `npm run l10n:check` e `npm test`.

Os catálogos aceitam somente texto, sem HTML. A webview escapa cada tradução conforme o contexto, e dados inseridos em scripts inline passam por serialização segura. Erros de domínio devem usar `ErroDaExtensao`, com código estável e parâmetros seguros; a conversão para texto ocorre apenas na camada de apresentação.

Antes de publicar, use as configurações F5 **Executar extensão - inglês**, **Executar extensão - pt-BR**, **Executar extensão - pt-PT como pt-BR** e **Executar extensão - fallback espanhol**. Confirme o manifesto, os comandos, o painel, o OAuth, as datas, a ordenação e o fallback em inglês após recarregar a IDE.

## Publicação

Siga o [guia de validação e publicação](GUIA-VALIDACAO-E-PUBLICACAO.md). O bootstrap da versão `v0.7.17` foi encerrado, o token temporário foi removido e o workflow `.github/workflows/release.yml` publica exclusivamente por OpenID Connect (OIDC), sem token persistente do Open VSX.

Após validar a release candidata, crie e envie uma tag versionada:

```powershell
git tag -a vX.Y.Z -m "Release vX.Y.Z"
git push origin vX.Y.Z
```

O GitHub Actions recompila, testa, gera o VSIX e publica o SHA-256. Não crie uma release manualmente.
