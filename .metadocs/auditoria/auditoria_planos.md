# Auditoria dos planos de internacionalização e correções da versão 0.8.1

## Identificação

- **Data:** 30 de outubro de 2026.
- **Revisão auditada:** `adf6219` na branch `main`.
- **Planos avaliados:**
  - `.metadocs/implementation_plan/internacionalizacao_automatica_extensao.md`;
  - `.metadocs/implementation_plan/plano_resolucao_ui_localizacao_indexacao_templates.md`.
- **Referência fornecida pelo mantenedor:** relatório de implementação da versão 0.8.1, incluindo commits, testes, empacotamento e correção de dependências.
- **Resultado:** os dois planos permanecem em `implementation_plan/`. Nenhum foi promovido porque existem defeitos funcionais, requisitos não atendidos e validações sem evidência suficiente.

## 1. Resumo executivo

A maior parte da arquitetura planejada está presente, e todas as verificações automatizadas executadas nesta auditoria passaram. Isso não é suficiente para promover os planos:

1. a internacionalização ainda apresenta português fixo em títulos de progresso quando a IDE deveria usar inglês;
2. erros não estruturados podem chegar à interface sem o contexto localizado previsto;
3. uma ordenação continua fixada em `pt-BR`;
4. o fallback da webview não registra os diagnósticos especificados;
5. a matriz manual da internacionalização continua parcial, e todos os critérios de aceite do plano permanecem desmarcados;
6. o plano de correções 0.8.1 possui requisitos secundários não implementados e testes visuais sem evidência registrada;
7. a otimização de descoberta está no pacote local 0.8.1, mas a versão pública mais recente encontrada no Open VSX durante a auditoria ainda era 0.8.0, com metadados antigos.

Os testes atuais não detectam essas divergências porque o `DashboardProvider`, o catálogo adaptador e o `dashboard.js` não fazem parte dos módulos incluídos na medição de cobertura do comando `npm test`.

## 2. Achados bloqueadores

### 🔴 A-01 — Português fixo em títulos de progresso

**Plano afetado:** `internacionalizacao_automatica_extensao.md`.

**Evidências:**

- `src/providers/dashboard-provider.ts:220` envia o título ``Criando "${message.name}"`` diretamente para a webview;
- `src/providers/dashboard-provider.ts:288` envia o título ``Aplicando "${pending.profileName}"`` diretamente para a webview.

Esses textos não passam por `vscode.l10n.t` nem pelo catálogo. Em uma IDE inglesa ou em um idioma não suportado, a interface apresenta português nesses dois fluxos.

**Requisitos violados:**

- toda a experiência deve acompanhar o idioma da IDE;
- idiomas não suportados devem receber inglês;
- não deve haver texto visível misturado entre idiomas;
- todos os textos fora da webview devem seguir o idioma efetivo.

**Correção necessária:** mover os dois textos para mensagens-base inglesas no catálogo, incluir as traduções pt-BR, regenerar os aliases e adicionar cobertura capaz de detectar texto fixo no provedor.

### 🔴 A-02 — A definição de pronto da internacionalização não foi atingida

**Plano afetado:** `internacionalizacao_automatica_extensao.md`.

**Evidências:**

- `.metadocs/implementation_plan/internacionalizacao_automatica_extensao.md:5` declara a matriz manual apenas parcialmente validada;
- `.metadocs/implementation_plan/internacionalizacao_automatica_extensao.md:1537-1575` mantém todos os critérios funcionais, arquiteturais e de qualidade desmarcados;
- `.metadocs/implementation_plan/internacionalizacao_automatica_extensao.md:1579-1590` exige a matriz manual e os fluxos completos antes da definição de pronto;
- `ROADMAP.md:119` mantém a validação manual como `[-]`, ou seja, parcial ou aguardando validação.

Não foi localizada evidência posterior que comprove a execução completa da matriz em inglês, pt-BR, outra variante de português e um idioma não suportado, incluindo manifesto, webview, OAuth, fluxos de perfil, extensões, reinicialização e rollback.

**Consequência:** mesmo após as correções de código, a promoção pelo `/feat` dependerá do registro dessa validação ou de uma decisão explícita do mantenedor sobre a redução do critério de aceite. Esta auditoria não presume que testes não registrados tenham ou não tenham sido executados.

## 3. Alertas de implementação

### 🟡 A-03 — O fallback de erros devolve mensagens brutas à interface

**Plano afetado:** `internacionalizacao_automatica_extensao.md`.

**Evidências:**

