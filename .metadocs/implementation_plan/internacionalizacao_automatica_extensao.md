# Plano de implementação: internacionalização automática da extensão

## Estado do documento

- **Situação:** aprovado, implementação autorizada.
- **Data de elaboração:** 16 de outubro de 2026.
- **Última revisão arquitetural:** 16 de outubro de 2026.
- **Escopo:** extensão Sync Antigravity executada no Antigravity IDE.
- **Idiomas iniciais:** inglês e português do Brasil.
- **Idioma padrão:** inglês.
- **Mudanças funcionais nesta etapa:** nenhuma. Este arquivo descreve a implementação futura.

## 1. Resumo executivo

A extensão deverá acompanhar automaticamente o idioma de exibição da IDE:

- quando a IDE estiver em qualquer variante de português, toda a experiência da extensão será apresentada em pt-BR;
- quando a IDE estiver em inglês, toda a experiência será apresentada em inglês;
- quando a IDE estiver em qualquer idioma não suportado, a extensão usará inglês;
- nenhuma preferência de idioma própria será criada ou sincronizada;
- a troca do idioma da IDE será percebida após a recarga normal exigida pela própria IDE;
- nenhum componente, fluxo de negócio ou painel será duplicado por idioma.

A implementação será construída sobre os mecanismos oficiais do ecossistema VS Code:

1. **package.nls.json** e **package.nls.pt-br.json** localizarão os campos estáticos do manifesto;
2. **vscode.l10n** localizará mensagens produzidas no processo da extensão;
3. uma ponte tipada enviará à webview um único catálogo já resolvido para o idioma ativo;
4. erros originados em módulos puros serão representados por códigos estáveis e somente traduzidos na fronteira de apresentação;
5. datas, números, contagens e ordenação usarão a localidade efetivamente suportada, e não qualquer idioma desconhecido informado pela IDE;
6. testes automatizados impedirão catálogos incompletos, parâmetros incompatíveis e regressões no fallback para inglês.

Essa arquitetura mantém uma única implementação funcional. Para adicionar outro idioma no futuro, será necessário acrescentar arquivos de tradução e os casos de formatação da nova localidade, sem copiar a webview, comandos, controladores ou serviços.

## 2. Motivação

Hoje a extensão possui textos em pt-BR distribuídos por diferentes camadas:

- manifesto da extensão;
- comandos e configuração;
- barra de status;
- notificações da IDE;
- painel e modais da webview;
- páginas locais do retorno OAuth abertas no navegador;
- progresso de upload e download;
- mensagens de validação e restauração;
- registros do canal de saída;
- rótulos de itens sincronizáveis;
- datas e ordenações fixadas em pt-BR.

Também existem duas mensagens em inglês no painel para seleção obrigatória de itens. Isso confirma que o problema não pode ser resolvido apenas traduzindo o HTML inicial.

Uma substituição condicional espalhada por cada arquivo produziria:

- duplicação de lógica;
- risco de telas parcialmente traduzidas;
- divergência entre mensagens equivalentes;
- dificuldade para adicionar novos idiomas;
- ausência de verificação automática de chaves e parâmetros;
- maior risco de introduzir HTML inseguro nas traduções da webview.

O objetivo deste plano é criar uma fronteira de localização única, previsível, testável e compatível com o empacotamento VSIX.

## 3. Estado atual verificado

### 3.1 Manifesto

O arquivo **package.json** está na versão 0.7.19 e contém diretamente em pt-BR:

- descrição pública;
- títulos dos comandos;
- descrição da configuração de extensões excluídas.

Não existem atualmente:

- propriedade **l10n**;
- **package.nls.json**;
- **package.nls.pt-br.json**;
- diretório **l10n**;
- ferramenta de extração ou validação de catálogos.

### 3.2 Processo da extensão

O arquivo **src/extension.ts** contém textos visíveis em:

- aviso de incompatibilidade com outra IDE;
- ações do aviso;
- barra de status e tooltip;
- restauração do último backup de layout;
- solicitação de recarga;
- notificações de falha e sucesso.

### 3.3 Webview

O HTML inicial é produzido em **src/providers/dashboard-provider.ts** com o atributo de idioma fixado em pt-BR.

Esse provedor também produz:

- toasts;
- títulos de progresso;
- mensagens de erro;
- rótulos do explorador de dados;
- mensagens de aplicação, atualização e exclusão de perfil.

O arquivo **src/webview/dashboard.js** contém os textos dinâmicos de:

- modais de confirmação e entrada;
- seleção de itens;
- prévia de restauração;
- lista e estado das extensões;
- paginação;
- explorador de dados;
- progresso;
- solicitação de reinicialização;
- cartões de perfil;
- estados de carregamento, vazio e erro;
- atributos title, alt e rótulos acessíveis;
- formatação de datas fixada em pt-BR;
- ordenação de extensões fixada em pt-BR.

### 3.4 Núcleo e serviços

Há mensagens potencialmente visíveis ou registradas em:

- **src/core/google-auth.ts**;
- **src/core/google-drive.ts**;
- **src/core/sync-controller.ts**;
- **src/core/profile-validator.ts**;
- **src/models/layout-profile.ts**;
- **src/core/logger.ts**;
- **src/models/interfaces.ts**.

Os módulos de validação atualmente usam o texto de **Error.message** como parte de seu contrato. Alguns testes verificam essas mensagens em pt-BR. Esse acoplamento precisa ser removido para que a lógica permaneça independente do idioma.

### 3.5 Site e documentação

O site já possui localização própria em **site/assets/localizacao.js**. Ele usa o navegador, armazenamento local e fuso horário, portanto não deve ser reutilizado pela extensão:

- o site não tem acesso ao idioma da IDE;
- a extensão não deve inferir idioma por fuso horário;
- o site permite troca manual, enquanto a extensão deve seguir a IDE;
- os catálogos têm conteúdos e ciclos de publicação diferentes.

README e changelog são documentos Markdown estáticos. Eles continuarão com:

- arquivo principal em inglês;
- arquivo separado em pt-BR;
- link visível no início do documento principal.

Eles não participam da detecção automática em tempo de execução.

## 4. Objetivos funcionais

### 4.1 Regras de seleção

| Idioma informado pela IDE | Idioma efetivo da extensão |
| --- | --- |
| pt, pt-BR, pt-PT e qualquer outra variante de português | pt-BR |
| en, en-US, en-GB e demais variantes de inglês | inglês |
| es, fr, de, ja, zh e qualquer outro idioma não cadastrado | inglês |
| valor vazio, inválido ou inesperado | inglês |

O resolvedor normalizará espaços, diferenças entre maiúsculas e minúsculas e os separadores `-` e `_`. Toda entrada cuja subtag primária seja `pt` será tratada como português e usará o catálogo pt-BR, inclusive `pt`, `pt-BR`, `pt-PT`, `PT_br` e variantes futuras. Essa é uma decisão explícita de produto: enquanto houver somente uma tradução em português, ela será oferecida a todos os usuários cuja IDE declare qualquer variante desse idioma.

### 4.2 Superfícies obrigatórias

A implementação somente estará completa quando abranger:

