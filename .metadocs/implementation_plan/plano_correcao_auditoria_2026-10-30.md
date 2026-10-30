# Plano de correção dos achados da auditoria de internacionalização e da versão 0.8.1

## 1. Identificação

- **Data de elaboração:** 30 de outubro de 2026.
- **Situação:** planejado; nenhuma correção deste plano foi executada ou validada nesta etapa.
- **Revisão de referência da auditoria:** `adf6219`, na branch `main`.
- **Documento de origem:** `.metadocs/auditoria/auditoria_planos.md`.
- **Planos originais relacionados:**
  - `.metadocs/implementation_plan/internacionalizacao_automatica_extensao.md`;
  - `.metadocs/implementation_plan/plano_resolucao_ui_localizacao_indexacao_templates.md`.
- **Destino após a conclusão real:** promover este plano e, depois de reavaliar seus critérios, os planos originais para `.metadocs/implemented/` por meio do fluxo `/feat`, sem deixar cópias duplicadas.

Este documento é um plano de execução. Os resultados automatizados obtidos durante a auditoria servem somente como linha de base e não serão reutilizados como evidência das correções futuras.

## 2. Contexto e diagnóstico consolidado

A arquitetura principal de internacionalização foi implementada, e as verificações automatizadas da revisão auditada passaram. Entretanto, a auditoria encontrou requisitos funcionais não atendidos, lacunas de regressão e validações manuais sem evidência. Portanto, os planos originais não estão aptos à promoção.

A linha de base da revisão `adf6219` é:

- TypeScript strict compilando sem erros;
- 46 testes aprovados;
- cobertura de 99,68% de instruções e linhas, 100% de funções e 94,08% de branches;
- catálogos de localização validados;
- auditoria de dependências sem vulnerabilidades;
- VSIX 0.8.1 gerado e inspecionado localmente.

Esses resultados não detectaram os achados porque `DashboardProvider`, o adaptador do catálogo e `dashboard.js` não estão adequadamente exercitados pela suíte atual. Além disso, a suíte não executa o Extension Development Host e, por isso, não comprova idioma efetivo, renderização, acessibilidade, OAuth ou fluxos completos no Antigravity.

A publicação é uma pendência distinta da correção: durante a auditoria, o Open VSX ainda apresentava a versão 0.8.0 e os metadados antigos. O workflow `.github/workflows/release.yml` publica por tags `v*`; nenhuma tag, release ou publicação será criada como efeito automático deste plano.

## 3. Objetivos

1. Eliminar os textos visíveis fixos em português nos fluxos de criação e aplicação de perfis.
2. Garantir que erros inesperados apresentem mensagens públicas localizadas, sem expor mensagens técnicas brutas na webview ou nas páginas OAuth.
3. Fazer a ordenação de extensões usar a localidade efetiva sem introduzir dependência de `vscode` no núcleo puro.
4. Acrescentar diagnósticos seguros e testáveis para chaves e parâmetros de tradução ausentes na webview.
5. Substituir a listagem de extensões baseada em texto com quebras de linha por estrutura HTML semântica, preservando a rolagem e os controles fixos do modal.
6. Completar os requisitos pendentes dos Issue Forms, dos testes de localização e dos metadados em pt-BR.
7. Executar e registrar a matriz manual de internacionalização, interface e formulários antes de declarar os requisitos concluídos.
8. Criar barreiras de regressão para os módulos que passaram despercebidos pela cobertura atual, sem inflar métricas nem acoplar o núcleo ao VS Code.
9. Gerar e inspecionar um novo VSIX somente depois das correções e validações locais.
10. Separar a entrega do código da publicação e da verificação de indexação no Open VSX, ambas dependentes das autorizações e evidências correspondentes.

## 4. Fora de escopo e limites de execução

- Não redesenhar o dashboard nem alterar a experiência fora dos fluxos afetados.
- Não duplicar componentes, páginas ou catálogos por idioma.
- Não adicionar um novo framework de interface, DOM, teste ou internacionalização.
- Não alterar o formato dos perfis, as chaves técnicas de sincronização ou os dados já persistidos.
- Não persistir idioma, rótulos traduzidos ou mensagens de erro nos perfis e no banco de estado.
- Não modificar dependências apenas para executar estas correções. Uma atualização somente será considerada se uma falha concreta for diagnosticada e documentada.
- Não aumentar percentuais de cobertura por meio de importações artificiais, exclusões de régua ou testes sem asserções comportamentais.
- Não prometer posição ou relevância específica nas buscas do Open VSX.
- Não executar commit, push, criação de tag, release ou publicação sem solicitação explícita do mantenedor.
- Não marcar testes manuais como executados pelo agente sem execução real e evidência verificável. Itens que exigirem o mantenedor permanecerão pendentes até sua execução e registro.

## 5. Rastreabilidade dos achados

