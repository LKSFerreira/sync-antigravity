# Roadmap: Sync Antigravity

## Objetivo final

Publicar uma extensão independente no Open VSX, utilizável no Antigravity IDE, que restaure com segurança um ambiente de trabalho completo: configurações, atalhos, snippets, extensões e layout da IDE.

O projeto será aberto, transparente e controlado por este fork. Ele não será apresentado como continuação oficial do projeto original.

## Como acompanhar

- `[x]` concluído e validado
- `[-]` implementado parcialmente ou aguardando validação
- `[ ]` pendente

## Fase 0: Fundação do fork

- [x] Traduzir a interface, mensagens e documentação principal para pt-BR.
- [x] Preservar identificadores técnicos e comportamento existente durante a localização.
- [x] Registrar a arquitetura do perfil portátil e os dados que podem ou não ser sincronizados.
- [x] Manter `package-lock.json` e validar instalação reprodutível com `npm ci`.
- [x] Fixar no `package.json` todas as versões de dependências de desenvolvimento, sem intervalos como `^` e `20.x`.
- [x] Definir nome, `publisher`, repositório e identidade visual próprios.
- [x] Atualizar README e licença para identificar claramente o fork independente.

**Critério de aceite:** o projeto tem identidade própria e documentação que não induz afiliação com o autor original.

## Fase 1: Perfil portátil e layout

- [x] Mapear o estado global e por workspace persistido pelo Antigravity IDE.
- [x] Definir lista restritiva de chaves de layout permitidas.
- [x] Excluir histórico, cache, sessão, tokens, caminhos locais e dados arbitrários de extensões.
- [x] Adicionar o item `Layout` ao perfil de sincronização.
- [x] Capturar layout global e do workspace aberto em `layout.json`.
- [x] Validar layout recebido antes de restaurar.
- [x] Criar backup local e usar arquivo temporário durante a restauração.
- [x] Validar leitura/restauração em cópias temporárias de bancos SQLite.
- [x] Testar a restauração em uma instância real do Antigravity IDE.
- [x] Adicionar visualização no painel dos itens de layout que serão restaurados.
- [x] Adicionar comando de rollback a partir do backup local.
- [x] Permitir associar vários layouts de workspace a perfis diferentes.

**Critério de aceite:** em uma instalação limpa, um perfil restaura o layout global; com o workspace aberto, restaura também a organização visual dele, sem transportar dados não permitidos.

## Fase 2: Segurança da sincronização

- [x] Bloquear path traversal na restauração de snippets.
- [x] Validar nomes de perfil antes de consultas ao Google Drive.
- [x] Validar IDs de extensões antes de instalar ou remover.
- [x] Revalidar dados de layout recebidos do Drive.
- [x] Validar estrutura e tamanho de todos os arquivos recebidos do Drive.
- [x] Criar backup/rollback transacional para configurações, atalhos e snippets.
- [x] Exibir uma prévia completa antes de qualquer restauração.
- [x] Adicionar limites de tamanho e mensagens de erro recuperáveis para todos os itens de perfil.

**Critério de aceite:** uma carga remota malformada não consegue escrever fora dos destinos permitidos, instalar uma extensão inválida ou deixar uma restauração parcialmente aplicada.

## Fase 3: OAuth e privacidade

- [x] Manter tokens no `SecretStorage` da IDE.
- [x] Adicionar PKCE com `S256` ao fluxo de autorização.
- [x] Criar projeto OAuth próprio no Google Cloud.
- [x] Configurar Client ID de aplicativo desktop sob controle do fork.
- [x] Remover qualquer dependência operacional das credenciais do projeto original.
- [x] Documentar escopos, retenção de dados e fluxo de autenticação.
- [x] Revisar se os escopos `userinfo.email` e `userinfo.profile` continuam necessários.

**Critério de aceite:** cada pessoa usuária autentica sua própria conta Google, com escopos mínimos, e o fork não depende de credenciais de terceiros.

## Fase 4: Qualidade e cadeia de suprimentos

- [x] Fixar `sql.js` e suas definições de tipos no manifesto e no lockfile.
- [x] Fixar as demais dependências de desenvolvimento no manifesto e no lockfile.
- [x] Confirmar que o VSIX inclui o WebAssembly necessário ao layout.
- [x] Confirmar ausência de vulnerabilidades nas dependências de produção.
- [x] Adicionar testes unitários para validação de perfil, snippets, extensões e layout.
- [x] Adicionar testes de integração usando bancos SQLite temporários.
- [x] Adicionar GitHub Actions: `npm ci`, TypeScript, build, testes e empacotamento do VSIX.
- [x] Adicionar CodeQL, Dependabot e secret scanning.
- [x] Publicar hash SHA-256 do VSIX em cada release.
- [x] Garantir que somente tags de release possam publicar artefatos.

**Critério de aceite:** qualquer VSIX publicado é rastreável a um commit e a uma execução de CI verificável.

## Fase 5: Preparação para o Open VSX

- [x] Definir nome público final da extensão.
- [x] Criar conta, assinar o Publisher Agreement e criar o namespace de publisher no Open VSX.
- [x] Obter a aprovação da propriedade do namespace `lksferreira` no Open VSX.
- [x] Preparar bootstrap temporário e restrito para a primeira publicação no Open VSX.
- [ ] Configurar publicação confiável via OpenID Connect (OIDC) no Open VSX.
- [x] Atualizar `package.json` com `name`, `displayName`, `publisher`, URLs e palavras-chave próprios.
- [x] Preparar CHANGELOG, política de privacidade e instruções de migração.
- [x] Publicar o site com instruções de uso, política de privacidade e termos de serviço em `sync.semsusto.app`.
- [x] Criar release candidata e instalar o VSIX em outra instalação do Antigravity.
- [-] Validar login Google, atualização, aplicação, extensões e snippets. A restauração e o rollback de layout permanecem como dívida técnica documentada.

**Critério de aceite:** a release candidata funciona em uma instalação limpa e toda a documentação de publicação está pronta.

## Fase 6: Deploy

- [ ] Criar tag de versão estável.
- [ ] Executar o pipeline de release.
- [ ] Gerar o VSIX pelo CI.
- [ ] Publicar a release no GitHub, com hash SHA-256.
- [ ] Publicar o mesmo VSIX no Open VSX.
- [ ] Instalar pelo marketplace no Antigravity IDE e executar teste final de atualização e restauração.
- [ ] Comunicar a disponibilidade e as limitações conhecidas.

**Critério de aceite final:** a extensão é instalável pelo marketplace usado pelo Antigravity IDE, restaura com segurança o perfil portátil e possui release reproduzível e verificável.

## Dependências externas

| Item | Necessário para | Momento |
| --- | --- | --- |
| Projeto OAuth próprio no Google Cloud | autenticação independente | Fase 3 |
| Token temporário de bootstrap do Open VSX | primeira versão ativa no registry | Fase 5 |
| Publisher confiável do Open VSX (OIDC) | deploy automatizado sem token persistente | Fase 5 |
| Site público e domínio verificado no Google | Branding e consentimento OAuth externo | Fase 5 |
| Validação de layout em instalação limpa | suporte completo ao layout | Fases 1 e 5 |
