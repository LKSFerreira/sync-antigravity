# Preparação para publicar no Open VSX

Esta etapa será concluída somente depois da validação da release candidata.

## Conta, acordo e namespace

1. Crie uma conta em [eclipse.org](https://accounts.eclipse.org) e preencha o campo de nome de usuário do GitHub com `LKSFerreira`.
2. Em [open-vsx.org](https://open-vsx.org), entre usando a mesma conta GitHub.
3. Abra o perfil: **Settings > Log in with Eclipse**. Leia e assine o **Publisher Agreement**.
4. Crie o namespace `lksferreira` com `npm run openvsx:create-namespace`, depois de definir temporariamente a variável de ambiente `OVSX_PAT`.
5. Confirme que a extensão será identificada como `lksferreira.sync-antigravity`.

Criar o namespace permite publicar. Para que ele apareça como verificado, solicite a propriedade do namespace conforme as [instruções do Open VSX](https://github.com/eclipse-openvsx/openvsx/wiki/Namespace-Access).

## Publicação confiável pelo GitHub Actions

1. Em Open VSX, abra **Settings > Trusted publishers** dentro do namespace `lksferreira`.
2. Adicione um publisher do tipo **GitHub Actions** para o repositório `LKSFerreira/sync-antigravity` e o workflow `.github/workflows/release.yml`.
3. Salve. O workflow solicitará um token OIDC de curta duração a cada publicação.

Não crie nem salve `OVSX_PAT` como secret do GitHub para o deploy normal. O token de acesso pessoal é necessário apenas temporariamente para criar o namespace e deve ser revogado depois dessa operação.

## Links públicos

Antes de colocar o OAuth em produção, informe na plataforma Google estes links públicos, depois que o commit estiver no GitHub:

- `https://github.com/LKSFerreira/sync-antigravity/blob/main/docs/POLITICA-DE-PRIVACIDADE.md`
- `https://github.com/LKSFerreira/sync-antigravity/blob/main/docs/TERMOS-DE-SERVICO.md`

Para o procedimento completo, incluindo a validação em instalação limpa, consulte [GUIA-VALIDACAO-E-PUBLICACAO.md](GUIA-VALIDACAO-E-PUBLICACAO.md).