| Identificador | Correção exigida | Evidência automatizada mínima | Evidência manual ou externa |
| --- | --- | --- | --- |
| A-01 | Localizar os títulos “Criando” e “Aplicando” | Testes do catálogo e contrato contra textos fixos no provedor | Criar e aplicar perfil em inglês, pt-BR, variante de português e idioma não suportado |
| A-02 | Completar a definição de pronto da internacionalização | Suíte completa, catálogos, compilação e inspeção do pacote | Matriz manual integral, com resultados e evidências por idioma e fluxo |
| A-03 | Separar mensagem pública de causa técnica | Testes de erro estruturado, erro nativo, valor desconhecido, fallback e sanitização de log | Erros recuperáveis na webview e no retorno OAuth, sem dados técnicos ou sensíveis na interface |
| A-04 | Injetar localidade ou comparador na ordenação | Testes do comparador injetado, fallback determinístico e ausência de `vscode` no núcleo | Conferir a listagem nos idiomas da matriz |
| A-05 | Diagnosticar chave e parâmetro ausentes | Testes de fallback e de diagnóstico, incluindo ausência de valores sensíveis | Inspecionar o console da webview sem erros durante os fluxos normais |
| A-06 | Criar listagem semântica de extensões | Testes do modelo da lista e verificações de renderização segura | Modal com mais de 25 extensões, viewports de 768 px e 900 px, mouse e teclado |
| A-07 | Adicionar atalhos de privacidade e termos | Validação do YAML e dos endereços HTTPS | Conferir os links renderizados na página de nova issue do GitHub |
| A-08 | Testar explicitamente “Apply” em inglês | Asserções para inglês, pt-BR, alias `pt` e entradas contextualizadas legadas | Botões corretos na IDE real em inglês e pt-BR |
| A-09 | Completar a descrição pt-BR | Validação dos manifestos NLS e do conteúdo do VSIX | Conferir os metadados públicos somente após publicação autorizada |
| A-10 | Produzir evidências visuais e de formulários | Não substituível por teste unitário | Capturas ou registro equivalente do modal, botões e Issue Forms |
| P-01 | Publicar e verificar a descoberta, se autorizada | Workflow e pacote da versão candidata | API, página pública e buscas do Open VSX, com data e hora da consulta |

A-01 a A-09 exigem correção ou uma decisão explícita e documentada do mantenedor para alterar o requisito original. A-10 exige evidência, não uma presunção de funcionamento. P-01 não bloqueia a correção local, mas bloqueia qualquer declaração de que a otimização pública de descoberta foi concluída.

## 6. Decisões arquiteturais obrigatórias

### 6.1 Fronteiras de localização

- `src/localizacao/idioma.ts` permanece puro e responsável por resolver variantes de português para pt-BR e idiomas não suportados para inglês.
- `src/localizacao/catalogo.ts` permanece como adaptador autorizado a importar `vscode` e concentra as chamadas diretas a `vscode.l10n.t` necessárias à extração.
- As mensagens-base do runtime são escritas em inglês. As traduções ficam em `l10n/bundle.l10n.pt-br.json`, e o alias `l10n/bundle.l10n.pt.json` é sincronizado pelo script existente.
- `src/localizacao/textos-webview.ts` continua sendo a fonte única dos textos estáticos e dinâmicos da webview.
- `src/localizacao/serializacao-webview.ts` continua responsável pela serialização segura para o HTML inicial.
- A webview recebe textos já resolvidos ou chaves e parâmetros pelo contrato existente; não recebe mensagens técnicas brutas de exceções.
- Módulos de `src/core/` não importam `vscode`. A localidade ou o comparador é resolvido na fronteira e injetado no núcleo.

### 6.2 Contrato de mensagens de progresso

Criar funções de domínio no catálogo, com nomes em português, para os títulos de criação e aplicação de perfil. Cada função deve:

- chamar `vscode.l10n.t` diretamente com uma mensagem-base inglesa e interpolação nomeada;
- receber o nome do perfil como dado, nunca como parte da chave;
- usar mensagens-base equivalentes a `Creating "{name}"` e `Applying "{name}"`, ajustadas somente se o padrão de interpolação já adotado exigir outra forma;
- possuir traduções pt-BR equivalentes a `Criando "{name}"` e `Aplicando "{name}"`;
- preservar o nome do perfil como texto, sem interpretá-lo como HTML;
- ser usada nos dois caminhos de `DashboardProvider`, sem concatenar prefixos fixos no chamador.

Os identificadores técnicos das mensagens `syncStart` e os demais campos já consumidos pela webview permanecem estáveis, salvo necessidade comprovada e atualização simultânea de produtor, consumidor e testes.

### 6.3 Contrato público e técnico de erros

`localizarErro` passa a obedecer à seguinte precedência:

1. se for `ErroDaExtensao`, resolver o código estável e os parâmetros permitidos pelo catálogo;
2. se for erro não estruturado, `Error` nativo ou valor desconhecido, retornar o `fallback` localizado fornecido pelo contexto;
3. se não houver `fallback`, retornar a mensagem genérica localizada já prevista;
4. nunca retornar `error.message` de um erro não estruturado para apresentação pública.