- nome e descrição localizáveis no manifesto;
- comandos da Paleta de Comandos;
- títulos e descrições de configurações;
- barra de status e tooltip;
- avisos, confirmações e notificações;
- todo o HTML estático da webview;
- todo texto criado dinamicamente pela webview;
- estados de carregamento, vazio, sucesso, erro e indisponibilidade;
- títulos, placeholders, tooltips, textos alternativos e ARIA labels;
- rótulos dos itens de sincronização;
- prévia de restauração e estados de extensões;
- progresso de leitura e gravação no Google Drive;
- mensagens do fluxo de login;
- páginas locais de sucesso e erro do OAuth;
- restauração e rollback de layout;
- explorador de dados e paginação;
- datas, contagens, plurais e ordenação;
- contexto legível dos registros da extensão.

### 4.3 Resultado esperado

Não haverá arquivos como:

- dashboard-en.js;
- dashboard-pt-BR.js;
- dashboard-en.html;
- dashboard-pt-BR.html;
- extension-en.ts;
- extension-pt-BR.ts.

Haverá somente um fluxo funcional e catálogos de tradução.

## 5. Fora de escopo

Este trabalho não deverá:

- detectar o idioma do sistema operacional separadamente da IDE;
- criar uma configuração própria para sobrescrever o idioma;
- sincronizar idioma no Google Drive;
- traduzir nomes de perfil, nomes de workspace, nomes de arquivos ou nomes de extensões;
- traduzir IDs, chaves JSON, caminhos, códigos de erro externos ou identificadores de API;
- traduzir conteúdo pertencente à pessoa usuária;
- traduzir respostas retornadas pelo Google; será localizado apenas o contexto produzido pela extensão;
- alterar o formato persistido dos perfis;
- alterar as chaves settings, extensions, keybindings, snippets e layout;
- alterar o desenho visual do painel;
- unificar o catálogo do site com o catálogo da extensão;
- tentar trocar automaticamente README e changelog no marketplace;
- incluir um seletor manual de idioma no painel;
- incrementar a versão ou publicar uma release antes de aprovação específica.

O processo auxiliar **src/core/layout-replacement-helper.js** continuará fora da localização de interface. Ele é executado com stdio ignorado, depois do encerramento da IDE, e suas mensagens são diagnósticos internos não apresentados ao usuário. Seu comportamento e formato de manifesto não devem ser alterados por esta funcionalidade.

## 6. Decisões arquiteturais

### 6.1 Usar vscode.l10n como mecanismo principal

O projeto declara compatibilidade com VS Code 1.90, enquanto a API **vscode.l10n** existe desde a versão 1.73.

Ela será usada porque:

- lê o idioma preferencial da própria IDE;
- carrega automaticamente o bundle correspondente;
- usa o texto-fonte em inglês quando não existe tradução;
- oferece interpolação de parâmetros;
- integra-se à ferramenta oficial de extração;
- evita uma preferência paralela de idioma;
- mantém o comportamento esperado por extensões do ecossistema.

Referências:

- [Ferramentas oficiais de localização do VS Code](https://github.com/microsoft/vscode-l10n);
- [Referência da API vscode.l10n](https://code.visualstudio.com/api/references/vscode-api).

### 6.2 Inglês como fonte e fallback

As mensagens-base passadas ao mecanismo oficial serão escritas em inglês. O bundle pt-BR fornecerá as traduções.

Essa escolha é necessária porque:

- **vscode.l10n.t** usa o texto-base como chave de extração;
- a ausência de bundle ou de entrada retorna naturalmente o inglês;
- qualquer idioma não suportado atende ao requisito sem lógica condicional espalhada;
- o catálogo inglês pode ser revisado diretamente como apresentação internacional.

### 6.3 package.nls para contribuições estáticas

O processo da extensão não controla os textos lidos pela IDE antes da ativação. Por isso, campos estáticos do manifesto usarão placeholders:

~~~json
{
  "displayName": "%extensao.nome%",
  "description": "%extensao.descricao%"
}
~~~

Os valores estarão em:

- **package.nls.json**, em inglês;
- **package.nls.pt-br.json**, em pt-BR.

A mesma estratégia será aplicada a comandos, categorias próprias e configurações.

### 6.4 Catálogo central para textos em tempo de execução

Será criado **src/localizacao/catalogo.ts** como adaptador do Extension Host e único ponto de declaração dos textos-base da extensão. Esse arquivo pertencerá deliberadamente à camada que pode importar **vscode**; módulos puros e testes executados diretamente pelo Node não o importarão.

O catálogo:

- agrupará mensagens por domínio;
- chamará **vscode.l10n.t** com textos-base literais, permitindo extração oficial;
- aceitará parâmetros nomeados;
- fornecerá chaves semânticas estáveis para o restante do projeto;
- exporá tipos derivados das próprias chaves;
- impedirá que serviços conheçam os arquivos JSON de idioma;
- usará `comment` estável quando mensagens-base idênticas exigirem contextos ou traduções diferentes;
- não usará **@vscode/l10n** no processo principal da extensão, pois essa biblioteca é reservada aos subprocessos que não recebem a API do Extension Host.

Exemplo conceitual:

~~~ts
const catalogo = {
    'perfil.criado': ({ nome }: { nome: string }) =>
        vscode.l10n.t('Profile "{name}" created', { name: nome }),
    'perfil.acao.aplicar': () =>
        vscode.l10n.t({
            message: 'Apply',
            comment: ['Ação que aplica um perfil de sincronização'],
        }),
} as const;
~~~

As chaves semânticas são identificadores internos consumidos pelo projeto; elas não substituem as chaves do bundle oficial, que são derivadas da mensagem-base em inglês e, quando necessário, do `comment`. Comentários de desambiguação fazem parte da identidade da entrada extraída, portanto serão concisos, estáveis e alterados somente junto com os dois bundles. Mensagens repetidas com o mesmo sentido e a mesma tradução compartilharão a entrada, sem comentários artificiais. O exemplo não representa a lista final completa.

### 6.5 Não acoplar regras puras à IDE

Módulos puros como validadores e modelos não importarão **vscode** apenas para traduzir erros.

A suíte atual compila com TypeScript e executa testes por **node --test**, fora do Extension Host. Por isso, a arquitetura separará explicitamente:

- adaptadores de apresentação que importam **vscode**, validados por compilação, extração estática e testes no Extension Development Host;
- contratos, resolvedores, serializadores e formatadores puros, importáveis e testáveis diretamente pelo Node;
- chamadas diretas a **vscode.l10n.t** no catálogo, preservando a compatibilidade com o extrator oficial em vez de ocultá-las atrás de uma função genérica que ele não reconheça.

Será criado **src/core/erro-da-extensao.ts**, contendo um erro estruturado com:

- código estável;
- parâmetros seguros;
- causa opcional;
- mensagem técnica mínima para diagnóstico.

As fronteiras de apresentação converterão o código em texto localizado.

Benefícios:

- testes não dependem do módulo vscode;
- regras de segurança não variam conforme idioma;
- asserções usam códigos, não frases traduzidas;
- o idioma não contamina dados persistidos;
- mensagens podem mudar sem alterar o contrato de domínio.

### 6.6 Ponte única para a webview

A webview não possui acesso direto a **vscode.l10n**. O provedor resolverá **TextosWebview** uma única vez ao criar o painel e usará a mesma instância nas duas fronteiras de renderização:

1. o HTML inicial estático será interpolado pelo **DashboardProvider** antes de ser entregue à webview;
2. o objeto localizado será serializado com segurança e injetado antes dos scripts do painel;
3. **dashboard.js** consumirá esse objeto somente para modais, notificações e elementos criados ou atualizados dinamicamente.

Não haverá hidratação posterior do HTML inicial por atributos `data-i18n`. Dessa forma, a tela já nasce no idioma correto, sem flash de conteúdo em outro idioma e sem risco de o HTML estático e o dinâmico usarem catálogos diferentes.

Fluxo:

~~~text
idioma da IDE
    |
    +-- package.nls --------------------------> manifesto, comandos e configurações
    |
    +-- vscode.l10n --------------------------> extensão, serviços, notificações e logs
    |       |
    |       +-- criarTextosWebview() --------> objeto tipado único de textos resolvidos
    |                                               |
    |                                               +-- interpolação do HTML inicial
    |                                               |
    |                                               +-- serialização segura com nonce
    |                                                        |
    |                                                        +-- dashboard.js dinâmico
    |
    +-- resolverLocalidade() -----------------> lang, datas, números e ordenação

idioma não suportado -------------------------> inglês
~~~

O arquivo **src/localizacao/textos-webview.ts** definirá o contrato completo da webview. O script do painel consumirá apenas chaves desse objeto.

Não haverá requisição de tradução por mensagem nem duplicação de catálogo no navegador.

### 6.7 Serialização segura

O objeto de textos será serializado dentro de um script autorizado pelo nonce da CSP.

A serialização deverá neutralizar:

- sinal de menor;
- sinal de maior;
- ampersand;
- separadores Unicode U+2028 e U+2029.

Traduções não poderão conter HTML executável. Quando uma frase precisar destacar um nome de perfil:

- o texto será separado de sua marcação;
- valores dinâmicos serão escapados;
- atributos passarão pelo escape apropriado;
- não será usado eval;
- a política CSP atual continuará restritiva.

### 6.8 Formatação dependente de localidade

Será criado **src/localizacao/idioma.ts**, sem dependência de vscode, para normalizar o idioma suportado.

O resultado controlará:

- atributo lang do HTML;
- **Intl.DateTimeFormat**;
- **Intl.NumberFormat** quando aplicável;
- **Intl.Collator** para ordenação legível;
- escolha entre formas singular e plural.

Localidades iniciais:

- inglês: en-US;
- português do Brasil: pt-BR.

Uma IDE em espanhol não usará formatação espanhola, pois espanhol ainda não será um idioma suportado. Ela receberá a experiência completa em inglês.

### 6.9 Idioma resolvido uma vez por ativação

O idioma será lido durante a ativação e permanecerá estável naquela sessão.

Isso evita:

- painéis com dois idiomas simultâneos;
- reconstruções desnecessárias;
- estado divergente entre extensão e webview.

A alteração do idioma de exibição da IDE normalmente exige recarga. Após a recarga, a extensão será ativada novamente e receberá o novo idioma.

### 6.10 Documentação estática preservada

README e changelog continuarão bilíngues em arquivos separados porque o marketplace não executa a extensão para escolher o documento.

A implementação não removerá nem substituirá:

- **README.md**;
- **README.pt-BR.md**;
- **CHANGELOG.md**;
- **CHANGELOG.pt-BR.md**;
- seus avisos recíprocos de idioma.

## 7. Estrutura de arquivos proposta

~~~text
sync-antigravity/
├── l10n/
│   ├── bundle.l10n.json
│   └── bundle.l10n.pt-br.json
├── package.nls.json
├── package.nls.pt-br.json
├── src/
│   ├── localizacao/
│   │   ├── catalogo.ts
│   │   ├── idioma.ts
│   │   ├── itens-sincronizacao.ts
│   │   ├── textos-webview.ts
│   │   └── serializacao-webview.ts
│   ├── webview/
│   │   ├── localizacao.js
│   │   └── dashboard.js
│   ├── core/
│   │   └── erro-da-extensao.ts
│   └── ...
└── test/
    ├── localizacao.test.ts
    ├── localizacao-webview.test.ts
    └── erro-da-extensao.test.ts
~~~

Os nomes finais poderão ser ajustados durante a implementação apenas para respeitar uma convenção já encontrada no código. A separação de responsabilidades não deverá ser reduzida.

## 8. Responsabilidade de cada novo arquivo

### 8.1 package.nls.json

Catálogo inglês para campos estáticos do manifesto.

Deverá conter, no mínimo:

- nome público;
- descrição;
- título de Abrir painel;
- título de Reverter último layout;
- título da seção de configuração;
- descrição de extensões excluídas.

### 8.2 package.nls.pt-br.json

Catálogo pt-BR com exatamente as mesmas chaves de **package.nls.json**.

Diferenças de chave, valores vazios ou placeholders incompatíveis deverão falhar nos testes.

### 8.3 l10n/bundle.l10n.json

Bundle-base gerado a partir dos usos literais de **vscode.l10n.t**.

Ele será versionado para:

- permitir revisão de mudanças de texto;
- servir como contrato de tradução;
- permitir comparação automatizada com o bundle pt-BR;
- tornar a release reproduzível.

### 8.4 l10n/bundle.l10n.pt-br.json

Traduções brasileiras das mensagens de tempo de execução.

Não conterá lógica, HTML ou dados dinâmicos. Parâmetros deverão preservar exatamente os nomes declarados no texto-base.

### 8.5 src/localizacao/catalogo.ts

Responsável por:

- declarar as mensagens-base;
- organizar namespaces;
- acionar **vscode.l10n.t**;
- interpolar parâmetros nomeados;
- retornar inglês automaticamente como fallback;
- localizar erros estruturados;
- fornecer textos para notificações, progresso e logs.

Esse módulo é um adaptador do Extension Host. Ele será validado pelo compilador, pelo extrator oficial e pelos testes manuais na IDE, mas não será carregado pelo executor **node --test**. Os módulos puros consumidos por ele permanecerão em arquivos separados.

Namespaces previstos:

- geral;
- compatibilidade;
- autenticacao;
- perfil;
- sincronizacao;
- extensoes;
- layout;
- explorador;
- validacao;
- oauth;
- logs;
- acessibilidade.

### 8.6 src/localizacao/idioma.ts

Responsável por:

- normalizar a entrada;
- resolver o idioma suportado;
- fornecer a localidade de formatação;
- indicar o valor correto do atributo lang;
- permanecer puro e coberto por testes unitários.

### 8.7 src/localizacao/itens-sincronizacao.ts

Criará os itens visuais a partir das definições técnicas estáveis:

- settings;
- extensions;
- keybindings;
- snippets;
- layout.

Somente os rótulos serão localizados. Chaves, nomes de arquivo, ícones e valores padrão continuarão invariáveis.

### 8.8 src/localizacao/textos-webview.ts

Definirá uma interface tipada para todos os textos consumidos pela webview.

Grupos previstos:

- cabeçalho e login;
- conta;
- ações rápidas;
- perfis;
- modais genéricos;
- criação e manutenção de perfil;
- seleção de itens;
- prévia;
- extensões;
- reinicialização;
- progresso;
- explorador;
- paginação;
- estados e validações;
- acessibilidade.

Esse arquivo será a única origem dos textos do painel. O **DashboardProvider** usará seu resultado para o HTML inicial, e **dashboard.js** usará o mesmo resultado para renderizações dinâmicas. Nenhum dos dois declarará traduções paralelas.

Textos que dependem de valores conhecidos apenas no navegador serão enviados como templates sem HTML, com parâmetros nomeados, por exemplo `{nomePerfil}`, `{paginaAtual}` e `{totalPaginas}`. Formas singular e plural serão propriedades distintas do contrato.

### 8.9 src/localizacao/serializacao-webview.ts

Responsável exclusivamente por converter o contrato de textos e a configuração de localidade em uma carga segura para o HTML.

Será testado com:

- sinais de HTML;
- aspas;
- ampersand;
- U+2028;
- U+2029;
- texto com parâmetros;
- caracteres acentuados.

### 8.10 src/webview/localizacao.js

Módulo puro carregado antes de **dashboard.js**, responsável pela leitura e formatação dos textos dinâmicos. Ele não importará **vscode**, não acessará o DOM e exporá uma superfície pequena que possa ser executada tanto no navegador quanto nos testes em Node.

Contrato conceitual:

~~~js
function traduzir(chave, parametros = {}) {
}

function selecionarPlural(quantidade, singular, plural) {
    return quantidade === 1 ? singular : plural;
}
~~~

O helper deverá:

- localizar a chave no objeto imutável injetado;
- substituir somente parâmetros nomeados declarados como `{parametro}`;
- preservar números e valores booleanos sem coerção ambígua;
- tratar zero com a forma plural;
- rejeitar ou diagnosticar parâmetros ausentes sem produzir texto vazio;
- retornar um fallback inglês seguro e registrar diagnóstico quando uma chave estiver ausente;
- retornar somente texto, nunca HTML confiável;
- deixar o escape para a operação de destino: `textContent`, atributo escapado ou construção HTML controlada.

Os testes importarão esse módulo diretamente no Node. O empacotamento deverá copiá-lo para **dist/webview/localizacao.js**, e o HTML o carregará com o mesmo nonce antes de **dashboard.js**.

### 8.11 src/core/erro-da-extensao.ts

Definirá:

- classe de erro;
- códigos de erro permitidos;
- parâmetros serializáveis;
- preservação de causa;
- guard para reconhecer o erro em catches.

Ele não terá dependência de idioma nem da API vscode.

## 9. Arquivos existentes que serão alterados

| Arquivo | Alteração planejada | Conexão arquitetural |
| --- | --- | --- |
| **package.json** | Adicionar propriedade l10n, placeholders do manifesto, scripts de localização e dependência oficial de desenvolvimento | ponto de entrada dos bundles e do package.nls |
| **package-lock.json** | Registrar de forma determinística a ferramenta oficial de localização | build reproduzível |
| **src/extension.ts** | Localizar barra de status, aviso de IDE, rollback e recarga; inicializar contexto de idioma | fronteira principal da IDE |
| **src/providers/dashboard-provider.ts** | Usar catálogo, criar textos da webview, injetar carga segura, localizar toasts e títulos | ponte extensão–webview |
| **src/webview/localizacao.js** | Ler templates, interpolar parâmetros e selecionar singular ou plural sem acessar a IDE ou o DOM | formatação dinâmica testável em Node |
| **src/webview/dashboard.js** | Remover frases fixas, consumir o contrato injetado, formatar datas e contagens pela localidade | interface dinâmica única |
| **src/models/interfaces.ts** | Separar definição técnica de item e rótulo localizado | impede que idioma faça parte do modelo persistente |
| **src/core/google-auth.ts** | Localizar erros, logs e páginas HTML do retorno OAuth; ajustar lang | experiência de autenticação |
| **src/core/google-drive.ts** | Localizar progresso, contexto de erros e registros | progresso e falhas de sincronização |
| **src/core/sync-controller.ts** | Localizar avisos, registros e notificações; propagar erros estruturados | aplicação e rollback |
| **src/core/profile-validator.ts** | Substituir mensagens de erro por códigos e retornar dados semânticos de prévia | domínio independente de idioma |
| **src/models/layout-profile.ts** | Substituir mensagens de validação por erros estruturados | modelo independente de idioma |
| **src/core/logger.ts** | Localizar rótulos legíveis do canal e aceitar contexto já localizado | saída consistente |
| **test/profile-validator.test.ts** | Verificar códigos e parâmetros, não frases pt-BR | teste estável entre idiomas |
| **test/layout-profile.test.ts** | Verificar códigos e parâmetros | teste estável entre idiomas |
| **tsconfig.test.json** | Incluir novos testes se necessário, preservando strict | compilação da suíte |
| **.github/workflows/release.yml** | Validar catálogos e presença dos arquivos no VSIX | impede release incompleta |
| **docs/DESENVOLVIMENTO.md** | Documentar extração, tradução, validação e adição de idioma | manutenção futura |
| **README.md** | Explicar detecção automática e fallback em inglês | documentação pública principal |
| **README.pt-BR.md** | Explicar o mesmo comportamento em pt-BR | documentação pública brasileira |
| **ROADMAP.md** | Registrar a nova capacidade após implementação validada | rastreabilidade |
| **HISTORY.md** | Registrar conclusão e link para metadoc implementado | histórico arquitetural |
| **CHANGELOG.md** | Registrar a entrega em inglês quando a versão for preparada | release bilíngue |
| **CHANGELOG.pt-BR.md** | Registrar conteúdo equivalente em pt-BR | release bilíngue |

### 9.1 Arquivos que não devem ser alterados sem evidência de necessidade

- **src/webview/dashboard.css**: somente será modificado se testes mostrarem quebra por expansão de texto.
- **webpack.config.js**: não deverá copiar bundles que o VSIX já inclui pela raiz; só será alterado se o empacotamento real provar essa necessidade.
- **.vscodeignore**: já não exclui package.nls nem l10n; será alterado apenas se a inspeção do VSIX indicar problema.
- **site/assets/localizacao.js**: possui responsabilidade própria e permanecerá independente.
- documentos legais: não mudam por esta funcionalidade.

## 10. Contratos de dados

### 10.1 Idioma

Contrato conceitual:

~~~ts
type IdiomaSuportado = 'en' | 'pt-BR';

interface ContextoDeIdioma {
    idiomaDaIde: string;
    idiomaEfetivo: IdiomaSuportado;
    localidade: 'en-US' | 'pt-BR';
    idiomaHtml: 'en' | 'pt-BR';
}
~~~

### 10.2 Mensagem localizável

Contrato conceitual:

~~~ts
interface MensagemLocalizavel {
    chave: ChaveTraducao;
    parametros?: Readonly<Record<string, string | number | boolean>>;
}
~~~

Parâmetros não aceitarão objetos arbitrários. Isso reduz o risco de serialização acidental de tokens, erros completos ou estruturas remotas.

### 10.3 Erro estruturado

Contrato conceitual:

~~~ts
class ErroDaExtensao extends Error {
    readonly codigo: CodigoErro;
    readonly parametros: Readonly<Record<string, string | number | boolean>>;
    readonly cause?: unknown;
}
~~~

O código será usado para localizar a mensagem. A causa completa ficará restrita ao diagnóstico e nunca será inserida diretamente como HTML.

### 10.4 Carga inicial da webview

Contrato conceitual:

~~~ts
interface LocalizacaoDaWebview {
    idioma: 'en' | 'pt-BR';
    localidade: 'en-US' | 'pt-BR';
    textos: TextosWebview;
}
~~~

Esse contrato será somente leitura e existirá antes da execução de **dashboard.js**.

O **DashboardProvider** será o único responsável por criá-lo. Primeiro usará `textos` para montar todo o HTML inicial e, depois, serializará exatamente a mesma instância para as renderizações dinâmicas. O script do navegador não substituirá textos estáticos após o carregamento.

### 10.5 Prévia semântica

Detalhes de prévia não deverão ser frases prontas produzidas pelo validador. Em vez disso, deverão transportar fatos:

- item ausente;
- bytes validados;
- quantidade de extensões;
- quantidade de arquivos de snippets;
- quantidade de entradas de layout.

A camada de apresentação escolherá a frase e o plural corretos.

## 11. Convenções dos catálogos

### 11.1 Chaves

As chaves internas deverão:

- representar intenção, não posição visual;
- permanecer estáveis quando o layout mudar;
- evitar numeração sem contexto;
- usar namespace;
- não incluir o idioma.

Essas chaves pertencem ao contrato interno e à webview. No bundle oficial, a chave será a própria mensagem-base em inglês. Quando duas mensagens-base iguais precisarem de sentidos ou traduções diferentes, a chamada usará a forma objeto de **vscode.l10n.t** com um `comment` estável, produzindo identidades distintas na extração. Alterar esse comentário exigirá atualizar o bundle-base e o bundle pt-BR na mesma mudança.

Exemplos adequados:

- geral.cancelar;
- perfil.acao.aplicar;
- perfil.confirmacao.excluir;
- extensoes.estado.instalar;
- layout.erro.workspaceObrigatorio;
- explorador.paginacao.proxima;
- autenticacao.status.conectada;
- acessibilidade.dispensarNotificacao.

Exemplos inadequados:

- texto1;
- botaoVerde;
- fraseModal3;
- aplicarPtBr;
- applyEnglish.

### 11.2 Parâmetros

Parâmetros serão nomeados:

- nomePerfil;
- quantidade;
- nomeItem;
- nomeArquivo;
- nomeIde;
- data;
- codigo;
- caminho.

Uma tradução deverá preservar todos os parâmetros da mensagem-base, sem adicionar nem remover nomes.

### 11.3 Plural

Enquanto não houver suporte a ICU MessageFormat, singular e plural serão entradas diferentes.

Exemplos:

- uma extensão para instalar;
- duas ou mais extensões para instalar;
- um item concluído;
- dois ou mais itens concluídos.

Não será mantida a forma extensão(ões).

Na webview, **selecionarPlural(quantidade, singular, plural)** escolherá a chave antes da interpolação. Somente o valor numérico `1` usará o singular; zero, valores negativos defensivos e qualquer outro número usarão o plural. Essa regra é suficiente para inglês e pt-BR e ficará isolada para futura substituição por **Intl.PluralRules** quando um novo idioma exigir outras categorias.

### 11.4 Conteúdo técnico

Permanecerão invariáveis:

- Sync Antigravity;
- Antigravity IDE;
- Google Drive;
- OAuth;
- PKCE;
- JSON;
- VSIX;
- Open VSX;
- nomes de arquivos;
- IDs de extensões;
- nomes de comandos internos;
- códigos e caminhos.

## 12. Fases de implementação

### Fase 0: prova de compatibilidade no Antigravity

Antes da migração completa:

1. adicionar temporariamente a estrutura mínima de l10n em uma branch de trabalho;
2. criar uma mensagem de teste não publicada;
3. executar o Extension Development Host em inglês;
4. executar em pt-BR;
5. confirmar carregamento de **vscode.l10n.bundle** em pt-BR;
6. confirmar fallback em um terceiro idioma;
7. confirmar resolução de **package.nls** em comandos.

Se o Antigravity não carregar o mecanismo oficial apesar da compatibilidade declarada, a implementação deverá parar e o plano será revisado. Não será introduzido silenciosamente um carregador alternativo.

Critério de saída:

- l10n de runtime e package.nls confirmados no Antigravity.

### Fase 1: infraestrutura e manifesto

1. adicionar a propriedade l10n ao manifesto;
2. criar os dois package.nls;
3. substituir valores estáticos por placeholders;
4. adicionar **@vscode/l10n-dev** somente como dependência de desenvolvimento, com versão exata;
5. gerar o bundle-base;
6. criar o bundle pt-BR;
7. criar o script dedicado **npm run l10n:check** para extração e consistência dos catálogos;
8. manter **npm test** independente do Extension Host;
9. confirmar que o marketplace continua exibindo o texto inglês padrão.

Critério de saída:

- comandos e configurações mudam conforme idioma;
- idioma não suportado recebe inglês;
- nenhum valor do manifesto aparece como placeholder literal.

### Fase 2: contexto de idioma e catálogo

1. implementar normalização pura;
2. implementar contexto de idioma imutável;
3. mapear qualquer subtítulo primário `pt` para pt-BR;
4. criar o catálogo adaptador do Extension Host com chamadas diretas a **vscode.l10n.t**;
5. documentar e aplicar `comment` somente nas colisões contextuais;
6. garantir que testes Node não importem o adaptador que depende de **vscode**;
7. definir interpolação por parâmetros nomeados;
8. mapear os primeiros erros estruturados;
9. adicionar testes de idioma e fallback;
10. documentar convenções de chave.

Critério de saída:

- qualquer módulo de apresentação consegue solicitar uma mensagem sem conhecer JSON de idioma.

### Fase 3: itens de sincronização e dados semânticos

1. separar definição técnica e rótulo visual;
2. garantir que syncKeys permaneçam idênticas;
3. localizar os cinco rótulos;
4. substituir detalhes de prévia prontos por dados semânticos;
5. converter validações puras para **ErroDaExtensao**;
6. atualizar testes para códigos e parâmetros;
7. validar perfis antigos.

Critério de saída:

- nenhum idioma é persistido em meta.json, sync-meta.json ou arquivos de perfil;
- validação produz o mesmo resultado em todos os idiomas.

### Fase 4: extensão e serviços

Migrar, em pequenos grupos:

1. ativação e compatibilidade;
2. barra de status;
3. comando de rollback;
4. autenticação;
5. Google Drive;
6. controlador de sincronização;
7. logger.

Cada grupo deverá:

- usar o catálogo;
- preservar dados técnicos;
- envolver erros externos com contexto localizado;
- evitar notificação duplicada;
- manter a causa para diagnóstico;
- passar por compilação antes do próximo grupo.

Critério de saída:

- todas as mensagens fora da webview seguem o idioma efetivo.

### Fase 5: webview

1. criar o contrato **TextosWebview**;
2. preencher o contrato pelo catálogo;
3. implementar serialização segura;
4. definir lang dinamicamente;
5. migrar o HTML inicial para interpolação direta no **DashboardProvider**;
6. criar **src/webview/localizacao.js** sem dependência do DOM ou de **vscode**;
7. carregar o helper com nonce antes de **dashboard.js**;
8. implementar leitura de chave, parâmetros nomeados, fallback diagnóstico e plural explícito;
9. adicionar testes Node dedicados ao helper;
10. migrar modais genéricos;
11. migrar criação, aplicação, atualização e exclusão;
12. migrar prévia e extensões;
13. migrar explorador e paginação;
14. migrar progresso e reinicialização;
15. migrar carregamentos, estados vazios e validações;
16. migrar title, alt e ARIA labels;
17. substituir data fixa por **Intl.DateTimeFormat**;
18. substituir ordenação fixa por **Intl.Collator**;
19. revisar singular e plural;
20. executar busca por frases residuais.

Critério de saída:

- **dashboard.js** não contém frases de interface;
- o HTML inicial é entregue já localizado e não passa por hidratação tardia;
- **localizacao.js** é coberto por testes executados em Node;
- nenhuma tradução contém HTML executável;
- a webview abre sem flash no idioma incorreto.

### Fase 6: OAuth no navegador

1. localizar título e conteúdo da página pendente;
2. localizar sucesso;
3. localizar falha;
4. definir lang;
5. escapar a mensagem de erro;
6. preservar estilos e efeito visual;
7. confirmar fechamento automático apenas no sucesso;
8. testar falha de navegador, timeout, state inválido e consentimento negado.

Critério de saída:

- todo conteúdo produzido pela extensão no navegador acompanha a IDE.

### Fase 7: automação e testes

1. adicionar testes unitários;
2. adicionar **npm run l10n:check** para validação dos catálogos;
3. adicionar extração oficial ao script dedicado;
4. executar **npm run l10n:check** no CI, no workflow de release e no preflight de empacotamento;
5. manter **npm test** focado nas regras puras e sem carregamento do módulo **vscode**;
6. atualizar listas explícitas do comando de testes;
7. preservar cobertura mínima de 80%;
8. validar TypeScript strict;
9. gerar pacote de produção;
10. inspecionar o VSIX;
11. atualizar o workflow de release.

Critério de saída:

- uma chave ausente ou parâmetro incompatível bloqueia CI e release.

### Fase 8: documentação e rastreabilidade

Somente após implementação e validação:

1. atualizar README em inglês;
2. atualizar README pt-BR com conteúdo equivalente;
3. atualizar documentação de desenvolvimento;
4. atualizar roadmap;
5. registrar histórico;
6. atualizar changelog inglês;
7. atualizar changelog pt-BR;
8. promover este documento para **.metadocs/implemented/**;
9. registrar a versão apenas quando a release for definida.

Critério de saída:

- código, documentação e processo de manutenção descrevem o mesmo comportamento.

## 13. Inventário mínimo de mensagens

### 13.1 Geral

- Confirmar.
- Cancelar.
- Fechar.
- Atualizar.
- Voltar.
- Mais tarde.
- Desconhecido.
- Erro desconhecido.
- Item.
- Validado.
- Carregando.

### 13.2 Compatibilidade e barra de status

- extensão exclusiva do Antigravity;
- IDE atualmente usada;
- continuar;
- fechar;
- sessão iniciada;
- início de sessão necessário;
- abrir painel.

### 13.3 Autenticação

- iniciar sessão com Google;
- iniciando sessão;
- sessão conectada;
- encerrar sessão;
- confirmação de encerramento;
- sessão iniciada;
- sessão encerrada;
- falha de abertura do navegador;
- timeout;
- consentimento negado;
- state incompatível;
- código ausente;
- token inválido;
- credenciais de build ausentes.

### 13.4 Perfis

- criar;
- aplicar;
- atualizar;
- excluir;
- confirmação de exclusão;
- nome obrigatório;
- caracteres permitidos;
- perfil criado;
- perfil aplicado;
- perfil atualizado;
- perfil excluído;
- aplicação cancelada;
- dados vazios;
- prévia expirada;
- lista vazia;
- carregamento.

### 13.5 Itens de sincronização

- Configurações / Settings;
- Extensões / Extensions;
- Atalhos / Keyboard shortcuts;
- Snippets / Snippets;
- Layout / Layout;
- seleção obrigatória;
- item não presente;
- tamanho validado;
- contagem de arquivos;
- contagem de extensões.

### 13.6 Prévia e extensões

- prévia da restauração;
- itens restaurados;
- layout global;
- layout de workspace;
- escolher workspace;
- nenhuma chave global;
- nenhum layout de workspace;
- instalar;
- remover;
- presente;
- todas instaladas;
- lista de extensões;
- confirmação adicional;
- extensão sem nome;
- sincronização de extensões;
- pular.

### 13.7 Progresso e reinicialização

- preparando;
- localizando perfil;
- criando pasta;
- baixando item;
- enviando item;
- salvando metadados;
- atualizando metadados;
- concluídos;
- reinicialização necessária;
- reiniciar agora;
- salvar trabalho;
- perfil aplicado.

### 13.8 Explorador

- explorador de dados;
- raiz;
- pasta;
- arquivo;
- texto;
- imagem;
- nome;
- tipo;
- tamanho;
- modificado;
- pasta vazia;
- visualizar;
- carregando arquivos;
- anterior;
- próxima;
- página.

### 13.9 Layout e rollback

- nenhum backup disponível;
- restaurar backup;
- data do backup;
- backup restaurado;
- recarregar agora;
- workspace obrigatório;
- layout incompatível;
- backup ou manifesto inválido;
- layout programado para a próxima saída.

### 13.10 Acessibilidade

- logo do Sync Antigravity;
- dispensar notificação;
- atualizar perfis;
- atualizar arquivos;
- voltar à pasta anterior;
- visualizar arquivo;
- aplicar perfil;
- atualizar perfil;
- excluir perfil;
- expandir ou recolher extensões.

## 14. Estratégia de testes automatizados

### 14.1 Resolução de idioma

Casos obrigatórios:

- pt;
- pt-BR;
- pt-br;
- PT-BR;
- pt_PT;
- pt-PT;
- uma variante futura como pt-AO;
- entrada com espaços defensivamente normalizada;
- en;
- en-US;
- en-GB;
- es;
- fr;
- vazio;
- valor inesperado.

Resultado esperado:

- toda entrada cuja subtag primária normalizada seja pt resolve para pt-BR;
- todos os demais não suportados resolvem para inglês.

### 14.2 Catálogos

Os testes deverão verificar:

- mesmas chaves em package.nls inglês e pt-BR;
- mesmas chaves no bundle-base e bundle pt-BR;
- ausência de valores vazios;
- ausência de chaves extras não reconhecidas;
- igualdade do conjunto de parâmetros;
- JSON válido;
- UTF-8 preservado;
- extração atual igual ao bundle-base versionado.

A ferramenta oficial deverá extrair os textos a partir do código. O script **npm run l10n:check** comparará o resultado com o bundle versionado para detectar mensagens adicionadas sem atualização do catálogo. Essa extração não fará parte do caminho normal de **npm test**, evitando que a suíte unitária dependa do Extension Host ou pague o custo da ferramenta a cada execução local.

Os testes unitários poderão validar os arquivos JSON e suas regras puras, mas não importarão **src/localizacao/catalogo.ts**, pois esse adaptador carrega **vscode**. A presença e a extraibilidade das chamadas diretas a **vscode.l10n.t** serão verificadas pelo script dedicado.

### 14.3 Erros estruturados

Verificar:

- código preservado;
- parâmetros preservados;
- causa preservada;
- reconhecimento pelo guard;
- erro desconhecido recebe mensagem genérica localizada;
- nenhum token, objeto HTTP ou payload remoto é serializado para a webview.

### 14.4 Serialização da webview

Verificar:

- conteúdo comum;
- aspas simples e duplas;
- caracteres acentuados;
- sinais de HTML;
- ampersand;
- U+2028 e U+2029;
- tentativa de fechar script;
- parâmetros numéricos;
- objeto imutável após criação.

O helper puro **src/webview/localizacao.js** terá testes adicionais para:

- chave existente;
- chave ausente com fallback diagnóstico em inglês;
- substituição de um ou vários parâmetros nomeados;
- parâmetro ausente;
- parâmetros numéricos e booleanos;
- singular quando a quantidade for exatamente um;
- plural para zero e demais quantidades;
- texto contendo sinais de HTML sem interpretação como marcação;
- ausência de acesso a `window`, DOM ou API **vscode** durante a importação no Node.

### 14.5 Modelo e validação

Atualizar testes para:

- comparar códigos em vez de frases;
- confirmar que labels não são persistidos;
- confirmar que syncKeys não mudam;
- confirmar que o idioma não altera bytes, limites ou decisões de segurança;
- validar perfis existentes sem migração.

### 14.6 Cobertura

Os novos módulos puros entrarão no relatório do c8.

O adaptador **src/localizacao/catalogo.ts** não será artificialmente importado pelo Node somente para aumentar cobertura. Sua validação ocorrerá por TypeScript strict, **npm run l10n:check** e testes reais no Extension Development Host.

O comando **npm test** deverá continuar exigindo:

- linhas: 80%;
- funções: 80%;
- branches: 80%;
- statements: 80%.

Não será reduzido nenhum limite para acomodar a funcionalidade.

## 15. Matriz de validação manual

| Cenário | Inglês | pt-BR | Idioma não suportado |
| --- | --- | --- | --- |
| descrição, comandos e configuração | inglês | pt-BR | inglês |
| barra de status sem sessão | inglês | pt-BR | inglês |
| barra de status com sessão | inglês | pt-BR | inglês |
| aviso de IDE incompatível | inglês | pt-BR | inglês |
| tela de login | inglês | pt-BR | inglês |
| callback OAuth | inglês | pt-BR | inglês |
| criação de perfil | inglês | pt-BR | inglês |
| validação de nome | inglês | pt-BR | inglês |
| aplicação e prévia | inglês | pt-BR | inglês |
| lista de extensões | inglês | pt-BR | inglês |
| atualização de perfil | inglês | pt-BR | inglês |
| exclusão de perfil | inglês | pt-BR | inglês |
| progresso do Drive | inglês | pt-BR | inglês |
| reinicialização | inglês | pt-BR | inglês |
| explorador de dados | inglês | pt-BR | inglês |
| datas e ordenação | en-US | pt-BR | en-US |
| rollback de layout | inglês | pt-BR | inglês |
| mensagens de falha | inglês | pt-BR | inglês |
| canal de registros | inglês | pt-BR | inglês |

Idiomas sugeridos para o teste de fallback:

- espanhol;
- francês.

Variantes adicionais de português sugeridas para confirmar o mapeamento pt-BR:

- português genérico;
- português de Portugal;
- português de Angola, se a IDE aceitar a configuração manual desse código.

## 16. Validação visual e acessibilidade

Será verificado:

- ausência de corte em botões;
- quebra de linha de títulos;
- largura dos cartões;
- modais com mensagens longas;
- tags Instalar, Remover e Presente;
- cabeçalhos de tabela;
- paginação;
- tooltips;
- foco inicial dos modais;
- leitura de botões apenas com ícone;
- atributo lang;
- contraste preservado;
- navegação por teclado;
- ausência de texto misto na mesma tela.

Os controles apenas com ícone deverão receber **aria-label** localizado além de title.

Se a expansão dos textos exigir CSS, a alteração será mínima e baseada em evidência visual. Não haverá redesenho.

## 17. Validação de build e empacotamento

Comandos previstos:

~~~powershell
npm ci
npm run compile:tsc
npm test
npm run l10n:check
npm audit --audit-level=high
npm run package
npm run package:vsix
~~~

O VSIX deverá conter:

- extension/package.nls.json;
- extension/package.nls.pt-br.json;
- extension/l10n/bundle.l10n.json;
- extension/l10n/bundle.l10n.pt-br.json;
- extension/dist/extension.js;
- extension/dist/webview/dashboard.js;
- demais artefatos atualmente validados.

O workflow deverá falhar se qualquer arquivo obrigatório estiver ausente.

Também serão mantidas as verificações de ausência de:

- .env;
- credenciais;
- arquivos de desenvolvimento;
- .agents;
- .metadocs;
- previews locais.

## 18. Alterações no workflow

O workflow **.github/workflows/release.yml** deverá:

1. instalar dependências travadas;
2. executar a validação de catálogos;
3. executar testes;
4. gerar bundle;
5. gerar VSIX;
6. listar conteúdo;
7. confirmar os quatro arquivos de localização;
8. manter as validações de segurança atuais;
9. publicar pelo mesmo fluxo OIDC.

OIDC, credenciais do Google, criação de release e hash SHA-256 não serão modificados além da inclusão das novas verificações.

## 19. Segurança e privacidade

### 19.1 Sem dados externos

Traduções serão empacotadas no VSIX:

- sem chamadas de rede;
- sem serviço de tradução em tempo de execução;
- sem telemetria;
- sem persistência da preferência;
- sem envio do idioma ao Google Drive.

### 19.2 Sem HTML no catálogo

Catálogos conterão texto. Marcação continuará no código.

Isso reduz risco de:

- injeção;
- fechamento de tags;
- atributos inesperados;
- quebra da CSP;
- divergência de estrutura entre idiomas.

### 19.3 Erros externos

Mensagens brutas de APIs poderão aparecer somente em detalhes técnicos do log.

A interface mostrará:

- contexto localizado;
- orientação recuperável;
- identificador técnico quando útil;
- nenhum token ou payload sensível.

### 19.4 Perfis existentes

Nenhum dado de idioma será adicionado aos perfis. Portanto:

- não haverá migração;
- perfis antigos continuarão válidos;
- um perfil criado em inglês poderá ser aplicado em pt-BR;
- nomes definidos pelo usuário permanecerão intactos.

## 20. Desempenho

O catálogo será resolvido uma vez por ativação e uma vez por criação da webview.

Não haverá:

- tradução a cada frame;
- busca em disco durante renderizações;
- mensagens de ida e volta apenas para obter texto;
- carregamento remoto;
- duplicação completa do DOM.

Datas e contagens serão formatadas apenas quando os respectivos elementos forem renderizados.

O impacto esperado no tempo de ativação e no tamanho do pacote é pequeno e será medido durante o build.

## 21. Compatibilidade e fallback

Camadas de proteção:

1. **vscode.l10n** retorna o texto-base em inglês quando não há bundle;
2. o resolvedor de localidade envia idiomas desconhecidos para en-US;
3. o contrato tipado da webview impede omissões durante compilação;
4. testes comparam chaves dos catálogos;
5. a webview possui fallback diagnóstico caso receba uma chave inexistente;
6. CI confirma os bundles no VSIX.

Uma chave inexistente na webview deverá:

- registrar diagnóstico sem dados sensíveis;
- usar um fallback técnico previsível;
- nunca quebrar a renderização inteira.

Esse fallback é uma última proteção, não uma forma aceita de publicar tradução incompleta.

## 22. Riscos e mitigação

| Risco | Impacto | Mitigação |
| --- | --- | --- |
| Antigravity não carregar vscode.l10n corretamente | pt-BR não aparece | prova de compatibilidade antes da migração |
| package.nls não ser resolvido pelo fork | comandos permanecem no padrão | validar no Extension Development Host e VSIX |
| texto fixo permanecer em dashboard.js | tela parcialmente traduzida | inventário, busca residual e teste manual |
| parâmetro desaparecer numa tradução | mensagem incorreta | comparação automatizada de placeholders |
| tradução inserir HTML | risco de injeção ou quebra visual | catálogo somente texto e escape por contexto |
| idioma entrar no perfil | incompatibilidade entre máquinas | separar modelo técnico e label |
| data usar localidade não suportada | fallback inconsistente | resolver localidade explicitamente |
| mensagem longa quebrar layout | perda de usabilidade | matriz visual e CSS somente com evidência |
| testes dependerem de frases | suíte frágil | códigos de erro estáveis |
| teste Node importar o adaptador `vscode.l10n` | falha `Cannot find module 'vscode'` | separar adaptador do Extension Host e módulos puros testáveis |
| mensagens-base iguais exigirem traduções distintas | tradução perde contexto | usar `comment` estável somente nas colisões contextuais |
| HTML inicial e conteúdo dinâmico resolverem textos separadamente | idioma misto ou flash visual | criar um único `TextosWebview`, interpolar o HTML no provider e injetar a mesma instância |
| template dinâmico receber parâmetro ausente | placeholder visível ou mensagem incompleta | helper puro com diagnóstico, fallback seguro e testes dedicados |
| bundle não entrar no VSIX | produção somente em inglês | inspeção obrigatória no CI |
| erro do Google aparecer sem contexto | experiência inconsistente | prefixo localizado e detalhe bruto somente no log |
| chave-base inglesa ser alterada sem atualizar pt-BR | tradução ausente | extração oficial comparada no teste |
| notificação duplicada durante migração | ruído ao usuário | revisar logger e toasts por fluxo |

## 23. Estratégia de migração incremental

Para evitar uma mudança monolítica difícil de revisar:

1. infraestrutura e testes;
2. manifesto;
3. barra de status e comandos;
4. autenticação;
5. Google Drive e controlador;
6. webview estática;
7. webview dinâmica;
8. validações e erros;
9. documentação e release.

Após cada grupo:

- compilar;
- executar testes relacionados;
- executar busca residual;
- revisar diff;
- não avançar com falha conhecida.

Mesmo que a implementação seja dividida em commits, nenhum commit intermediário deverá ser publicado como release com interface parcialmente localizada.

## 24. Estratégia de commits futura

Uma divisão possível, sujeita à skill de commit no momento da execução:

1. infraestrutura de l10n e manifesto;
2. erros estruturados e itens localizados;
3. localização da extensão e serviços;
4. localização da webview;
5. testes, workflow e documentação.

Os commits deverão ser atômicos, e nenhum push será realizado sem pedido explícito.

## 25. Procedimento para adicionar um novo idioma

Depois desta arquitetura, adicionar um idioma deverá exigir:

1. criar **package.nls.<locale>.json**;
2. criar **l10n/bundle.l10n.<locale>.json**;
3. traduzir todas as chaves existentes;
4. preservar placeholders;
5. cadastrar localidade de data e ordenação em **idioma.ts**;
6. executar testes;
7. executar matriz manual;
8. atualizar documentação e changelogs.

Não será necessário:

- copiar a webview;
- criar outro provider;
- duplicar comandos;
- duplicar serviços;
- alterar o esquema do perfil;
- criar condição por texto em regras de negócio.

## 26. Critérios de aceite

### 26.1 Funcionais

- [ ] IDE em inglês apresenta toda a extensão em inglês.
- [ ] IDE em qualquer variante de português apresenta toda a extensão em pt-BR.
- [ ] IDE em idioma não suportado apresenta toda a extensão em inglês.
- [ ] A mudança do idioma passa a valer após a recarga da IDE.
- [ ] Manifesto, comandos e configuração acompanham a IDE.
- [ ] Barra de status acompanha a IDE.
- [ ] Webview acompanha a IDE.
- [ ] OAuth no navegador acompanha a IDE.
- [ ] Erros e confirmações acompanham a IDE.
- [ ] Datas, contagens e ordenações acompanham a localidade efetiva.
- [ ] README e changelog permanecem bilíngues por arquivos e links.

### 26.2 Arquiteturais

- [ ] Não existe componente duplicado por idioma.
- [ ] Textos da webview possuem fonte única.
- [ ] HTML inicial é entregue localizado, sem hidratação tardia ou flash de idioma incorreto.
- [ ] Helper dinâmico da webview é puro e testável em Node.
- [ ] Validadores puros não importam vscode.
- [ ] Testes Node não carregam módulos que importam vscode.
- [ ] Erros de domínio usam códigos estáveis.
- [ ] Idioma não é persistido nem sincronizado.
- [ ] Chaves técnicas e formatos de perfil permanecem iguais.
- [ ] Não existe chamada de rede para tradução.
- [ ] Inglês é fallback em todas as camadas.

### 26.3 Qualidade

- [ ] TypeScript compila em strict.
- [ ] Todos os testes passam.
- [ ] Cobertura permanece acima dos limites atuais.
- [ ] npm audit não encontra vulnerabilidade alta.
- [ ] Catálogos possuem chaves equivalentes.
- [ ] Placeholders são equivalentes.
- [ ] VSIX contém todos os arquivos de localização.
- [ ] VSIX não contém arquivos proibidos.
- [ ] Testes manuais cobrem inglês, pt-BR e um idioma não suportado.
- [ ] Não há texto visível misturado entre idiomas.
- [ ] Não há regressão nos fluxos de sincronização.

## 27. Definição de pronto

O trabalho estará pronto para aprovação de release quando:

1. todos os critérios de aceite estiverem marcados;
2. o VSIX tiver sido testado no Antigravity em inglês, pt-BR e ao menos outra variante de português;
3. um idioma não suportado tiver confirmado o fallback inglês;
4. criação, atualização, aplicação e exclusão de perfil tiverem sido testadas;
5. fluxo de extensões e reinicialização tiver sido testado;
6. login e callback OAuth tiverem sido testados;
7. rollback de layout tiver sido testado;
8. catálogos e documentação estiverem equivalentes;
9. este plano tiver sido promovido para **.metadocs/implemented/**;
10. o usuário tiver autorizado commit, push, tag e release em etapas explícitas.

## 28. Pontos de decisão para aprovação

Este plano propõe:

1. seguir exclusivamente o idioma da IDE, sem seletor próprio;
2. suportar inicialmente apenas inglês e pt-BR;
3. mapear qualquer variante de português para o catálogo pt-BR;
4. usar a API oficial **vscode.l10n**;
5. não usar **@vscode/l10n** no processo principal da extensão;
6. adicionar **@vscode/l10n-dev** apenas como dependência de desenvolvimento;
7. manter o catálogo que importa **vscode** fora da árvore de imports dos testes Node;
8. desambiguar mensagens-base repetidas com `comment` estável quando o contexto exigir;
9. gerar o HTML inicial já localizado e reservar o helper da webview para conteúdo dinâmico;
10. executar extração e consistência por **npm run l10n:check**, separadamente de **npm test**;
11. manter README e changelog no modelo bilíngue atual;
12. converter erros de módulos puros para códigos estáveis;
13. incluir logs produzidos pelo projeto no esforço de localização;
14. não alterar o site nesta entrega;
15. não definir ainda o número da próxima versão.

Qualquer mudança nesses pontos deverá ser feita neste documento antes do início da implementação.

## 29. Resultado final esperado

A pessoa usuária instalará um único VSIX.

Ao abrir o Antigravity:

- a IDE em inglês exibirá a extensão em inglês;
- a IDE em qualquer variante de português exibirá a extensão em pt-BR;
- qualquer IDE em idioma não suportado usará inglês;
- os mesmos comandos, componentes e serviços serão executados em todos os casos;
- a adição de novos idiomas será um trabalho de catálogo e validação, não uma duplicação de produto.

Essa solução atende ao requisito imediato e cria uma base sustentável para a internacionalização futura.
