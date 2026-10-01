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
npm run package:vsix
Get-FileHash artifacts\sync-antigravity.vsix -Algorithm SHA256
```

O teste exige cobertura global mínima de 80%. O último comando cria o artefato que deve ser instalado manualmente para a validação em uma instalação limpa.

## Publicação

Siga o [guia de validação e publicação](GUIA-VALIDACAO-E-PUBLICACAO.md). A publicação de releases usa OpenID Connect (OIDC): o GitHub Actions obtém um token curto do Open VSX durante a execução, sem guardar um token de publicação no repositório.

Após validar a release candidata, crie e envie uma tag versionada:

```powershell
git tag -a vX.Y.Z -m "Release vX.Y.Z"
git push origin vX.Y.Z
```

O GitHub Actions recompila, testa, gera o VSIX e publica o SHA-256. Não crie uma release manualmente.