Todos os chamadores de toast e OAuth devem fornecer contexto público específico e recuperável, por exemplo, falha ao criar perfil, aplicar perfil, carregar dados ou concluir autenticação. Não basta trocar uma mensagem bruta por outra mensagem fixa em português.

A causa original deve permanecer disponível somente no diagnóstico técnico, pela infraestrutura de log já adotada pela extensão. O registro deve incluir a operação e a categoria do erro, mas precisa remover ou omitir segredos e dados desnecessários. Não registrar tokens, códigos OAuth, cabeçalhos de autorização, conteúdo de perfis, consultas de URL completas ou catálogos inteiros. Caso a mensagem ou o stack sejam registrados, a sanitização existente deve ser aplicada e coberta por testes; se não houver sanitização confiável, registrar somente campos seguros e o código do erro.

A separação será testada tanto no retorno da função quanto no destino do erro: mensagem pública localizada para a interface e causa técnica restrita ao log. O fallback nunca deve registrar o objeto completo por conveniência.

### 6.4 Contrato de ordenação

A função de listagem em `src/core/installed-extensions.ts` deve aceitar a localidade resolvida ou, preferencialmente, um comparador injetado pela fronteira. O contrato precisa:

- evitar o literal `"pt-BR"` no núcleo;
- usar `Intl.Collator` ou `localeCompare` com a localidade efetiva somente na camada apropriada;
- manter ordenação estável e previsível quando não houver comparador, com desempate determinístico pelo ID;
- preservar o comportamento de filtragem e os dados retornados;
- não alterar IDs nem rótulos persistidos;
- garantir que todos os chamadores de produção forneçam a localidade resolvida, sem depender silenciosamente do padrão nos fluxos reais.

Os testes devem verificar o uso do comparador injetado e o desempate sem depender de diferenças de ICU entre sistemas operacionais. Um teste de contrato deve impedir a reintrodução do literal fixo e de importações de `vscode` no módulo puro.

### 6.5 Diagnóstico da webview sem perder pureza

O helper de `src/webview/localizacao.js` deve continuar sem DOM e sem dependência de `vscode`. O diagnóstico será entregue por uma função de callback injetada pela composição da webview, em vez de espalhar `console.warn` pelo resolvedor puro.

O contrato deve preservar os fallbacks atuais:

- chave ausente: retornar `[chave]` e emitir diagnóstico com a chave;
- parâmetro ausente: manter `{parametro}` no resultado e emitir diagnóstico com a chave e o nome do parâmetro;
- entrada legada `{ message, comment }`: continuar extraindo `.message` de forma defensiva;
- tradução válida: não emitir diagnóstico.

O diagnóstico não inclui valores de parâmetros, nomes de perfis, conteúdo dos catálogos ou dados de sincronização. A integração pode limitar repetições do mesmo aviso para evitar excesso de mensagens, sem alterar o texto apresentado. Os testes capturam o callback e verificam evento, conteúdo seguro e ausência de aviso no caminho feliz.

### 6.6 Estrutura semântica e segurança do modal

A lista de extensões deve ser criada com elementos DOM, usando um container de lista e um item por extensão. A implementação deve:

- substituir a string agregada com `\n` e marcadores por estrutura semântica;
- usar `createElement` e `textContent`, ou equivalente seguro, sem `innerHTML` para IDs, nomes ou versões;
- aplicar classes CSS próprias à lista e aos itens;
- restringir `white-space: pre-wrap` aos textos que realmente precisem preservar espaços, sem impor esse comportamento à lista;
- manter `.modal` com altura máxima e layout flexível;
- manter cabeçalho e rodapé com `flex-shrink: 0`;
- manter `.modal-body` como único proprietário principal da rolagem vertical, evitando barras concorrentes;
- preservar foco visível, navegação por teclado e leitura sequencial dos itens;
- usar rótulo acessível localizado quando a estrutura exigir um nome acessível adicional.

Não será criada uma segunda rolagem interna apenas para satisfazer a palavra “rolável”: a lista semântica participa do corpo rolável já existente. O comportamento final deve permitir alcançar o último item sem ocultar os botões de ação.

## 7. Arquivos e componentes afetados

