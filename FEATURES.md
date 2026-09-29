# Recursos

Documentação detalhada dos recursos da extensão **Antigravity Sync**.

## 📂 Gerenciamento de perfis

### Armazenamento baseado em pastas (v0.5.0+)

Cada perfil é armazenado em uma pasta própria na appDataFolder do Google Drive:

```
📁 My Profile/
├── meta.json          # Metadados do perfil (nome, datas, syncKeys)
├── settings.json      # Configurações do editor
├── extensions.json    # IDs das extensões instaladas
├── keybindings.json   # Atalhos de teclado
└── snippets.json      # Snippets da pessoa usuária (agrupados em base64)
```

Um arquivo central `sync-meta.json` na raiz de appDataFolder armazena as syncKeys de todos os perfis, permitindo uma listagem rápida (duas chamadas de API em vez de N+1).

Essa estrutura permite:
- Atualizações de arquivos individuais sem regravar todo o perfil
- Extensibilidade simples para futuros alvos de sincronização (temas etc.)
- Melhor resolução de conflitos no nível do arquivo

### Operações

| Ação         | Descrição                                          |
| -------------- | ---------------------------------------------------- |
| **Criar**     | Captura as configurações, extensões, atalhos e snippets atuais em um novo perfil com itens selecionáveis |
| **Enviar**       | Atualiza um perfil existente com sua configuração atual (caixas pré-marcadas conforme o perfil) |
| **Baixar**       | Baixa um perfil e o aplica ao editor local (mostra somente os itens disponíveis no perfil) |
| **Excluir**     | Remove permanentemente um perfil do Google Drive       |

## ☑️ Seleção de itens de sincronização (v0.5.0+)

Escolha exatamente quais itens sincronizar em cada operação:

- **Criar**: a lista de caixas de seleção aparece abaixo do nome do perfil
- **Enviar**: o modal de confirmação exibe caixas pré-marcadas conforme as `syncKeys` existentes no perfil
- **Baixar**: mostra somente os itens armazenados no perfil (filtrados por `meta.syncKeys`)
- **Validação**: pelo menos um item deve ser selecionado para continuar
- **Extensível**: baseado no padrão de registro `ISyncItem`; adicionar novos tipos exige apenas uma entrada no registro

## ⏳ Modal de progresso da sincronização (v0.5.0+)

Cada operação de sincronização (criar, enviar, baixar) exibe um modal de progresso em tempo real:

- **Lista de etapas**: mostra todas as etapas com ícones de status:
  - ⏳ Pendente (contorno de círculo)
  - 🔄 Ativa (indicador giratório)
  - ✅ Concluída (marca verde)
- **Barra de progresso**: barra de gradiente animada que mostra a porcentagem concluída
- **Comportamento de bloqueio**: o modal não pode ser dispensado durante a sincronização
- **Fechamento automático**: fecha automaticamente 800 ms após a conclusão
- **Tratamento de erro**: o modal pode ser dispensado se ocorrer um erro

## 🧩 Sincronização de extensões (v0.5.0+)

Ao baixar um perfil, a extensão compara as extensões locais com o perfil remoto:

- **Modal de confirmação**: lista as extensões a instalar e remover antes da aplicação
- **Opção de pular**: permite pular a sincronização de extensões e aplicar somente configurações, atalhos e snippets
- **Lista de exclusão**: configure `antigravitysync.excludeExtensions` para excluir permanentemente extensões específicas da sincronização

## 📝 Sincronização de snippets (v0.6.0+)

Sincronize snippets de nível de usuário da pasta `User/snippets/`:

- **Suporte a vários arquivos**: todos os arquivos `.json` e `.code-snippets` são sincronizados
- **Codificação base64**: o conteúdo é preservado exatamente (comentários, espaços em branco e sintaxe JSON5)
- **Armazenamento agrupado**: todos os snippets são reunidos em um único `snippets.json` no Google Drive
- **Criação automática da pasta**: a pasta de snippets é criada automaticamente no download se não existir

## 🔧 Base64 Config Preservation (v0.6.0+)

Settings and keybindings are now stored as raw base64-encoded content:

- **Comments preserved** - JSON5 comments in `settings.json` and `keybindings.json` survive sync
- **Whitespace preserved** - Original formatting maintained exactly
- **No conversion loss** - No JSON5 → JSON parsing that strips comments

## 🗂️ App Data Explorer (v0.4.0+)

Browse files and folders stored in Google Drive appDataFolder:

- **Folder navigation** - Double-click to drill down into subfolders
- **Breadcrumb trail** - Visual path indicator with clickable segments
- **File preview** - View JSON and text file content in a formatted modal
- **Pagination** - Prev/Next controls for directories with many items (20 per page)
- **Type badges** - Color-coded indicators for Folder, JSON, Text, and other file types
- **Loading state** - Spinner and loading text while fetching files

## ⚡ Progressive UI Loading (v0.5.0+)

The dashboard loads in two phases for instant responsiveness:

1. **Phase 1** - Auth and user info loads first, UI appears immediately with profile loading spinner
2. **Phase 2** - Profiles and app data load in background, displayed when ready

- Refresh buttons animate (spin) during loading
- App Data Explorer shows loading placeholder before files arrive

## 🎨 Dashboard UI (v0.3.0+)

Modern webview panel providing all functionality in one place:

- **Account card** - Google email, avatar, and sign-out button
- **Quick actions** - Create profile, set config paths, view logs, refresh
- **Profile cards** - Pull, push, or delete with one click
- **Modal system** - Themed confirm/input dialogs with backdrop blur and keyboard support
- **Toast notifications** - Success/error/info with progress bar, auto-dismiss, and close button

## 🔐 Security

- **Google OAuth 2.0** - Secure login via browser redirect
- **SecretStorage** - Tokens encrypted by OS-level keychain (Windows DPAPI, macOS Keychain, Linux Secret Service)
- **appDataFolder** - Profile data is invisible to the user in Google Drive and doesn't consume storage quota
- **Build-time credentials** - OAuth secrets injected via `.env` at build time, never in source code
- **Auto token refresh** - Transparent re-authentication when tokens expire (1h lifetime)

## ⚙️ Configuration

| Setting                             | Default | Description                        |
| ----------------------------------- | ------- | ---------------------------------- |
| `antigravitysync.excludeExtensions` | `[]`    | Extension IDs to exclude from sync |

## 📦 What Gets Synced

| Item                             | Synced | File               |
| -------------------------------- | ------ | ------------------ |
| Settings (`settings.json`)       | ✅     | `settings.json`    |
| Keybindings (`keybindings.json`) | ✅     | `keybindings.json` |
| Extensions                       | ✅     | `extensions.json`  |
| Snippets                         | ✅     | `snippets.json`    |

### Planned

| Item       | Status  |
| ---------- | ------- |
| Themes     | Planned |
| Tasks      | Planned |

## ⚠️ Known Limitations

- A window reload may be required after pulling a profile
- This extension is designed exclusively for [Antigravity IDE](https://www.antigravity.google/)