- `src/localizacao/catalogo.ts:155-162` retorna `error.message` antes de considerar o `fallback` para qualquer `Error` não estruturado;
- `src/providers/dashboard-provider.ts:200`, `:389`, `:406` e `:422` encaminham esse resultado a toasts da webview;
- `src/core/google-auth.ts:198` e `:205` usam o mesmo resultado nas páginas de retorno OAuth.

Assim, um erro inesperado pode apresentar texto técnico ou em idioma divergente na interface. O fallback localizado só é usado quando o valor não é um `Error` com mensagem.

**Requisitos violados:** erros desconhecidos devem receber mensagem genérica localizada; mensagens brutas de APIs devem ficar restritas aos detalhes técnicos do log; a interface deve apresentar contexto localizado e recuperável.

**Correção necessária:** separar a mensagem pública da causa técnica, usar o contexto localizado para erros desconhecidos e preservar a causa somente no diagnóstico.

### 🟡 A-04 — Ordenação de extensões permanece fixada em pt-BR

**Plano afetado:** `internacionalizacao_automatica_extensao.md`.

**Evidência:** `src/core/installed-extensions.ts:293-295` chama `localeCompare` com a localidade literal `"pt-BR"`.

A ordenação não acompanha a localidade efetiva, contrariando os requisitos de formatação e ordenação por idioma suportado. O impacto prático é limitado pelo fato de os IDs das extensões serem predominantemente ASCII, mas o critério arquitetural continua não atendido.

**Correção necessária:** fornecer a localidade ou o comparador pela fronteira de apresentação, sem importar `vscode` no módulo puro.

### 🟡 A-05 — O helper da webview não emite os diagnósticos previstos

**Plano afetado:** `internacionalizacao_automatica_extensao.md`.

**Evidências:**

- `src/webview/localizacao.js:19-29` retorna `[chave]` quando a chave não existe e preserva `{parametro}` quando um parâmetro não é fornecido;
- não há registro de diagnóstico em nenhum dos dois caminhos;
- `test/localizacao-webview.test.cjs:18-24` verifica os fallbacks textuais, mas não verifica diagnóstico.

**Requisitos violados:** chave ausente e parâmetro ausente devem produzir fallback seguro acompanhado de diagnóstico, sem dados sensíveis.

**Correção necessária:** acrescentar diagnóstico seguro e testes que comprovem tanto o fallback quanto o registro.

## 4. Divergências e pendências do plano de correções 0.8.1

### 🔵 A-06 — A listagem semântica de extensões não foi implementada

O plano previa substituir a dependência de texto com quebras de linha por um container semântico rolável. Entretanto:

- `src/webview/dashboard.js:51` mantém o corpo do modal com `white-space: pre-wrap`;
- `src/webview/dashboard.js:1158-1170` continua montando a lista como texto simples com `\n` e marcadores.

A correção CSS principal existe e resolve a restrição de altura; este achado registra somente a parte estrutural do plano que não foi executada.

### 🔵 A-07 — O atalho direto para privacidade e termos não foi criado

`.github/ISSUE_TEMPLATE/config.yml:2-8` contém atalhos para o site e para o repositório upstream, mas não contém o atalho previsto para a Política de Privacidade e os Termos. O plano especificava esse link em `config.yml`.

### 🔵 A-08 — Falta a asserção planejada para “Apply” em inglês

`test/localizacao-webview.test.cjs:51-63` comprova a extração defensiva de `{ message: "Aplicar" }`, mas não contém a asserção específica que garante `comum.aplicar` como `"Aplicar"` em pt-BR e `"Apply"` em inglês, exigida pelo plano.

A validação dos catálogos passa, e a entrada pt-BR está correta; o achado é uma lacuna de regressão, não uma falha comprovada da tradução inglesa.

### 🔵 A-09 — A descrição pt-BR não contém todos os termos planejados

`package.nls.pt-br.json:4` contém a descrição de sincronização, mas omite a frase “Backup e restauração na nuvem.” prevista no plano. Os demais metadados e palavras-chave estão presentes.

### ⚪ A-10 — Testes visuais e renderização dos formulários sem evidência conclusiva

Não foram localizados registros que comprovem, na versão 0.8.1:

- o modal com mais de 25 extensões em viewport de 768 px ou 900 px, incluindo rolagem por mouse e teclado;
- os botões “Aplicar” e “Atualizar” em uma IDE real configurada em pt-BR;
- a renderização dos Issue Forms na interface do GitHub.

Estes itens ficam classificados como **não verificados**, e não como defeitos comprovados.

## 5. Pendência de publicação da otimização de descoberta

O VSIX local 0.8.1 contém o novo título por NLS, as 24 palavras-chave e as categorias `Other`, `Keymaps` e `Snippets`.