| Arquivo ou grupo | Alteração prevista |
| --- | --- |
| `src/providers/dashboard-provider.ts` | Usar catálogo nos títulos, fornecer fallbacks por operação, injetar localidade e encaminhar causa técnica somente ao diagnóstico |
| `src/localizacao/catalogo.ts` | Adicionar mensagens de progresso e impedir retorno público de `error.message` para erros desconhecidos |
| `src/localizacao/idioma.ts` | Reutilizar a resolução existente; alterar somente se um teste demonstrar lacuna |
| `src/core/installed-extensions.ts` | Receber comparador ou localidade e remover o `pt-BR` fixo |
| `src/core/google-auth.ts` | Usar mensagens públicas contextuais nos retornos OAuth e preservar diagnóstico seguro |
| `src/webview/localizacao.js` | Acrescentar callback de diagnóstico sem alterar os fallbacks seguros |
| `src/webview/dashboard.js` | Integrar diagnóstico e montar a lista semântica sem HTML injetado |
| `src/webview/dashboard.css` | Estilizar a lista e preservar o layout flexível, a rolagem e os controles fixos |
| `src/localizacao/textos-webview.ts` | Incluir somente os novos textos realmente necessários para a webview |
| `l10n/bundle.l10n.json` | Regenerar as mensagens-base pelo fluxo de extração |
| `l10n/bundle.l10n.pt-br.json` | Traduzir somente as novas mensagens e preservar strings escalares |
| `l10n/bundle.l10n.pt.json` | Sincronizar o alias pelo script, sem edição divergente manual |
| `.github/ISSUE_TEMPLATE/config.yml` | Adicionar atalhos HTTPS diretos para privacidade e termos |
| `package.nls.pt-br.json` | Acrescentar a frase “Backup e restauração na nuvem.” à descrição, sem remover os termos existentes |
| `test/localizacao-webview.test.cjs` | Testar “Apply”, “Aplicar”, diagnóstico, fallbacks e compatibilidade defensiva |
| Testes de localização, núcleo e contratos existentes | Cobrir títulos, erros, ordenação e fronteiras arquiteturais no padrão já usado pelo projeto |
| Planos, `HISTORY.md` e `ROADMAP.md` | Atualizar somente após validação real e durante a promoção `/feat` |

A lista será ajustada somente se a implementação revelar uma dependência direta não prevista. Qualquer ampliação deverá ser justificada no plano antes da alteração.

## 8. Estratégia de catálogos e extração

A sequência obrigatória para cada alteração de texto é:

1. escrever a mensagem-base inglesa diretamente no ponto elegível do adaptador, com chamada estática a `vscode.l10n.t`;
2. executar `npm run l10n:export` para atualizar a extração, sem editar mensagens-base manualmente para contornar o extrator;
3. traduzir as novas entradas em `l10n/bundle.l10n.pt-br.json`, mantendo os mesmos placeholders e valores estritamente escalares;
4. executar `npm run l10n:sync-pt` para alinhar o alias genérico de português;
5. executar `npm run l10n:check` e corrigir qualquer divergência antes dos demais testes;
6. comparar as chaves e os placeholders entre inglês, pt-BR e `pt`, sem pressupor que a ordem textual dos arquivos seja relevante;
7. verificar que nenhuma tradução voltou a usar objetos `{ message, comment }` nos catálogos de runtime.

Não se deve apagar entradas aparentemente não utilizadas sem confirmar a extração e os usos dinâmicos. Mudanças em placeholders exigem atualização simultânea da mensagem-base, das traduções e dos testes.

## 9. Fases de implementação

Cada fase termina com uma verificação específica. Não avançar acumulando falhas conhecidas. Caso uma fase precise ser interrompida, o repositório deve permanecer compilável e os testes anteriores devem continuar válidos.

### Fase 0 — Preparação e proteção do escopo

1. Confirmar a revisão de trabalho e registrar o estado do Git.
2. Ler este plano e a auditoria antes de editar, preservando as correções já confirmadas.
3. Verificar que os planos originais continuam em `implementation_plan/` e não promovê-los neste momento.
4. Mapear os chamadores de `localizarErro`, da listagem de extensões e dos eventos `syncStart` para evitar contratos parciais.
5. Registrar quaisquer alterações preexistentes do mantenedor e não sobrescrevê-las.

**Verificação:** escopo e chamadores conhecidos; nenhuma mutação de versionamento ou publicação executada.

### Fase 1 — Regressões de localização e títulos de progresso (A-01 e A-08)

1. Acrescentar testes que expressem o comportamento esperado para criação e aplicação de perfil em inglês e pt-BR.
2. Adicionar as funções ao catálogo e substituir os dois textos fixos no `DashboardProvider`.
3. Adicionar a asserção explícita de `comum.aplicar` como `Apply` no contrato inglês e `Aplicar` em pt-BR.
4. Manter o teste de extração defensiva de `{ message: "Aplicar" }`, pois ele protege outro modo de falha.
5. Criar uma verificação de contrato direcionada que impeça o retorno dos dois textos literais e comprove que os títulos passam pelo catálogo. A verificação deve examinar a estrutura ou o contrato do código, não proibir acentos genericamente em todo o repositório.
6. Executar o fluxo completo de extração e sincronização dos catálogos.

**Verificação:** testes novos falhariam na implementação anterior; títulos e botões resolvem corretamente nos catálogos; `npm run l10n:check` aprovado.

### Fase 2 — Erros públicos localizados e diagnóstico seguro (A-03)

