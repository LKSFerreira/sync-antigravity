# Perfil portátil do Antigravity

## Status

Implementação validada em uma instância real do Antigravity IDE no Windows. O layout global e os workspaces associados ao perfil são extraídos e restaurados somente pelas chaves permitidas, com prévia e rollback local.

## Objetivo

Restaurar em outro computador o ambiente de trabalho de uma pessoa usuária com previsibilidade: configurações, atalhos, snippets, extensões e organização visual da IDE.

O resultado esperado não é uma cópia integral da pasta de dados do Antigravity. É um perfil portátil, revisável e seguro, que preserva apenas os dados necessários.

## Dados persistidos identificados

No Windows, a instalação analisada mantém os dados da pessoa usuária em:

```text
%APPDATA%\Antigravity IDE\User\
├── settings.json
├── keybindings.json
├── snippets\
├── globalStorage\
│   └── state.vscdb
└── workspaceStorage\
    └── <id-do-workspace>\
        ├── state.vscdb
        └── workspace.json
```

`globalStorage/state.vscdb` contém a organização global. Cada `workspaceStorage/<id>/state.vscdb` contém o estado vinculado a um workspace.

## Escopo do perfil

| Grupo | Conteúdo | Regra |
| --- | --- | --- |
| Configuração | `settings.json`, `keybindings.json`, snippets | incluir |
| Extensões | IDs e versões compatíveis | incluir, com confirmação antes de instalar ou remover |
| Layout global | posição, tamanho e visibilidade das partes do workbench | incluir, por lista explícita de chaves |
| Layout por workspace | painel, barra lateral, editor e visualizações de cada workspace | incluir, associado ao workspace correspondente |
| Histórico | arquivos em `History/` | excluir |
| Dados de extensões | subpastas de extensões em `globalStorage/` e `workspaceStorage/` | excluir |
| Sessão, cache, logs, locks e identificadores de máquina | diretórios e arquivos fora de `User/`, backups de bancos e arquivos temporários | excluir |

## Layout global a preservar

As chaves abaixo foram identificadas no estado global e são candidatas para sincronização:

- `workbench.activity.pinnedViewlets2`
- `workbench.activity.placeholderViewlets`
- `workbench.activityBar.location`
- `workbench.auxiliaryActivityBar.location`
- `workbench.auxiliaryBar.empty`
- `workbench.auxiliaryBar.lastNonMaximizedSize`
- `workbench.auxiliaryBar.size`
- `workbench.panel.alignment`
- `workbench.panel.lastNonMaximizedHeight`
- `workbench.panel.lastNonMaximizedWidth`
- `workbench.panel.pinnedPanels`
- `workbench.panel.placeholderPanels`
- `workbench.panel.size`
- `workbench.sideBar.size`

Itens como histórico de busca, telemetria, idioma detectado e estados de extensões não pertencem ao layout portátil e ficarão fora da lista.

## Layout por workspace a preservar

O estado por workspace contém, entre outras, chaves para:

- posição, tamanho e visibilidade do painel e da barra lateral;
- visualização ativa do painel e da barra lateral;
- estado e ordem de contêineres e visualizações do workbench;
- visibilidade da barra de status e do editor;
- modo zen.

O perfil não copiará a pasta inteira do workspace. Ele extrairá somente as chaves de layout permitidas de `state.vscdb` e as associará a uma identidade de workspace. Na restauração, a extensão localizará o workspace de destino e aplicará somente essas chaves.

## Formato proposto

Cada perfil no Google Drive incluirá, além dos arquivos já existentes:

```text
<perfil>/
├── meta.json
├── settings.json
├── keybindings.json
├── extensions.json
├── snippets.json
└── layout.json
```

`layout.json` guarda os pares de chave e valor extraídos dos bancos SQLite, agrupados em layout global e layouts dos workspaces associados ao perfil. Ele não contém cópias dos bancos, backups, tokens ou diretórios de extensões.

### Conteúdo de `layout.json`

```json
{
  "schemaVersion": 1,
  "global": {
    "schemaVersion": 1,
    "capturedAt": "2026-09-29T00:00:00.000Z",
    "entries": [
      {
        "key": "workbench.panel.size",
        "value": "300"
      }
    ]
  },
  "workspaces": {
    "schemaVersion": 1,
    "capturedAt": "2026-09-29T00:00:00.000Z",
    "layouts": [
      {
        "schemaVersion": 1,
        "capturedAt": "2026-09-29T00:00:00.000Z",
        "sourceId": "identificador-opaco-do-workspace",
        "label": "Projeto principal",
        "entries": []
      }
    ]
  }
}
```

Os valores serão preservados como texto, exatamente como estão na tabela `ItemTable` do SQLite. A lista de chaves permitidas é fixa. Cada entrada terá limite de tamanho, e cada perfil poderá manter até 12 layouts de workspace para impedir que um perfil manipulado transporte dados arbitrários.

`sourceId` é derivado do identificador local de armazenamento e não é usado para decidir automaticamente onde gravar em outra máquina. Ao atualizar um perfil, o layout do workspace aberto é acrescentado ou substituído pelo mesmo identificador local. Em outro computador, a pessoa usuária escolhe na prévia qual desses layouts deve ser aplicado ao workspace aberto. Isso evita enviar caminhos locais ao Google Drive e evita associar automaticamente o layout errado.

## Regras de validação do layout por workspace

O layout por workspace terá uma lista própria e restritiva de chaves. Ela inclui estado visual do workbench, como posição/visibilidade do painel e da barra lateral, contêineres de visualização, barra de status, editor centralizado e modo zen.

Estados que podem carregar conteúdo ou referências de arquivos ficam de fora, incluindo:

- `workbench.explorer.treeViewState`;
- `workbench.editor.languageDetectionOpenedLanguages.workspace`;
- históricos de pesquisa, substituição e localização;
- estado de editor, arquivos abertos e entradas de Webview;
- quaisquer chaves fora da lista aprovada.

Estados de visualizações de extensões só serão aceitos quando o valor for estritamente booleano ou numérico e a chave obedecer ao padrão aprovado. Assim, a extensão pode restaurar visibilidade e contagem de uma visualização sem transportar dados internos da extensão.

## Segurança e restauração

1. A extensão mostra no painel as chaves globais e os workspaces disponíveis antes de restaurar.
2. Antes de escrever qualquer estado, ela cria um snapshot local dos bancos que serão alterados, com manifesto validado.
3. O comando `Sync Antigravity: Reverter último layout` restaura o backup mais recente e cria outro snapshot antes de reverter.
4. A restauração de layout exige recarregamento da janela da IDE.
5. Quando houver mais de um layout de workspace no perfil, a pessoa usuária escolhe um deles explicitamente. Dados sem escolha não são aplicados automaticamente.
6. A lista de chaves sincronizáveis é mantida no código, testada e documentada. Dados desconhecidos são excluídos por padrão.

## Critérios de aceite

- Em uma instalação limpa, restaurar um perfil recria configurações, atalhos, snippets, extensões e o layout global selecionado.
- Ao abrir um workspace correspondente, painel, barras e visualizações recuperam a organização salva para ele.
- Nenhum arquivo de histórico, cache, token, log, sessão, backup de banco ou dado arbitrário de extensão é enviado ao Google Drive.
- Uma restauração pode ser desfeita usando o snapshot local criado antes da operação.
