# Histórico

Registre aqui entregas concluídas, decisões importantes e links para `.metadocs/implemented/`.

## Entradas

### 13 de outubro de 2026 - Publicação permanente por OIDC

- O secret temporário `OVSX_BOOTSTRAP_TOKEN` foi removido dos Repository secrets e sua ausência foi confirmada pela API do GitHub.
- O publisher confiável `LKSFerreira/sync-antigravity`, associado ao workflow `release.yml`, está ativo no Open VSX.
- O workflow de release passou a publicar exclusivamente por OIDC, sem caminhos condicionais ou tokens persistentes do Open VSX.
- A decisão e as evidências foram registradas em [.metadocs/implemented/publicacao_oidc.md](.metadocs/implemented/publicacao_oidc.md).

### 2 de outubro de 2026 - Preparação da publicação pública

- A release candidata foi validada entre uma instalação de origem e outra instalação do Antigravity em computador diferente: login Google, atualização de perfil, aplicação, configurações, atalhos, snippets e confirmação de extensões.
- A validação da restauração e do rollback de layout foi adiada de forma consciente e permanece registrada como dívida técnica em [docs/VALIDACAO-RELEASE-CANDIDATA.md](docs/VALIDACAO-RELEASE-CANDIDATA.md).
- O site público foi disponibilizado em [sync.semsusto.app](https://sync.semsusto.app/), com Política de Privacidade e Termos de Serviço em rotas próprias.
- A propriedade do namespace `lksferreira` foi aprovada no Open VSX. A primeira versão será publicada por bootstrap temporário; depois, o publisher confiável OIDC será cadastrado para as releases seguintes.