1. Adicionar testes para `ErroDaExtensao`, `Error` nativo com mensagem técnica, erro sem mensagem, string, objeto desconhecido, `null` e `undefined`.
2. Comprovar que o fallback da operação tem precedência sobre `error.message` para erros não estruturados.
3. Alterar `localizarErro` conforme a precedência definida neste plano.
4. Revisar todos os toasts e páginas OAuth afetados para fornecer fallbacks específicos e localizados.
5. Garantir que a causa original chegue apenas ao diagnóstico técnico, sem duplicar o erro em notificações.
6. Testar que a mensagem pública não contém a mensagem técnica simulada e que o log não contém valores sensíveis plantados no teste.
7. Validar os retornos OAuth de sucesso, falha e cancelamento sem registrar código, token ou parâmetros sensíveis da URL.

**Verificação:** nenhum caminho de erro desconhecido apresenta mensagem bruta; erros de domínio continuam específicos; logs não expõem segredos; testes aprovados.

### Fase 3 — Ordenação por localidade efetiva (A-04)

1. Adicionar teste que injeta um comparador controlado e comprova seu uso na ordenação.
2. Adicionar caso de empate e verificar o desempate determinístico por ID.
3. Remover a localidade fixa e injetar a dependência na fronteira de chamada.
4. Verificar todos os chamadores de produção para impedir que algum continue usando o fallback por omissão.
5. Adicionar teste de fronteira que impeça `vscode` e o literal `"pt-BR"` na implementação de ordenação do núcleo.
6. Manter os testes existentes de descoberta e filtragem de extensões.

**Verificação:** ordenação acompanha a dependência injetada, módulo permanece puro e nenhum comportamento de filtragem regride.

### Fase 4 — Diagnóstico do helper da webview (A-05)

1. Escrever testes para chave ausente, um parâmetro ausente, múltiplos parâmetros ausentes, tradução válida e objeto contextualizado legado.
2. Injetar um coletor de diagnóstico e verificar tanto os eventos quanto o resultado textual.
3. Incluir valores sensíveis fictícios nos parâmetros do teste e assegurar que eles não apareçam no diagnóstico.
4. Implementar o callback e sua integração na webview, sem introduzir DOM ou `vscode` no helper.
5. Confirmar que uma tradução válida não emite aviso e que fallbacks continuam não lançando exceção.

**Verificação:** fallbacks antigos preservados, diagnósticos novos comprovados e nenhum aviso no caminho feliz.

### Fase 5 — Lista semântica e comportamento do modal (A-06 e parte de A-10)

1. Extrair, se necessário, um modelo puro de itens para testar ordenação e dados sem simular todo o dashboard.
2. Renderizar um elemento por extensão usando APIs DOM seguras e classes dedicadas.
3. Remover a montagem por `\n` e limitar o uso de `pre-wrap`.
4. Ajustar o CSS sem alterar as propriedades que já corrigiram altura, corpo rolável e controles fixos.
5. Adicionar verificação contra uso de `innerHTML` para dados das extensões e contra a antiga concatenação da lista.
6. Executar a validação visual descrita na matriz manual; testes unitários não bastam para este item.

**Verificação:** estrutura semântica presente, dados tratados como texto, uma rolagem principal funcional, último item alcançável e botões sempre visíveis.

### Fase 6 — Formulários e metadados (A-07 e A-09)

1. Acrescentar em `config.yml` um atalho para `https://sync.semsusto.app/privacidade/` e outro para `https://sync.semsusto.app/termos/`, com rótulos claros.
2. Manter os links já existentes e a desativação de issues em branco.
3. Validar a sintaxe YAML e os endereços HTTPS sem incluir tokens ou parâmetros de rastreamento.
4. Completar `package.nls.pt-br.json` com a frase “Backup e restauração na nuvem.”, preservando a descrição existente e a concordância do texto final.
5. Conferir que os manifestos NLS continuam consistentes e que nenhuma categoria ou palavra-chave foi removida.

**Verificação:** YAML válido, links corretos, descrição completa e manifestos aprovados pelas validações locais.

### Fase 7 — Barreiras de regressão e validação automatizada integrada (A-01 a A-09)

1. Executar os testes novos isoladamente durante o desenvolvimento e depois toda a suíte, sem selecionar somente os caminhos felizes.
2. Demonstrar, por execução contra o comportamento anterior ou por análise registrada do teste, que cada teste de regressão cobre o defeito pretendido.
3. Incluir o adaptador de catálogo nos testes por meio de uma fronteira controlada de `vscode`, sem importar o módulo real do editor no processo Node.
4. Restaurar qualquer mock ou interceptação de módulo após cada teste para evitar contaminação entre arquivos.
5. Manter `dashboard.js` e o provedor protegidos por testes de contrato e validação real no Extension Development Host; não declarar que cobertura estática equivale a cobertura comportamental.
6. Executar buscas direcionadas por textos e padrões residuais:
   - `Criando \"` e `Aplicando \"` no provedor;
   - `localeCompare` com localidade fixa no núcleo;
   - retorno direto de `error.message` no resolvedor público;
   - concatenação de extensões com `\n` e uso de `innerHTML` na lista;
   - textos visíveis novos fora do catálogo nos arquivos alterados.
