# Publicação no Open VSX

O Sync Antigravity é publicado como `lksferreira.sync-antigravity`. A release é automatizada pelo GitHub Actions, com OpenID Connect (OIDC), e não usa token persistente no repositório.

## Estado permanente da publicação

O bootstrap foi concluído na versão `v0.7.17`. Em 13 de outubro de 2026, a ausência do secret `OVSX_BOOTSTRAP_TOKEN` foi confirmada pela API do GitHub, e o publisher confiável abaixo estava ativo no Open VSX:

- namespace: `lksferreira`;
- conta ou organização: `LKSFerreira`;
- repositório: `sync-antigravity`;
- workflow: `release.yml`;
- ambiente: não configurado.

O workflow publica exclusivamente por OpenID Connect. Não recrie `OVSX_BOOTSTRAP_TOKEN`, `OVSX_PAT` ou outro token persistente para releases normais. Os únicos Repository secrets exigidos pelo build são `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET`.

## Propriedade do namespace

O namespace `lksferreira` teve sua propriedade aprovada e aparece como verificado no Open VSX. A comprovação relacionou:

- namespace: `lksferreira`;
- conta GitHub: `LKSFerreira`;
- repositório: `https://github.com/LKSFerreira/sync-antigravity`.

## Histórico do bootstrap

O Open VSX exigia uma extensão ativa antes de permitir o cadastro do publisher confiável. Por isso, `v0.7.17` foi publicada uma única vez com um token temporário.

Esse caminho foi removido de `.github/workflows/release.yml` e não faz mais parte do procedimento operacional. Se a publicação OIDC falhar, corrija o vínculo do publisher confiável; não restaure o token de bootstrap.

## Publicação confiável pelo GitHub Actions

O vínculo ativo usa estes valores:

1. **Namespace:** `lksferreira`.
2. **Tipo:** GitHub Actions.
3. **Organization or User name:** `LKSFerreira`.
4. **Repository name:** `sync-antigravity`.
5. **Workflow filename:** `release.yml`.
6. **Environment name:** vazio.

O workflow recebe um token OIDC de curta duração no momento da publicação. Não crie nem salve `OVSX_PAT` como secret do GitHub para o deploy normal.

## Publicar uma versão

Depois de cumprir os pré-requisitos:

```powershell
git tag -a vX.Y.Z -m "Release vX.Y.Z"
git push origin vX.Y.Z
```

O workflow `.github/workflows/release.yml` executa `npm ci`, auditoria de dependências, testes, empacotamento, validação do conteúdo do VSIX e o cálculo do SHA-256. Em seguida, publica o mesmo VSIX no Open VSX e cria a release no GitHub com o arquivo `SHA256SUMS`.

Não crie a release manualmente no GitHub nem publique outro VSIX fora do workflow: o objetivo é manter a rastreabilidade entre a tag, o CI, o VSIX e o hash.

## Links públicos do OAuth

O Google Auth Platform usa as páginas públicas abaixo, hospedadas no domínio verificado `semsusto.app`:

- Página inicial: `https://sync.semsusto.app/`
- Política de privacidade: `https://sync.semsusto.app/privacidade/`
- Termos de serviço: `https://sync.semsusto.app/termos/`

Para o procedimento completo, incluindo a validação em instalação limpa e o Branding do Google, consulte [GUIA-VALIDACAO-E-PUBLICACAO.md](GUIA-VALIDACAO-E-PUBLICACAO.md).
