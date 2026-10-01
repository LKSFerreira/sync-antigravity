# OAuth e privacidade

O Sync Antigravity sincroniza perfis diretamente entre a instalação local do Antigravity e a conta Google da própria pessoa usuária. A extensão não possui servidor próprio, não encaminha os dados por serviços da pessoa mantenedora e não coleta telemetria.

## Dados tratados

Os perfis podem conter as configurações, atalhos, snippets, lista de extensões e layout que a pessoa escolheu sincronizar. Eles são gravados exclusivamente no `appDataFolder` do Google Drive da conta autenticada.

Os tokens de acesso e de atualização do Google ficam somente no `SecretStorage` da IDE, que usa o armazenamento seguro do sistema operacional. Eles não são adicionados ao perfil, ao log, ao repositório ou ao Google Drive.

A extensão não solicita e-mail, nome, foto do perfil, contatos, arquivos comuns do Drive nem acesso a qualquer outro serviço Google.

## Escopo solicitado

| Escopo | Finalidade |
| --- | --- |
| `https://www.googleapis.com/auth/drive.appdata` | Criar, ler, atualizar e excluir os perfis no espaço privado de dados do aplicativo. |

O `appDataFolder` é um espaço separado do Drive visível e acessível apenas ao aplicativo que o criou. A extensão não solicita `drive`, `drive.file`, `userinfo.email` ou `userinfo.profile`.

## Retenção e exclusão

- Tokens locais permanecem no `SecretStorage` até a pessoa encerrar a sessão pelo painel ou a credencial ser invalidada.
- Os perfis remotos permanecem no `appDataFolder` até serem excluídos pela própria extensão ou até a pessoa remover os dados do aplicativo na conta Google.
- Desinstalar a extensão não dá à extensão acesso aos dados; para remover os perfis remotos, use a função de exclusão no painel antes de desinstalar ou remova o acesso e os dados do aplicativo nas configurações da conta Google.

## Fluxo de autenticação

1. A extensão abre o navegador padrão na tela de consentimento do Google.
2. Para cada login, ela gera um `state` aleatório e um verificador PKCE de alta entropia. O desafio PKCE usa `S256`.
3. O Google redireciona para um servidor temporário em `127.0.0.1`, em uma porta aleatória. A extensão aceita somente `/callback`, confere o `state` e encerra o servidor após uma única resposta, erro ou tempo limite.
4. O código de autorização e o verificador PKCE são enviados por HTTPS ao endpoint de tokens do Google. A resposta é validada antes de ser persistida.
5. Os tokens resultantes são armazenados no `SecretStorage`; a sincronização usa o token de acesso apenas nas chamadas HTTPS à API do Google Drive.

Um aplicativo desktop é um cliente OAuth público: o valor chamado `client_secret` no cliente desktop pode ser extraído do VSIX e não oferece proteção contra cópia. Este projeto OAuth exige esse identificador técnico na troca de tokens; por isso ele é compilado junto do Client ID. Ele **não é** token de usuário, senha de Conta Google nem autorização para acessar dados sem o consentimento OAuth. O PKCE protege a troca do código, e os tokens de cada pessoa ficam no `SecretStorage`.

## Configuração do projeto OAuth do fork

Antes de publicar, a pessoa mantenedora deve concluir estes passos na conta Google que controla o Sync Antigravity:

1. Criar ou selecionar um projeto próprio no Google Cloud, por exemplo `Sync Antigravity`.
2. Configurar a tela de consentimento OAuth, incluindo e-mail de suporte e os dados exigidos pelo Google.
3. Habilitar a Google Drive API para esse projeto.
4. Criar um Client ID OAuth do tipo **Aplicativo para computador**.
5. Copiar `client_id` para `GOOGLE_CLIENT_ID` e `client_secret` para `GOOGLE_CLIENT_SECRET` no `.env` local antes de gerar o VSIX. O `.env` é ignorado pelo Git.
6. Testar o login em uma instalação limpa e, antes da publicação, confirmar que o consentimento mostra somente o escopo `drive.appdata`.

O Client ID e o identificador técnico `client_secret` desse cliente desktop acabam distribuídos no pacote, pois são exigidos pelo fluxo configurado no Google. Nunca os confunda com tokens OAuth: os tokens continuam secretos. O arquivo JSON baixado do Google Cloud e o `.env` permanecem fora do Git e do VSIX.

## Referências oficiais

- [OAuth 2.0 para aplicativos desktop](https://developers.google.com/identity/protocols/oauth2/native-app)
- [Dados específicos do aplicativo no Google Drive](https://developers.google.com/drive/api/guides/appdata)
- [Práticas recomendadas para OAuth](https://developers.google.com/identity/protocols/oauth2/resources/best-practices)