7. Revisar os resultados manualmente para distinguir falsos positivos de texto de documentação, teste ou diagnóstico.
8. Executar, nesta ordem, após estabilizar as alterações:
   - `npm run l10n:check`;
   - `npm run compile:tsc`;
   - `npm test`;
   - `npm audit --audit-level=high`;
   - `git diff --check`.
9. Registrar quantidade de testes, cobertura e eventuais falhas sem reutilizar os números da auditoria.

**Verificação:** todos os comandos aprovados na árvore final, nenhuma regressão conhecida e nenhuma alteração fora do escopo.

## 10. Estratégia de testes por camada

### 10.1 Testes unitários puros

- Resolução de idiomas suportados, variantes de português e fallback inglês.
- Ordenação com comparador injetado, desempate e comportamento sem dependência do editor.
- Helper da webview com tradução normal, chave ausente, parâmetros ausentes e compatibilidade legada.
- Modelo da lista de extensões, caso extraído, preservando IDs e dados sem transformação HTML.

### 10.2 Testes do adaptador e dos contratos

- Catálogo com `vscode.l10n.t` controlado para verificar mensagens-base, placeholders e retorno por idioma.
- Títulos de criação e aplicação sem texto fixo no provedor.
- Erros estruturados resolvidos por código e erros desconhecidos direcionados ao fallback.
- Separação entre saída pública e diagnóstico técnico.
- Ausência de importação de `vscode` no núcleo e ausência da localidade fixa na ordenação.
- Coerência de `comum.aplicar` em inglês, pt-BR e alias `pt`.

Os testes de contrato são complementares. Não substituem a execução dos fluxos reais nem devem afirmar que toda string visível do projeto foi automaticamente validada.

### 10.3 Testes de interface e integração real

Executar no Antigravity por meio das configurações F5 já existentes ou do VSIX candidato, usando dados descartáveis. A matriz deve registrar versão da IDE, sistema operacional, revisão, versão do VSIX, idioma solicitado, idioma efetivo, resultado e evidência.

Não usar conta pessoal ou dados reais desnecessários. Capturas devem ocultar e-mail, tokens, caminhos privados, nomes de perfis sensíveis e conteúdo de configurações.

## 11. Matriz manual obrigatória de internacionalização (A-02)

Todos os itens começam desmarcados. Só podem ser marcados após execução real e registro do resultado. O agente não pode marcar itens dependentes do mantenedor por inferência, inspeção estática ou sucesso da suíte automatizada.

### 11.1 Idiomas e resolução

- [ ] **Inglês (`en`):** manifesto, comandos, dashboard, títulos de progresso, botões, mensagens de erro e páginas OAuth em inglês.
- [ ] **Português do Brasil (`pt-BR`):** todos os mesmos elementos em pt-BR, incluindo `Aplicar`, `Atualizar`, `Criando` e `Aplicando`.
- [ ] **Outra variante de português, como `pt-PT`:** resolução para o conteúdo pt-BR pelo alias, sem chaves expostas.
- [ ] **Idioma não suportado, como `es` ou `fr`:** fallback integral para inglês, sem português residual.
- [ ] **Reinicialização:** o idioma efetivo continua correto após recarregar a webview e reiniciar o Extension Development Host.
- [ ] **Troca de idioma:** nova instância usa o idioma configurado sem dados traduzidos persistidos indevidamente.

### 11.2 Fluxos funcionais por idioma

Executar ao menos em inglês e pt-BR, e usar os demais idiomas para verificar fallback e mistura de textos:

- [ ] Abrir o dashboard e conferir o HTML inicial, sem texto temporário no idioma errado.
- [ ] Criar perfil e verificar o título de progresso e as mensagens de conclusão.
- [ ] Aplicar perfil e verificar título, confirmação e resultado.
- [ ] Atualizar ou sincronizar perfil existente e verificar os botões e estados.
- [ ] Listar mais de 25 extensões e conferir ordenação, conteúdo e navegação.
- [ ] Executar rollback e verificar datas, mensagens e formato conforme a localidade.
- [ ] Simular erro de domínio e confirmar mensagem específica localizada.
- [ ] Simular erro inesperado e confirmar fallback público, ausência de mensagem bruta e diagnóstico técnico seguro.
- [ ] Executar retorno OAuth de sucesso e conferir `lang`, texto e encoding.
- [ ] Executar retorno OAuth de falha ou cancelamento e conferir mensagem recuperável sem segredo na página ou no log.
- [ ] Verificar console da webview e saída da extensão: nenhum aviso de chave ou parâmetro ausente nos fluxos válidos e nenhum dado sensível nos erros.

Para cada falha, registrar passos, idioma, resultado observado e arquivo de evidência. Um item não verificado permanece `[ ]`; não utilizar `[x]` para “não se aplica” sem justificativa expressa do mantenedor.

