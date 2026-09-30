/**
 * Efeito visual da página de sucesso do OAuth: confetes que estouram como fogos de artifício.
 *
 * Como o efeito funciona (movimentos simultâneos, cada um com UMA curva contínua):
 * 1. Estouro: a peça é lançada para fora com muita velocidade e vai desacelerando (ease-out).
 * 2. Gravidade: ao mesmo tempo, a peça é puxada para baixo com aceleração crescente (ease-in).
 * 3. Giro e aparecimento: a peça gira e some suavemente durante toda a vida.
 *
 * Como o estouro (que desacelera) e a gravidade (que acelera) acontecem juntos, a soma dos dois
 * forma uma curva natural de parábola, sem nenhuma parada entre o estouro e a queda.
 *
 * Para ajustar o efeito, altere somente as constantes da seção "Configuração".
 *
 * Compatibilidade: este arquivo usa apenas anotações simples de tipo (number e string)
 * em parâmetros e retornos, sem interface, type ou readonly, para ser aceito pelo carregador do projeto.
 *
 * Os nomes exportados no final do arquivo foram mantidos iguais aos anteriores,
 * então nenhum import existente precisa ser alterado.
 */

// ---------------------------------------------------------------------------
// Configuração
// ---------------------------------------------------------------------------

/** Quantidade total de peças simultâneas, distribuídas entre as explosões. */
const QUANTIDADE_TOTAL_DE_PECAS = 200;

/**
 * Tempo de vida de cada peça, do estouro até desaparecer.
 * Também é o intervalo em que cada explosão se repete.
 * Valores maiores deixam o efeito mais lento e suave.
 */
const DURACAO_DA_VIDA_DE_CADA_PECA_EM_SEGUNDOS = 3.6;

/** Matizes (0 a 360) usados para colorir as peças, distribuídos em rodízio. */
const MATIZES_DAS_PECAS = [
    0, 8, 20, 28, 42, 47, 57, 82, 106, 125,
    142, 152, 166, 180, 195, 214, 240, 266, 286, 305, 326, 347,
];

/**
 * Explosões escalonadas em intervalos iguais (um terço da vida das peças),
 * para que sempre haja movimento na tela e nunca estourem todas juntas.
 *
 * Cada explosão define:
 * - origemHorizontalEmPorcentagem: posição horizontal da origem, em % da largura da tela.
 * - origemVerticalEmPorcentagem: posição vertical da origem, em % da altura da tela.
 * - atrasoInicialEmMilissegundos: atraso antes da primeira vez que a explosão acontece.
 */
const EXPLOSOES = [
    { origemHorizontalEmPorcentagem: 30, origemVerticalEmPorcentagem: 42, atrasoInicialEmMilissegundos: 0 },
    { origemHorizontalEmPorcentagem: 50, origemVerticalEmPorcentagem: 30, atrasoInicialEmMilissegundos: 1200 },
    { origemHorizontalEmPorcentagem: 70, origemVerticalEmPorcentagem: 42, atrasoInicialEmMilissegundos: 2400 },
];

// ---------------------------------------------------------------------------
// Cálculo das características de cada peça
// ---------------------------------------------------------------------------

/**
 * Gera um número pseudoaleatório entre 0 e 1 que é sempre o mesmo para a mesma entrada.
 * Assim o efeito é estável entre renderizações e fácil de ajustar (nada muda "sozinho").
 *
 * @param indice Posição da peça dentro da explosão.
 * @param semente Número que diferencia uma característica da outra (ex.: giro, queda).
 */
function gerarRuidoDeterministico(indice: number, semente: number): number {
    const valor = Math.sin(indice * 12.9898 + semente * 78.233) * 43758.5453;
    return valor - Math.floor(valor);
}

/** Calcula a semente que torna cada peça de cada explosão única. */
function calcularSemente(indiceDaPeca: number, indiceDaExplosao: number): number {
    return indiceDaExplosao * 100 + indiceDaPeca;
}

/** Divide a quantidade total de maneira equilibrada, sem criar uma fração de peça. */
function calcularQuantidadeDePecasDaExplosao(indiceDaExplosao: number): number {
    const quantidadeBase = Math.floor(QUANTIDADE_TOTAL_DE_PECAS / EXPLOSOES.length);
    const pecasRestantes = QUANTIDADE_TOTAL_DE_PECAS % EXPLOSOES.length;
    return quantidadeBase + (indiceDaExplosao < pecasRestantes ? 1 : 0);
}

/**
 * Calcula o ângulo de saída da peça, em radianos.
 * As peças são distribuídas igualmente em círculo, com uma pequena variação natural.
 */
function calcularAnguloEmRadianos(
    indiceDaPeca: number,
    quantidadeDePecasDaExplosao: number,
    semente: number,
): number {
    const anguloEmGraus =
        (360 / quantidadeDePecasDaExplosao) * indiceDaPeca +
        (gerarRuidoDeterministico(indiceDaPeca, semente) - 0.5) * 10;
    return (anguloEmGraus * Math.PI) / 180;
}

