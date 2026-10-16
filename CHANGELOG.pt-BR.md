# Changelog

> 🇺🇸 **Prefer to read in English? See the [English changelog](CHANGELOG.md).**

## [0.7.19] - 2026-10-15

### Adicionado

- Detecção e sincronização de extensões instaladas que estejam desabilitadas na IDE, obtidas a partir do manifesto local (`extensions.json`) e varredura de diretórios candidatos em disco.
- Seção interativa de inspeção de extensões na prévia de restauração de perfil, com acordeão expansível, tags de status (`Instalar`, `Remover`, `Presente`) e badges de contagem.

### Corrigido

- A prévia de restauração agora exibe a lista completa de extensões do perfil remoto, eliminando a ambiguidade quando não há extensões pendentes para instalar ou remover.

## [0.7.18] - 2026-10-13

### Alterado

- O README em inglês agora é a apresentação principal da extensão, com um link direto para a versão preservada em português do Brasil.
- As notas de versão agora são mantidas em inglês e português do Brasil.
- A ação **Aplicar** nos cartões de perfil agora usa o verde padrão do projeto.
- O workflow de release agora publica exclusivamente pelo Trusted Publishing do Open VSX com OIDC; o secret temporário de bootstrap foi removido.

## [0.7.17] - 2026-10-04

### Adicionado

- Identidade independente do **Sync Antigravity**, com publisher `lksferreira` e documentação própria.
- Sincronização de layout global e por workspace, com prévia e reversão local.
- Login Google com PKCE, armazenamento seguro de tokens e escopo mínimo `drive.appdata`.
- Testes automatizados, cobertura mínima de 80%, CI, CodeQL, varredura de segredos e empacotamento verificável do VSIX.

### Corrigido

- A confirmação no navegador agora só informa sucesso depois que os tokens OAuth foram recebidos e salvos pela extensão.
- A troca de tokens possui limite de 30 segundos e erros de login são registrados no canal `Sync Antigravity`.
- A barra de status é atualizada imediatamente ao iniciar ou encerrar a sessão.
- O redirecionamento OAuth usa o endereço de loopback `127.0.0.1`, compatível com o fluxo recomendado para aplicativos de computador.
- O cliente OAuth desktop envia o `client_secret` técnico exigido pelo Google na troca e atualização de tokens.
- A página da extensão prioriza instalação e uso; as instruções de desenvolvimento foram movidas para `docs/DESENVOLVIMENTO.md`.
- Corrigido o carregamento do SQLite no VSIX: o adaptador de layout usa o carregador JavaScript distribuído ao lado do WebAssembly, evitando falha ao criar perfis.
- A ação de restauração passou a se chamar **Aplicar** e detecta automaticamente os arquivos da instalação atual do Antigravity, sem permitir a seleção manual de diretórios.
- Corrigida a aplicação de layout no Windows quando o Antigravity mantém `state.vscdb` bloqueado: a troca é programada com segurança para a próxima saída completa da IDE.

### Segurança

- Credenciais locais, prévias e arquivos de desenvolvimento são excluídos explicitamente do VSIX.
- O arquivo `.env` e o JSON de credenciais permanecem fora do Git e do VSIX; o identificador técnico exigido pelo OAuth desktop é compilado no bundle e não é um token de usuário.

### Migração

- Esta distribuição usa projeto Google Cloud e publisher próprios. Após instalar, faça login novamente e valide seus perfis antes de restaurá-los. Consulte [docs/MIGRACAO.md](docs/MIGRACAO.md).

## [0.7.4] - 2026-06-16

### Corrigido
- **Credenciais de build** - Republicação para garantir que as credenciais do Google OAuth sejam incorporadas corretamente ao pacote

## [0.7.3] - 2026-06-15

### Corrigido
- **Colisão de caminhos de configuração** - Corrigido um erro crítico em que `keybindingsPath` podia ser armazenado em cache como o mesmo arquivo de `settingsPath`, fazendo os dados de atalhos sobrescreverem as configurações ao aplicar um perfil
- **Detecção de caminhos entre plataformas** - Adicionada a detecção de caminhos do Windows armazenados em cache no Linux e vice-versa, invalidando automaticamente caminhos obsoletos ao trocar de sistema operacional
- **Criação automática de arquivos de configuração ausentes** - Os arquivos de configuração (`settings.json`, `keybindings.json`) agora são criados automaticamente no caminho padrão quando não existem, em vez de abrir um seletor de arquivos que poderia levar à escolha do arquivo errado

