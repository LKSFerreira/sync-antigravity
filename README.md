# Sync Antigravity

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE.md)
[![GitHub](https://img.shields.io/badge/GitHub-LKSFerreira%2Fsync--antigravity-blue)](https://github.com/LKSFerreira/sync-antigravity)

Sincronize as configurações, extensões, atalhos, snippets e layout do **Antigravity** entre dispositivos usando o **Google Drive**.

> **Fork independente**: mantido por [LKSFerreira](https://github.com/LKSFerreira), derivado de [thotam/antigravity-sync](https://github.com/thotam/antigravity-sync) e distribuído sob a licença MIT.

> **Observação**: esta extensão foi projetada exclusivamente para o [Antigravity IDE](https://www.antigravity.google/). Um aviso será exibido se ela for usada em outros editores.

## Recursos

- **Painel completo**: painel moderno em Webview com informações da conta, gerenciamento de perfis e ações rápidas
- **Perfis baseados em pastas**: cada perfil fica em uma pasta própria, com arquivos de configuração separados para facilitar a extensibilidade
- **Seleção de itens**: escolha, em cada operação, o que sincronizar: configurações, extensões, atalhos, snippets e layout
- **Layout portátil**: preserva somente chaves visuais permitidas, mostra uma prévia antes de aplicar e mantém backups locais reversíveis
- **Modal de progresso**: acompanhamento em tempo real, etapa por etapa, com barra de progresso animada
- **Confirmação de extensões**: modal na Webview mostra extensões a instalar ou remover antes da aplicação
- **Carregamento progressivo**: o painel aparece imediatamente e os dados são carregados gradualmente
- **Explorador de dados do aplicativo**: navegue por arquivos e pastas em appDataFolder do Google Drive, com visualização e paginação
- **Armazenamento no Google Drive**: dados armazenados com segurança em uma pasta oculta específica do aplicativo
- **Sincronização com um clique**: envie ou baixe toda a configuração em segundos
- **Multiplataforma**: Windows, macOS e Linux
- **Segurança**: Google OAuth 2.0 e tokens criptografados pelo sistema operacional via SecretStorage
- **Avatar do Google**: exibe a foto do perfil do Google no painel

> 📄 Consulte [FEATURES.md](FEATURES.md) para a documentação detalhada dos recursos.

### O que é sincronizado

| Item                             | Sincronizado |
| -------------------------------- | ------ |
| Settings (`settings.json`)       | ✅     |
| Keybindings (`keybindings.json`) | ✅     |
| Extensions                       | ✅     |
| Snippets                         | ✅     |
| Layout da IDE                    | ✅     |

## Instalação

### Pelo registro Open VSX

Após a publicação, pesquise por **"Sync Antigravity"** no painel Extensões ou instale pela página da extensão no Open VSX.

### Pelo VSIX

1. Baixe o arquivo `.vsix` em [Releases](https://github.com/LKSFerreira/sync-antigravity/releases).
2. Abra Antigravity: Extensões: `...`: **Instalar do VSIX**.

## Requisitos

- **Antigravity IDE**
- Uma conta do Google

## Uso

### Configuração inicial

1. Instale a extensão.
2. Clique no botão da **barra de status** ou execute `Sync Antigravity: Abrir painel`.
3. Clique em **Iniciar sessão com o Google**: autorize no navegador: pronto!

### Comando

Abra a Paleta de Comandos (`Ctrl+Shift+P` / `Cmd+Shift+P`):

| Comando                              | Descrição              |
| ------------------------------------ | ------------------------ |
| **Sync Antigravity: Abrir painel** | Abre o painel |
| **Sync Antigravity: Reverter último layout** | Restaura o backup local mais recente do layout |

Todo o gerenciamento de perfis (criar, baixar, enviar e excluir), as ações da conta (iniciar e encerrar sessão) e as configurações estão disponíveis diretamente na interface do painel.

### Barra de status

Clique no botão `$(sync) Sync Antigravity` na barra de status para abrir o painel rapidamente.

### Recursos do painel

- **Cartão da conta**: mostra o e-mail e o avatar do Google, com botão para encerrar a sessão
- **Ações rápidas**: cria perfil, define caminhos de configurações/atalhos e exibe registros
- **Cartões de perfil**: baixa, envia ou exclui perfis com um clique
- **Caixas de diálogo modais**: entrada para criar perfil, confirmações de exclusão/encerramento e solicitação de recarregamento
- **Notificações**: retorno de sucesso, erro e informação, com barra de progresso e botão para fechar

## Como funciona

1. **Autenticação**: o fluxo OAuth 2.0 abre seu navegador para iniciar sessão com o Google.
2. **Armazenamento**: os perfis são salvos na [appDataFolder](https://developers.google.com/drive/api/guides/appdata) oculta do Google Drive: ela não é visível à pessoa usuária e não consome a cota de armazenamento.
3. **Sincronização**: configurações, atalhos e snippets são armazenados como conteúdo codificado em base64, preservando comentários e formatação.

## Configuração

| Configuração                             | Padrão | Descrição                        |
| ----------------------------------- | ------- | ---------------------------------- |
| `antigravitysync.excludeExtensions` | `[]`    | IDs de extensões a excluir da sincronização |

## Observações importantes

- A sincronização de extensões pede confirmação antes de instalar ou desinstalar extensões.
- Talvez seja necessário recarregar a janela após baixar um perfil.
- Os tokens são armazenados com segurança via criptografia do sistema operacional (SecretStorage).
- As credenciais OAuth são injetadas de `.env` durante a compilação (não ficam no código-fonte).

## Desenvolvimento

### Pré-requisitos

- Node.js 20+
- [Antigravity IDE](https://www.antigravity.google/) (para testes)
- ID de cliente OAuth do Google ([Google Cloud Console](https://console.cloud.google.com/apis/credentials): tipo **Aplicativo para computador**)

### Preparação

```bash
git clone https://github.com/LKSFerreira/sync-antigravity.git
cd sync-antigravity
npm install
cp .env.example .env   # Preencha suas credenciais OAuth do Google
```

### Executar localmente (desenvolvimento)

```bash
npm run compile                # Compila uma vez (modo de desenvolvimento)
npm run watch                  # Compila e observa alterações
antigravity --extensionDevelopmentPath="$(pwd)"  # Inicia o Antigravity com a extensão
```

### Compilação de produção

```bash
npm run package                # Compilação de produção com Webpack
```

### Empacotar VSIX

```bash
npx -y @vscode/vsce package --allow-missing-repository
# Saída: sync-antigravity-x.x.x.vsix
```

### Publicar no Open VSX

```bash
npx -y ovsx publish sync-antigravity-x.x.x.vsix -p <YOUR_OPENVSX_TOKEN>
```

Obtenha o token em: [open-vsx.org/user-settings/tokens](https://open-vsx.org/user-settings/tokens)

### Criar uma release no GitHub

1. Acesse [Releases: New release](https://github.com/LKSFerreira/sync-antigravity/releases/new).
2. Crie a tag: `vX.X.X`.
3. Título: `vX.X.X - Descrição`.
4. Envie o arquivo `.vsix` como ativo.
5. Copie as entradas do changelog como notas da release.

### Estrutura do projeto

```
src/
├── extension.ts               # Ponto de entrada, comando único e barra de status
├── models/
│   └── interfaces.ts          # Interfaces TypeScript
├── providers/
│   └── dashboard-provider.ts  # Painel completo da Webview
├── webview/
│   ├── dashboard.css          # Estilos do painel (modal, notificações, cartões)
│   └── dashboard.js           # Lógica do painel (sistema de modais, renderização de estado)
└── core/
    ├── google-auth.ts          # Fluxo Google OAuth 2.0
    ├── google-drive.ts         # API do Google Drive (appDataFolder)
    ├── sync-controller.ts      # Leitura/escrita da configuração do Antigravity
    └── logger.ts               # Registro no canal de saída
```

## Notas de versão

### 0.6.0 (2026-03-08)

- 📝 **Snippets Sync** - Sync user snippets across devices (base64-bundled)
- 🔧 **Base64 Config Storage** - Settings and keybindings now preserve comments and whitespace
- 🛡️ **Orphaned Panel Cleanup** - Dashboard auto-closes on extension restart
- 🗑️ Removed `json5` dependency
- ⚠️ **Breaking**: Profiles from v0.5.0 are incompatible - delete and recreate

### 0.5.0 (2026-03-08)

- 📂 **Folder-based Profiles** - Each profile is a folder with `meta.json`, `settings.json`, `extensions.json`, `keybindings.json`
- ☑️ **Sync Item Selection** - Choose Settings/Extensions/Keybindings per create/push/pull via checkbox modals
- ⏳ **Sync Progress Modal** - Step-by-step progress display with animated bar during create/push/pull
- 🧩 **Extension Sync Confirm** - In-webview modal listing extensions to install/remove
- ⚡ **Progressive Loading** - Dashboard appears instantly, profiles and files load progressively
- 📊 **Root Sync Meta** - Central `sync-meta.json` for fast profile listing (2 API calls vs N+1)
- ⚠️ **Breaking**: Profiles from v0.4.0 are incompatible - delete and recreate

### 0.4.0 (2026-03-08)

- 📂 **App Data Explorer** - Browse all files/folders in Google Drive appDataFolder
- 🗂️ **Folder Navigation** - Double-click to drill down, breadcrumb trail, back button
- 👁️ **File Preview** - View JSON and text file content in a formatted modal
- 📄 **Pagination** - Prev/Next controls for large directories (20 items/page)

### 0.3.0 (2026-03-08)

- 🎨 **Full Dashboard UI** - Modern webview panel replaces command palette menu
- 🪟 **Modal System** - Custom confirm/input modals with backdrop blur and animations
- 🔔 **Toast Notifications** - Upgraded with close button, progress bar, and slide-in animation
- 👤 **Google Avatar** - Display profile picture in header and account card
- 🧹 **Simplified Commands** - Only `Open Dashboard` remains, all actions are in the panel
- 🌍 **English UI** - All user-facing text translated to English for global accessibility

### 0.2.0 (2026-03-08)

- 🔄 **Switched to Google Drive** - replaced GitHub Gists with Google Drive appDataFolder
- 🔒 **Google OAuth 2.0** - secure login via browser, tokens encrypted by OS
- 🔐 **Build-time credentials** - OAuth secrets injected via `.env` + DefinePlugin
- 🎯 **Antigravity Only** - focused support with warning for other editors
- 🗑️ **Removed GitHub dependency** - no longer requires GitHub account or token

### 0.1.0 (2026-03-08)

- 🎉 Initial release with GitHub Gist storage

## Como contribuir

Contribuições são bem-vindas! Abra uma issue ou envie um pull request no [GitHub](https://github.com/LKSFerreira/sync-antigravity).

## Links

- 📦 Open VSX: disponível após a primeira publicação
- 🐛 [Relatar problemas](https://github.com/LKSFerreira/sync-antigravity/issues)
- 📜 [Código-fonte](https://github.com/LKSFerreira/sync-antigravity)

## Licença

[MIT](LICENSE.md)