/**
 * Calcula a distância do estouro.
 * As peças se alternam em três anéis de distância, o que dá o desenho típico de um fogo de artifício.
 */
function calcularAlcanceDoEstouro(indiceDaPeca: number, semente: number): number {
    const indiceDoAnel = indiceDaPeca % 3;
    return 160 + indiceDoAnel * 70 + gerarRuidoDeterministico(indiceDaPeca, semente + 1) * 40;
}

/** Calcula quanto a peça desce por causa da gravidade durante a sua vida. */
function calcularDistanciaDaQueda(indiceDaPeca: number, semente: number): number {
    return Math.round(260 + gerarRuidoDeterministico(indiceDaPeca, semente + 2) * 160);
}

/** Calcula quantos graus a peça gira durante a sua vida (pode ser positivo ou negativo). */
function calcularGiroTotalEmGraus(indiceDaPeca: number, semente: number): number {
    return Math.round((gerarRuidoDeterministico(indiceDaPeca, semente + 3) - 0.5) * 900);
}

/** Calcula um pequeno atraso individual, para as peças não saírem todas no mesmo instante. */
function calcularAtrasoDaPecaEmMilissegundos(indiceDaPeca: number, semente: number): number {
    return Math.round(gerarRuidoDeterministico(indiceDaPeca, semente + 4) * 120);
}

// ---------------------------------------------------------------------------
// Geração do HTML
// ---------------------------------------------------------------------------

/**
 * Gera o HTML de uma peça.
 * São dois elementos aninhados: o externo faz o estouro (para fora)
 * e o interno faz a queda, o giro e o aparecimento.
 */
function renderizarPecaDeConfete(
    indiceDaPeca: number,
    quantidadeDePecasDaExplosao: number,
    indiceDaExplosao: number,
): string {
    const semente = calcularSemente(indiceDaPeca, indiceDaExplosao);
    const anguloEmRadianos = calcularAnguloEmRadianos(indiceDaPeca, quantidadeDePecasDaExplosao, semente);
    const alcance = calcularAlcanceDoEstouro(indiceDaPeca, semente);

    const deslocamentoHorizontal = Math.round(Math.cos(anguloEmRadianos) * alcance);
    const deslocamentoVertical = Math.round(Math.sin(anguloEmRadianos) * alcance * 0.9);
    const matiz = MATIZES_DAS_PECAS[indiceDaPeca % MATIZES_DAS_PECAS.length];
    const larguraEmPixels = 5 + (indiceDaPeca % 3);
    const alturaEmPixels = 7 + (indiceDaPeca % 3) * 2;

    const variaveis = [
        `--deslocamento-horizontal:${deslocamentoHorizontal}`,
        `--deslocamento-vertical:${deslocamentoVertical}`,
        `--distancia-da-queda:${calcularDistanciaDaQueda(indiceDaPeca, semente)}`,
        `--giro-total:${calcularGiroTotalEmGraus(indiceDaPeca, semente)}deg`,
        `--matiz:${matiz}`,
        `--atraso-da-peca:${calcularAtrasoDaPecaEmMilissegundos(indiceDaPeca, semente)}ms`,
        `--largura:${larguraEmPixels}px`,
        `--altura:${alturaEmPixels}px`,
    ].join(";");

    return `<span class="confete-estouro" style="${variaveis}"><span class="confete-peca"></span></span>`;
}

/** Gera o HTML de uma explosão completa, com todas as suas peças. */
function renderizarExplosao(
    origemHorizontalEmPorcentagem: number,
    origemVerticalEmPorcentagem: number,
    atrasoInicialEmMilissegundos: number,
    indiceDaExplosao: number,
): string {
    const quantidadeDePecasDaExplosao = calcularQuantidadeDePecasDaExplosao(indiceDaExplosao);
    const pecas = Array.from({ length: quantidadeDePecasDaExplosao }, (_, indiceDaPeca) =>
        renderizarPecaDeConfete(indiceDaPeca, quantidadeDePecasDaExplosao, indiceDaExplosao),
    ).join("");

    const variaveis = [
        `--origem-horizontal:${origemHorizontalEmPorcentagem}%`,
        `--origem-vertical:${origemVerticalEmPorcentagem}%`,
        `--atraso-da-explosao:${atrasoInicialEmMilissegundos}ms`,
    ].join(";");

    return `<div class="confete-explosao" style="${variaveis}" aria-hidden="true">${pecas}</div>`;
}

// ---------------------------------------------------------------------------
// Exports (nomes mantidos para não quebrar os imports existentes)
// ---------------------------------------------------------------------------