## [0.7.2] - 2026-05-23

### Corrigido
- **Cache obsoleto do caminho de configuração** - Corrigido um erro crítico em que caminhos armazenados em cache do `Antigravity` legado, anterior à versão 2.0, nunca eram invalidados após a migração para o `Antigravity IDE` 2.0+, fazendo operações de sincronização lerem e gravarem silenciosamente no diretório antigo
- **Validação de caminho na inicialização** - Adicionada a verificação `isPathStale()` durante a inicialização para detectar e resolver novamente, de forma automática, caminhos que apontem para o diretório legado `Antigravity/User/` ou que não existam mais no disco

## [0.7.1] - 2026-05-21

### Corrigido
- **Credenciais do cliente Google** - Resolvido um problema em que `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` estavam ausentes do pacote gerado por falta de configuração do ambiente durante o processo de build

## [0.7.0] - 2026-05-20

### Adicionado
- **Compatibilidade com Antigravity IDE 2.0+** - Compatibilidade completa com a grande atualização da IDE do Google

### Alterado
- **Caminho de armazenamento da configuração** - Migração dos caminhos de configuração para `Antigravity IDE` em vez de `Antigravity`, acompanhando as especificações da versão 2.0+
- **Detecção da IDE** - Reconhecimento do aplicativo atualizado para aceitar exclusivamente o novo identificador `"Antigravity IDE"`

## [0.6.0] - 2026-03-08

### Adicionado
- **Sincronização de snippets** - Sincroniza os snippets do usuário (`User/snippets/`) entre dispositivos, agrupados como conteúdo codificado em base64 no `snippets.json`
- **Limpeza de painéis órfãos** - O painel fecha automaticamente quando a extensão reinicia, evitando uma interface sem funcionamento

### Alterado
- **Armazenamento de configurações em base64** - Configurações e atalhos agora são armazenados como base64 bruto em vez de JSON processado, preservando comentários, espaços em branco e sintaxe JSON5
- `getConfigPaths()` foi refatorado para aceitar caminhos relativos, de arquivos ou diretórios, permitindo reutilização entre os tipos de configuração

### Corrigido
- Comentários em `settings.json` e `keybindings.json` agora são **preservados** durante a sincronização; anteriormente eram perdidos na conversão de JSON5 para JSON

### Removido
- Dependência `json5`, que deixou de ser necessária com o armazenamento em base64
- Interfaces `ISettings` e `IKeybinds` não utilizadas

### Alterações incompatíveis
- ⚠️ **Perfis criados na v0.5.0 ou anterior são incompatíveis** - O formato de configurações e atalhos mudou de JSON processado para base64. Exclua os perfis antigos e crie-os novamente

## [0.5.0] - 2026-03-08

### Adicionado
- **Armazenamento de perfis em pastas** - Cada perfil agora é armazenado em uma pasta dedicada com `meta.json`, `settings.json`, `extensions.json` e `keybindings.json`
- **Modal de progresso da sincronização** - Exibição do progresso em tempo real, com estado por etapa, barra de progresso animada e fechamento automático ao concluir
- **Modal de confirmação da sincronização de extensões** - Modal na webview que lista as extensões a instalar ou remover antes da aplicação, substituindo o diálogo nativo do VS Code
- **Seleção de itens de sincronização** - Permite escolher os itens a sincronizar, como configurações, extensões e atalhos, ao criar, enviar ou aplicar perfis usando modais com caixas de seleção
- **Arquitetura de sincronização extensível** - Padrão de registro `ISyncItem` que permite adicionar novos tipos de dados de sincronização no futuro
- **Metadados de sincronização na raiz** - `sync-meta.json` central na raiz de `appDataFolder` para listar perfis rapidamente, usando duas chamadas de API em vez de N+1
- **Carregamento progressivo da interface** - O painel aparece imediatamente, enquanto os perfis e dados do aplicativo são carregados progressivamente com indicadores de carregamento
- `FEATURES.md` - Documentação abrangente dos recursos

