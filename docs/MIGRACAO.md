# Migração para o Sync Antigravity

Esta é a versão independente do projeto, com publisher, identidade visual e projeto Google Cloud próprios.

## Antes de migrar

1. Mantenha uma cópia dos seus arquivos locais de configuração do Antigravity.
2. Registre as extensões e o layout importantes caso precise reproduzi-los manualmente.
3. Instale o VSIX de release candidata em uma instalação ou perfil limpo para a primeira validação.

## Depois de instalar

1. Abra o painel `Sync Antigravity`.
2. Inicie sessão na Conta Google desejada.
3. Confira no consentimento Google se o único escopo é `drive.appdata`.
4. Se existir um perfil, revise a prévia e restaure somente os itens desejados.
5. Caso os perfis da extensão anterior não apareçam, crie um perfil novo nesta versão e envie suas configurações atuais. Não há migração automática entre projetos OAuth diferentes.

## Recuperação

Antes de aplicar configurações, atalhos ou snippets, a extensão cria um backup local transacional. Use o comando `Sync Antigravity: Reverter último layout` para restaurar o layout mais recente quando necessário.