Entretanto, a [API pública do Open VSX](https://open-vsx.org/api/lksferreira/sync-antigravity) consultada durante a auditoria informava:

- versão pública mais recente: **0.8.0**;
- `displayName`: **Sync Antigravity**;
- descrição e categorias anteriores à otimização;
- oito tags antigas.

Portanto, a otimização está implementada no repositório e no artefato local, mas seu efeito de descoberta no marketplace ainda não estava publicado nem podia ser validado em produção no momento da consulta. Isso não invalida o código do plano, mas impede declarar concluído o resultado público de indexação.

## 6. Implementações confirmadas

### 6.1 Internacionalização automática

Foram confirmados no código:

- manifesto com placeholders NLS e propriedade `l10n`;
- catálogos inglês, pt-BR e alias genérico `pt`;
- resolução de qualquer variante de português para pt-BR e fallback para inglês em `src/localizacao/idioma.ts`;
- catálogo central com chamadas diretas a `vscode.l10n.t`;
- contrato único para os textos estáticos e dinâmicos da webview;
- HTML inicial localizado, sem hidratação tardia;
- serialização que neutraliza `<`, `>`, `&`, U+2028 e U+2029;
- helper puro da webview, sem DOM ou dependência de `vscode`;
- rótulos de sincronização separados das chaves técnicas persistidas;
- erros de domínio com códigos e parâmetros estáveis;
- datas da webview e do rollback usando a localidade resolvida;
- páginas OAuth com `lang` dinâmico e conteúdo localizado;
- workflows de release com validação dos seis arquivos de localização;
- documentação de manutenção e configurações F5 para os idiomas previstos.

### 6.2 Correções da versão 0.8.1

Foram confirmados:

- os três Issue Forms bilíngues e a desativação de issues em branco;
- o modal com altura máxima, layout flexível, cabeçalho e rodapé fixos e corpo rolável em `src/webview/dashboard.css:606-668` e `:749-756`;
- as seis entradas contextualizadas convertidas para strings nos catálogos pt-BR e `pt`;
- o validador rejeitando valores não escalares nos catálogos traduzidos;
- a extração defensiva de `.message` no helper da webview;
- o novo `displayName` por NLS, 24 palavras-chave e três categorias;
- a exclusão de imagens soltas e arquivos de desenvolvimento do VSIX;
- as notas das versões 0.8.0 e 0.8.1 nos changelogs;
- a atualização do lockfile com auditoria local sem vulnerabilidades.

## 7. Validações executadas nesta auditoria

| Comando ou verificação | Resultado |
| --- | --- |
| `npm run compile:tsc` | Aprovado, TypeScript strict sem erros |
| `npm test` | 46 testes aprovados, nenhuma falha |
| Cobertura do `npm test` | 99,68% de instruções e linhas, 100% de funções e 94,08% de branches |
| `npm run l10n:check` | Catálogos e extração consistentes |
| `npm audit --audit-level=high` | 0 vulnerabilidades |
| `npm run package:vsix` | Pacote gerado com sucesso |
| Conteúdo do VSIX | 25 arquivos; os seis arquivos de localização e os artefatos obrigatórios estão presentes |
| Arquivos proibidos no VSIX | Nenhum `.env`, credencial, `.agents`, `.metadocs`, captura ou ícone original na listagem |
| Manifesto interno do VSIX | Versão 0.8.1, metadados, categorias, palavras-chave e caminho `l10n` confirmados |
| Estado do Git antes da auditoria documental | Branch `main` limpa e alinhada com `origin/main` |

A suíte não executa o Extension Development Host. Por isso, os resultados acima não substituem os testes manuais de idioma, UI, OAuth e sincronização.

## 8. Decisão e condições para uma nova promoção

Nenhum plano foi movido para `.metadocs/implemented/`, e `HISTORY.md` e `ROADMAP.md` não foram alterados.

Antes de uma nova tentativa de `/feat`, é necessário:

1. corrigir A-01, A-03, A-04 e A-05;
2. implementar A-06 a A-09 ou revisar explicitamente o escopo aceito desses requisitos;
3. acrescentar testes de regressão para os textos do `DashboardProvider` e para os fallbacks;
4. executar e registrar a matriz manual de internacionalização e os testes visuais da versão 0.8.1;
5. gerar e inspecionar novamente o VSIX;
6. publicar a versão contendo os metadados e somente então verificar a indexação no Open VSX, caso o resultado público faça parte do aceite;
7. atualizar os planos para descrever a implementação e a validação efetivamente realizadas antes da promoção.