### Alterado
- O armazenamento de perfis foi reestruturado de arquivos `.json` individuais para um layout baseado em pastas, melhorando a extensibilidade
- O explorador de dados do aplicativo agora mostra corretamente apenas os filhos diretos no nível raiz
- A confirmação da sincronização de extensões foi movida do diálogo nativo do sistema operacional para um modal temático na webview com uma lista detalhada
- O modal de progresso da sincronização fica bloqueado durante a operação e não pode ser fechado antes da conclusão ou de um erro
- Os botões de atualização agora giram durante o carregamento dos dados e param quando ele termina
- O explorador de dados do aplicativo mostra um indicador enquanto busca os arquivos

### Alterações incompatíveis
- ⚠️ **Perfis criados na v0.4.0 ou anterior são incompatíveis** - Exclua os perfis antigos e crie-os novamente

## [0.4.0] - 2026-03-08

### Adicionado
- **Explorador de dados do aplicativo** - Permite navegar por todos os arquivos e pastas de `appDataFolder` do Google Drive diretamente no painel
- Navegação por pastas com clique duplo para entrar, trilha de navegação e botão de retorno
- Modal de prévia de arquivos JSON e de texto, com exibição formatada
- Lista paginada de arquivos com controles Anterior e Próximo, exibindo 20 itens por página
- Indicadores de tipo com código de cores para pasta, JSON, texto e arquivo
- Exibição de metadados do arquivo: nome, tipo, tamanho e data de modificação com segundos

## [0.3.0] - 2026-03-08

### Adicionado
- Painel completo em webview, substituindo o antigo menu da paleta de comandos
- Sistema de modais personalizados para confirmação e entrada, com desfoque de fundo, suporte ao teclado e animações
- Notificações toast aprimoradas, com botão de fechar, barra de progresso e animação de entrada
- Exibição do avatar do perfil Google no cabeçalho e no cartão da conta
- Escopos OAuth `userinfo.email` e `userinfo.profile` para obter os dados da conta
- Arquivo de regras do projeto que exigia textos apenas em inglês para acessibilidade global

### Alterado
- Simplificação para um único comando: `Antigravity Sync: Open Dashboard`
- Todos os textos visíveis ao usuário foram traduzidos do vietnamita para o inglês
- As confirmações de logout e exclusão agora usam modais na webview em vez dos diálogos nativos do VS Code
- A criação de perfil usa um modal de entrada na webview em vez de `vscode.window.showInputBox`
- A solicitação para recarregar depois de aplicar um perfil usa um modal na webview em vez de uma notificação nativa
- O clique na barra de status abre o painel diretamente, sem menu
- Cancelar o seletor de arquivos não exibe mais uma notificação de erro indevida

### Removido
- Todos os comandos individuais de login, logout, criação, aplicação, atualização e exclusão de perfil, exibição de logs e definição de caminhos
- Sistema de menu `QuickPick`
- Textos da interface em vietnamita

## [0.2.0] - 2026-03-08

### Alterado
- **Armazenamento**: migração dos GitHub Gists para o Google Drive (`appDataFolder`)
- **Autenticação**: substituição do token do GitHub pelo Google OAuth 2.0
- **Escopo**: foco exclusivo no Antigravity IDE, com aviso em outros editores
- **Dependências**: remoção do `axios`, usando o módulo nativo `https` do Node.js

### Adicionado
- Comandos de login e logout pelo Google OAuth
- Armazenamento seguro de tokens por `SecretStorage`, com criptografia no nível do sistema operacional
- Atualização automática de token, com expiração em uma hora e transparente ao usuário
- Solicitação de novo login quando o token de atualização é revogado
- Diálogo de aviso para IDEs diferentes do Antigravity
- Alternativas de vários caminhos para detectar os arquivos de configuração, usando `APPDATA` e `USERPROFILE`
- Injeção de credenciais no momento do build por `.env` e `webpack DefinePlugin`, mantendo as credenciais fora do código-fonte

### Removido
- Armazenamento em GitHub Gists
- Exigência de autenticação pelo GitHub
- Compatibilidade com vários editores: VS Code, Cursor e VS Code Insiders
- Dependência `axios`

## [0.1.0] - 2026-03-08

### Adicionado
- Versão inicial
- Sincronização de configurações, atalhos e extensões pelos GitHub Gists
- Compatibilidade com vários editores: Antigravity, VS Code, Cursor e VS Code Insiders
- Gerenciamento de perfis: criar, aplicar, atualizar e excluir
- Compatibilidade entre plataformas: Windows, macOS e Linux
- Autenticação integrada pelo GitHub OAuth
- Menu de acesso rápido na barra de status
