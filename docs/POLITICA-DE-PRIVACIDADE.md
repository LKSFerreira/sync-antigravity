# Política de privacidade - Sync Antigravity

Última atualização: 30 de setembro de 2026.

Versão pública: [sync.semsusto.app/privacidade](https://sync.semsusto.app/privacidade/).

O Sync Antigravity sincroniza, por escolha da pessoa usuária, configurações e preferências do Antigravity IDE entre dispositivos. A extensão é distribuída por `lksferreira` e não possui servidor próprio.

## Dados tratados

Conforme os itens escolhidos na interface, a extensão pode tratar configurações, atalhos, snippets, lista de extensões e dados permitidos de layout. Esses dados são gravados somente no `appDataFolder` privado da conta Google autenticada.

Os tokens OAuth ficam apenas no armazenamento seguro local da IDE (`SecretStorage`). Eles não são enviados ao repositório, a logs, a telemetria ou a um servidor da pessoa mantenedora.

## Dados que não coletamos

A extensão não coleta telemetria, não vende dados, não usa anúncios e não solicita e-mail, nome, foto, contatos ou acesso aos arquivos comuns do Google Drive.

## Permissão Google

O único escopo solicitado é `https://www.googleapis.com/auth/drive.appdata`, usado para criar, ler, atualizar e excluir os dados privados da própria aplicação no Google Drive.

## Retenção e exclusão

Os dados remotos permanecem no `appDataFolder` até que a pessoa usuária os exclua na extensão ou remova os dados do aplicativo nas configurações da Conta Google. Os tokens locais permanecem até o encerramento da sessão ou a invalidação da credencial.

## Segurança

A extensão usa OAuth com PKCE, HTTPS para a API do Google Drive e armazenamento seguro da IDE para tokens. Nenhuma medida de segurança elimina todos os riscos: mantenha o Antigravity, o sistema operacional e as extensões atualizados.

## Contato e alterações

Para dúvidas, solicitações ou relato de problema, abra uma issue no [repositório do Sync Antigravity](https://github.com/LKSFerreira/sync-antigravity/issues). Esta política pode ser atualizada quando a extensão ou exigências de plataforma mudarem; a data de atualização no topo indicará a versão vigente.
