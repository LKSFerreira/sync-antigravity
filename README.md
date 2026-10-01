# Sync Antigravity

[![Licença: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE.md)
[![Código-fonte](https://img.shields.io/badge/GitHub-LKSFerreira%2Fsync--antigravity-blue)](https://github.com/LKSFerreira/sync-antigravity)

Sincronize configurações, extensões, atalhos, snippets e layout do **Antigravity IDE** entre dispositivos usando o **Google Drive**.

> **Fork independente:** mantido por [LKSFerreira](https://github.com/LKSFerreira), derivado de [thotam/antigravity-sync](https://github.com/thotam/antigravity-sync) e distribuído sob a licença MIT.

> Esta extensão foi projetada exclusivamente para o [Antigravity IDE](https://www.antigravity.google/).

## O que ela sincroniza

| Item | Sincronizado |
| --- | --- |
| Configurações (`settings.json`) | Sim |
| Atalhos (`keybindings.json`) | Sim |
| Extensões | Sim, após confirmação |
| Snippets | Sim |
| Layout da IDE | Sim, com prévia e backup local |

Os perfis ficam no espaço privado `appDataFolder` do Google Drive. Eles não aparecem nos arquivos comuns do Drive e só podem ser acessados por este aplicativo autorizado.

## Instalação

### Pelo Open VSX

Após a primeira publicação, pesquise por **Sync Antigravity** no painel de extensões do Antigravity ou acesse a página da extensão no Open VSX.

### Pelo VSIX

1. Baixe o arquivo `.vsix` na página de [releases do projeto](https://github.com/LKSFerreira/sync-antigravity/releases).
2. No Antigravity, abra **Extensões**.
3. Abra o menu `...` e escolha **Instalar do VSIX**.
4. Selecione o arquivo baixado.

## Primeiro uso

1. Abra a Paleta de Comandos com `Ctrl+Shift+P` ou `Cmd+Shift+P`.
2. Execute **Sync Antigravity: Abrir painel** - ou clique em **Sync Antigravity** na barra de status.
3. Selecione **Iniciar sessão com o Google** e conclua a autorização no navegador.
4. De volta ao painel, crie um perfil com um nome identificável, como `Notebook pessoal`.
5. Escolha os itens que deseja incluir e envie o perfil.

No outro computador, instale a extensão, entre na **mesma conta Google**, abra o painel e escolha **Aplicar** no perfil desejado. A extensão detecta automaticamente os caminhos da instalação atual do Antigravity, mostra uma prévia antes de alterar dados e pede confirmação antes de instalar ou remover extensões. Recarregue a janela quando solicitado.

## Segurança e privacidade

- A extensão solicita somente o escopo `drive.appdata` do Google Drive.
- Os tokens OAuth ficam no armazenamento seguro local da IDE (`SecretStorage`), nunca no perfil sincronizado ou no repositório.
- O layout é filtrado por uma lista de chaves visuais permitidas e recebe backup local antes da restauração.
- Dados remotos são validados antes de afetarem configurações locais.

Leia a [Política de privacidade](https://github.com/LKSFerreira/sync-antigravity/blob/main/docs/POLITICA-DE-PRIVACIDADE.md) e os [Termos de serviço](https://github.com/LKSFerreira/sync-antigravity/blob/main/docs/TERMOS-DE-SERVICO.md).

## Ajuda

| Comando | Finalidade |
| --- | --- |
| **Sync Antigravity: Abrir painel** | Abre o painel de login e perfis. |
| **Sync Antigravity: Reverter último layout** | Restaura o backup local mais recente do layout. |

Se algo não funcionar como esperado, abra uma [issue no GitHub](https://github.com/LKSFerreira/sync-antigravity/issues) descrevendo a versão do Antigravity, a versão da extensão e os passos para reproduzir o problema. Não envie tokens, credenciais ou arquivos de configuração com dados sensíveis.

## Projeto e desenvolvimento

O código-fonte, a documentação técnica, as instruções para contribuir e o processo de publicação ficam no [repositório do projeto](https://github.com/LKSFerreira/sync-antigravity).

- [Documentação dos recursos](https://github.com/LKSFerreira/sync-antigravity/blob/main/FEATURES.md)
- [Guia de desenvolvimento](https://github.com/LKSFerreira/sync-antigravity/blob/main/docs/DESENVOLVIMENTO.md)
- [Notas de versão](https://github.com/LKSFerreira/sync-antigravity/blob/main/CHANGELOG.md)
- [Roteiro do projeto](https://github.com/LKSFerreira/sync-antigravity/blob/main/ROADMAP.md)

## Licença

[MIT](LICENSE.md)