## 12. Matriz visual e formulários (A-10)

### 12.1 Modal de extensões

- [ ] Preparar uma lista com mais de 25 extensões, incluindo IDs longos e caracteres especiais inofensivos para verificar quebra de linha e tratamento como texto.
- [ ] Testar viewport com altura de 768 px, zoom de 100%, sem reduzir a página para contornar o problema.
- [ ] Testar viewport com altura de 900 px, zoom de 100%.
- [ ] Confirmar cabeçalho e botões visíveis desde a abertura até o fim da rolagem.
- [ ] Rolar por roda do mouse e por teclado, incluindo Tab e teclas de navegação aplicáveis, até alcançar o último item.
- [ ] Confirmar foco visível e ausência de duas barras de rolagem concorrentes.
- [ ] Confirmar que cabeçalho e rodapé não são cortados ao redimensionar a janela.
- [ ] Registrar captura ou evidência equivalente do início e do fim da lista em cada viewport.

### 12.2 Botões na IDE real

- [ ] Em pt-BR, confirmar visualmente `Aplicar` e `Atualizar`, sem `[comum.aplicar]` ou objetos serializados.
- [ ] Em inglês, confirmar `Apply` e o rótulo correspondente de atualização.
- [ ] Confirmar os mesmos botões durante e após os fluxos, sem mistura de idiomas.

### 12.3 Issue Forms no GitHub

- [ ] Abrir a página de nova issue no repositório remoto e confirmar a renderização dos três formulários.
- [ ] Confirmar o aviso bilíngue e os campos obrigatórios de cada formulário.
- [ ] Confirmar que issues em branco permanecem desativadas.
- [ ] Abrir os atalhos de documentação, repositório upstream, privacidade e termos e conferir seus destinos.
- [ ] Não criar uma issue pública apenas para testar; usar a pré-visualização oferecida pelo GitHub ou obter autorização específica.
- [ ] Registrar captura ou endereço e data da verificação, sem informações privadas.

## 13. Inspeção do VSIX candidato

O empacotamento ocorre somente depois das validações automatizadas e das correções funcionais. Testes manuais que dependerem do pacote devem usar exatamente o artefato inspecionado.

1. Executar `npm run package:vsix`.
2. Confirmar que `artifacts/sync-antigravity.vsix` foi regenerado na execução atual.
3. Listar o conteúdo do pacote e verificar a presença de:
   - `extension/package.json`;
   - manifestos NLS;
   - os arquivos de `l10n/` exigidos;
   - `extension/dist/extension.js`;
   - os artefatos da webview;
   - `extension/dist/sql-wasm.js` e `extension/dist/sql-wasm.wasm`;
   - ícone e demais arquivos de runtime obrigatórios.
4. Confirmar a ausência de `.env`, credenciais, `.agents`, `.metadocs`, capturas, ícone original e arquivos de desenvolvimento proibidos.
5. Inspecionar o manifesto interno para conferir versão, `displayName` por NLS, descrição, categorias, palavras-chave e propriedade `l10n`.
6. Não exigir o número histórico de 25 arquivos como critério isolado. Se a contagem mudar, explicar a diferença; o contrato é a presença dos artefatos necessários e a ausência dos proibidos.
7. Instalar o VSIX em ambiente descartável do Antigravity e executar os testes manuais aplicáveis nesse mesmo artefato.
8. Registrar data, revisão, versão e resultado do empacotamento. Não declarar publicação a partir da geração local.

## 14. Documentação e rastreabilidade durante a implementação

Durante a execução, atualizar este plano com fatos verificados, sem apagar a distinção entre planejado e realizado:

- descrever desvios arquiteturais e seus motivos;
- anexar resultados dos comandos executados na árvore final;
- preencher as matrizes somente com evidências reais;
- registrar pendências explicitamente, sem convertê-las em sucesso;
- referenciar `.metadocs/auditoria/auditoria_planos.md` por link relativo;
- manter UTF-8, pt-BR e diacríticos preservados;
- não registrar segredos, dados pessoais ou conteúdo sensível nas evidências.

Os planos originais devem ser revistos após as correções para distinguir o que já existia, o que foi corrigido por este plano e o que continua pendente. Não se deve reescrever o histórico como se todos os requisitos tivessem sido atendidos na primeira implementação.

## 15. Publicação e verificação no Open VSX (P-01, posterior e autorizada)

Esta fase não faz parte da execução automática das correções. Ela somente começa após:

1. todos os critérios locais aplicáveis estarem aprovados;
2. o mantenedor autorizar expressamente a versão, a tag e a publicação;
3. o versionamento estar coerente com o estado real do repositório e com os artefatos já publicados.

Se a versão 0.8.1 ainda não tiver sido publicada ou etiquetada, o mantenedor decide se ela incluirá as correções. Se já existir uma release ou tag imutável, adotar a próxima versão de patch; nunca sobrescrever ou reutilizar uma release pública.