/** HTML com todas as explosões de confete. */
export const LOGIN_SUCCESS_EFFECT_MARKUP = EXPLOSOES.map((explosao, indiceDaExplosao) =>
    renderizarExplosao(
        explosao.origemHorizontalEmPorcentagem,
        explosao.origemVerticalEmPorcentagem,
        explosao.atrasoInicialEmMilissegundos,
        indiceDaExplosao,
    ),
).join("");

/** CSS responsável pelo movimento, cores e comportamento em telas pequenas. */
export const LOGIN_SUCCESS_EFFECT_STYLES = `
/* Camada que cobre a tela inteira e nunca intercepta cliques. */
.confete-explosao {
    /*
     * Unidade de distância proporcional à tela: em telas grandes vale 1px,
     * em telas pequenas encolhe para o estouro não sair da área visível.
     */
    --unidade: clamp(0.5px, 0.14vmin, 1px);
    --duracao-da-vida: ${DURACAO_DA_VIDA_DE_CADA_PECA_EM_SEGUNDOS}s;
    position: fixed;
    inset: 0;
    overflow: hidden;
    pointer-events: none;
}

/*
 * Elemento externo: posiciona a peça na origem e faz o ESTOURO.
 * Uma única curva ease-out: começa muito rápido e desacelera até o fim da vida da peça,
 * sem nunca parar de repente.
 */
.confete-estouro {
    --atraso-total: calc(var(--atraso-da-explosao) + var(--atraso-da-peca));
    position: absolute;
    top: var(--origem-vertical);
    left: var(--origem-horizontal);
    animation: confete-estouro var(--duracao-da-vida) cubic-bezier(0.08, 0.7, 0.2, 1) var(--atraso-total) infinite both;
}

/*
 * Elemento interno: desenha a peça e aplica, ao mesmo tempo, três movimentos independentes
 * (queda, giro e aparecimento), cada um com uma única curva do início ao fim.
 */
.confete-peca {
    display: block;
    width: var(--largura);
    height: var(--altura);
    border-radius: 2px;
    background: hsl(var(--matiz) 85% 68%);
    animation:
        /* Gravidade: ease-in, começa devagar e acelera (aceleração constante). */
        confete-queda var(--duracao-da-vida) cubic-bezier(0.11, 0, 0.5, 0) var(--atraso-total) infinite both,
        /* Giro: começa rápido e vai desacelerando, como um papel no ar. */
        confete-giro var(--duracao-da-vida) cubic-bezier(0.2, 0.6, 0.3, 1) var(--atraso-total) infinite both,
        /* Aparecimento e desaparecimento: só opacidade e tamanho, não mexe na posição. */
        confete-aparecer var(--duracao-da-vida) linear var(--atraso-total) infinite both;
}

/* Formatos diferentes tornam o confete mais orgânico sem exigir imagens externas. */
.confete-estouro:nth-child(5n) .confete-peca {
    height: var(--largura);
    border-radius: 50%;
}

/* Triângulos, estrelas e fitas se alternam entre as peças retangulares. */
.confete-estouro:nth-child(7n) .confete-peca {
    clip-path: polygon(50% 0, 100% 100%, 0 100%);
}

.confete-estouro:nth-child(11n) .confete-peca {
    clip-path: polygon(50% 0, 61% 35%, 98% 35%, 68% 56%, 79% 94%, 50% 71%, 21% 94%, 32% 56%, 2% 35%, 39% 35%);
}

.confete-estouro:nth-child(13n) .confete-peca {
    height: calc(var(--altura) * 0.55);
    border-radius: 999px;
}

/* Losangos, hexágonos e trapézios completam a variedade visual. */
.confete-estouro:nth-child(17n) .confete-peca {
    clip-path: polygon(50% 0, 100% 50%, 50% 100%, 0 50%);
}

.confete-estouro:nth-child(19n) .confete-peca {
    clip-path: polygon(25% 0, 75% 0, 100% 50%, 75% 100%, 25% 100%, 0 50%);
}

.confete-estouro:nth-child(23n) .confete-peca {
    clip-path: polygon(20% 0, 80% 0, 100% 100%, 0 100%);
}

@keyframes confete-estouro {
    from { transform: translate(0, 0); }
    to {
        transform: translate(
            calc(var(--deslocamento-horizontal) * var(--unidade)),
            calc(var(--deslocamento-vertical) * var(--unidade))
        );
    }
}

@keyframes confete-queda {
    from { translate: 0 0; }
    to { translate: 0 calc(var(--distancia-da-queda) * var(--unidade)); }
}

@keyframes confete-giro {
    from { rotate: 0deg; }
    to { rotate: var(--giro-total); }
}

@keyframes confete-aparecer {
    0% { opacity: 0; scale: 0.3; }
    6% { opacity: 1; scale: 1; }
    55% { opacity: 1; scale: 1; }
    100% { opacity: 0; scale: 0.8; }
}

/* Respeita quem prefere menos movimento: o efeito simplesmente não aparece. */
@media (prefers-reduced-motion: reduce) {
    .confete-explosao {
        display: none;
    }
}`;
