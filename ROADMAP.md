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
- [-] Testar a restauração em uma instância real do Antigravity IDE.
- [x] Adicionar visualização no painel dos itens de layout que serão restaurados.
- [x] Adicionar comando de rollback a partir do backup local.
- [x] Permitir associar vários layouts de workspace a perfis diferentes.

**Critério de aceite:** em uma instalação limpa, um perfil restaura o layout global; com o workspace aberto, restaura também a organização visual dele, sem transportar dados não permitidos.

## Fase 2: Segurança da sincronização

- [-] Bloquear path traversal na restauração de snippets.
- [-] Validar nomes de perfil antes de consultas ao Google Drive.
- [-] Validar IDs de extensões antes de instalar ou remover.
- [-] Revalidar dados de layout recebidos do Drive.
- [ ] Validar estrutura e tamanho de todos os arquivos recebidos do Drive.
- [ ] Criar backup/rollback transacional para configurações, atalhos e snippets.
- [ ] Exibir uma prévia completa antes de qualquer restauração.
- [ ] Adicionar limites de tamanho e mensagens de erro recuperáveis para todos os itens de perfil.

**Critério de aceite:** uma carga remota malformada não consegue escrever fora dos destinos permitidos, instalar uma extensão inválida ou deixar uma restauração parcialmente aplicada.

## Fase 3: OAuth e privacidade

- [x] Manter tokens no `SecretStorage` da IDE.
- [-] Adicionar PKCE com `S256` ao fluxo de autorização.
- [ ] Criar projeto OAuth próprio no Google Cloud.
- [ ] Configurar Client ID de aplicativo desktop sob controle do fork.
- [ ] Remover qualquer dependência operacional das credenciais do projeto original.
- [ ] Documentar escopos, retenção de dados e fluxo de autenticação.
- [ ] Revisar se os escopos `userinfo.email` e `userinfo.profile` continuam necessários.

**Critério de aceite:** cada pessoa usuária autentica sua própria conta Google, com escopos mínimos, e o fork não depende de credenciais de terceiros.

## Fase 4: Qualidade e cadeia de suprimentos

- [x] Fixar `sql.js` e suas definições de tipos no manifesto e no lockfile.
- [x] Fixar as demais dependências de desenvolvimento no manifesto e no lockfile.
- [-] Confirmar que o VSIX inclui o WebAssembly necessário ao layout.
- [x] Confirmar ausência de vulnerabilidades nas dependências de produção.
- [ ] Adicionar testes unitários para validação de perfil, snippets, extensões e layout.
- [ ] Adicionar testes de integração usando bancos SQLite temporários.
- [ ] Adicionar GitHub Actions: `npm ci`, TypeScript, build, testes e empacotamento do VSIX.
- [ ] Adicionar CodeQL, Dependabot e secret scanning.
- [ ] Publicar hash SHA-256 do VSIX em cada release.
- [ ] Garantir que somente tags de release possam publicar artefatos.

**Critério de aceite:** qualquer VSIX publicado é rastreável a um commit e a uma execução de CI verificável.

## Fase 5: Preparação para o Open VSX

- [ ] Definir nome público final da extensão.
- [ ] Criar conta e namespace de publisher no Open VSX.
- [ ] Criar token de publicação e armazená-lo apenas como secret do repositório.
- [ ] Atualizar `package.json` com `name`, `displayName`, `publisher`, URLs e palavras-chave próprios.
- [ ] Preparar CHANGELOG, política de privacidade e instruções de migração.
- [ ] Criar release candidata e instalar o VSIX em uma máquina limpa.
- [ ] Validar login Google, push, pull, extensões, snippets, rollback e layout.

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
| Conta e namespace no Open VSX | publicação | Fase 5 |
| Token do Open VSX | deploy automatizado | Fase 5 |
| Máquina ou perfil limpo do Antigravity | validação de restauração e release | Fases 1 e 5 |