Após autorização específica:

1. atualizar os changelogs com as correções efetivamente entregues;
2. validar novamente a versão e o VSIX final;
3. executar as operações de Git e release somente nos termos autorizados;
4. acompanhar o workflow disparado pela tag `v*` até seu resultado real;
5. consultar a API pública `https://open-vsx.org/api/lksferreira/sync-antigravity` e confirmar a versão publicada;
6. conferir `displayName`, descrição, categorias e palavras-chave públicos;
7. registrar data, hora e eventual propagação pendente;
8. pesquisar termos como `Antigravity Sync`, `Settings Sync` e `Extension Sync`, registrando presença e resultado sem prometer posição;
9. se a indexação ainda não refletir os metadados, manter P-01 pendente e registrar a divergência temporal, sem declarar sucesso antecipado.

Uma resposta antiga da API ou uma busca sem resultado não deve ser corrigida por publicações repetidas. Primeiro diagnosticar workflow, versão, namespace e propagação.

## 16. Critérios objetivos de aceite

A entrega local somente será considerada concluída quando todos os itens aplicáveis abaixo estiverem atendidos:

- [ ] A-01: nenhum dos dois títulos possui português fixo; mensagens-base e traduções foram extraídas e testadas.
- [ ] A-02: a matriz manual de internacionalização foi executada e registrada, ou qualquer redução de escopo foi aprovada explicitamente pelo mantenedor e documentada.
- [ ] A-03: erros desconhecidos nunca retornam `error.message` à interface; todos os chamadores relevantes têm fallback localizado e diagnóstico seguro.
- [ ] A-04: a ordenação recebe a localidade ou comparador pela fronteira e o núcleo não depende de `vscode` nem de `pt-BR` fixo.
- [ ] A-05: chave e parâmetro ausentes geram fallback e diagnóstico testados, sem valores sensíveis.
- [ ] A-06: a lista usa estrutura semântica segura e o modal passa nos testes visuais e de teclado.
- [ ] A-07: os atalhos de privacidade e termos estão no YAML e foram verificados na interface do GitHub.
- [ ] A-08: `Apply`, `Aplicar` e o alias `pt` possuem asserções explícitas, além do teste defensivo legado.
- [ ] A-09: a descrição pt-BR contém “Backup e restauração na nuvem.” sem perda dos termos anteriores.
- [ ] A-10: as evidências visuais, dos botões e dos formulários foram registradas; itens não executados continuam pendentes.
- [ ] Todos os novos testes de regressão passam e foram desenhados para falhar diante do comportamento defeituoso correspondente.
- [ ] `npm run l10n:check`, `npm run compile:tsc`, `npm test`, `npm audit --audit-level=high` e `git diff --check` passaram na árvore final.
- [ ] As buscas por padrões residuais foram revisadas e não restaram textos visíveis fora das fronteiras definidas nos arquivos alterados.
- [ ] O VSIX final foi gerado, inspecionado e usado nos testes manuais aplicáveis.
- [ ] Não há alterações não relacionadas, segredos ou dados sensíveis nas modificações e evidências.
- [ ] A documentação reflete apenas o que foi efetivamente implementado e validado.
- [ ] P-01: se o resultado público fizer parte do aceite, a publicação autorizada e a verificação no Open VSX foram concluídas; caso contrário, permanece explicitamente fora da entrega local.

## 17. Condições para promoção pelo `/feat`

A promoção somente poderá ocorrer depois de uma nova revisão da auditoria contra a árvore final. Nessa revisão:

1. verificar cada identificador A-01 a A-10 e, se aplicável, P-01;
2. confirmar que não existem testes vermelhos, validações omitidas ou evidências presumidas;
3. converter os planos para descrições no passado da implementação e da validação realmente realizadas;
4. mover os arquivos de `.metadocs/implementation_plan/` para `.metadocs/implemented/`, sem duplicatas;
5. acrescentar entradas cronológicas e links relativos em `HISTORY.md`;
6. atualizar `ROADMAP.md`, inclusive a validação manual, somente quando o estado real justificar a marcação;
7. não alterar `ROADMAP.md` para mascarar uma pendência nem marcar a indexação pública antes da publicação;
8. manter commits, push, tag, release e publicação fora do `/feat`, salvo solicitação explícita e separada do mantenedor.

Se qualquer bloqueador permanecer, o plano fica em `implementation_plan/`, a pendência é documentada e nenhum dos planos originais é promovido como concluído.

## 18. Resultado esperado

Ao final, a extensão deve apresentar idioma consistente em todos os fluxos afetados, erros públicos seguros e recuperáveis, ordenação dependente da localidade, diagnósticos de tradução úteis e uma lista de extensões semântica e acessível. A confiança na entrega deve decorrer de testes que alcancem os contratos anteriormente ignorados, de evidências reais no Antigravity e de um pacote inspecionado — não apenas dos percentuais históricos de cobertura ou do sucesso do empacotamento.
