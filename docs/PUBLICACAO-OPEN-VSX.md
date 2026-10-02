# Publicação no Open VSX

O Sync Antigravity é publicado como `lksferreira.sync-antigravity`. A release é automatizada pelo GitHub Actions, com OpenID Connect (OIDC), e não usa token persistente no repositório.

## Pré-requisitos

Antes da primeira tag, confirme:

- O Publisher Agreement da Eclipse Foundation foi assinado.
- O namespace `lksferreira` existe no Open VSX.
- A propriedade do namespace foi solicitada e aprovada.
- Os secrets `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` existem em **GitHub > Settings > Secrets and variables > Actions**.
- A release candidata foi validada conforme [VALIDACAO-RELEASE-CANDIDATA.md](VALIDACAO-RELEASE-CANDIDATA.md), mantendo a dívida técnica de layout registrada.

## Propriedade do namespace

Criar um namespace não o torna automaticamente verificado. No perfil do Open VSX, abra o namespace `lksferreira` e escolha **Claim Ownership**. A solicitação pública deve relacionar:

- namespace: `lksferreira`;
- conta GitHub: `LKSFerreira`;
- repositório: `https://github.com/LKSFerreira/sync-antigravity`.

Enquanto a aprovação estiver pendente, o Open VSX mostra um aviso de namespace não verificado. Aguarde a resposta na issue de solicitação antes de configurar a publicação confiável.

## Publicação confiável pelo GitHub Actions

Depois de aprovada a propriedade:

1. No Open VSX, abra **Settings > Trusted publishers**.
2. Selecione o namespace `lksferreira`.
3. Adicione um publisher do tipo **GitHub Actions**.
4. Informe o repositório `LKSFerreira/sync-antigravity` e o workflow `.github/workflows/release.yml`.
5. Salve a configuração.

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
