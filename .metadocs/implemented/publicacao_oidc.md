# Publicação permanente por OIDC

## Contexto

A versão `v0.7.17` inaugurou a distribuição `lksferreira.sync-antigravity` no Open VSX. Como o registry exigia uma versão ativa antes do cadastro de um publisher confiável, essa primeira publicação usou temporariamente o Repository secret `OVSX_BOOTSTRAP_TOKEN`.

O bootstrap foi concluído e não integra mais a arquitetura de publicação.

## Estado implementado

- O namespace `lksferreira` está verificado no Open VSX.
- O publisher confiável está associado a `LKSFerreira/sync-antigravity` e ao workflow `release.yml`, sem ambiente configurado.
- O secret `OVSX_BOOTSTRAP_TOKEN` foi removido dos Repository secrets.
- O workflow usa a permissão `id-token: write` e executa `ovsx publish --trusted-publishing` sem caminho alternativo baseado em token persistente.
- Os únicos Repository secrets necessários ao build são `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET`.

Nenhum valor de credencial foi armazenado neste registro.

## Evidências

Em 13 de outubro de 2026:

- a configuração do Open VSX mostrava o publisher confiável ativo para o repositório e workflow esperados;
- a API do GitHub retornou somente `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` na lista de Repository secrets;
- uma segunda consulta confirmou a ausência de `OVSX_BOOTSTRAP_TOKEN` após sua remoção.

## Decisão operacional

Releases futuras devem usar exclusivamente OIDC. Se a publicação falhar, a correção deve ocorrer no vínculo do Trusted Publisher ou nas permissões do workflow. Não deve ser criado um novo token persistente do Open VSX como contingência.

O procedimento de release permanece:

1. validar testes, auditoria de dependências e VSIX;
2. atualizar a versão e os changelogs equivalentes em inglês e pt-BR;
3. criar e enviar a tag correspondente;
4. acompanhar o workflow até a publicação no Open VSX e a criação da GitHub Release.
