import {
    DEFAULT_SYNC_ITEM_DEFINITIONS,
    ISyncItem,
    ISyncItemDefinition,
} from "../models/interfaces";
import { catalogo } from "./catalogo";

/** Acrescenta rótulos localizados sem contaminar os contratos ou os dados persistidos. */
export function localizarItemDeSincronizacao(definicao: ISyncItemDefinition): ISyncItem {
    return {
        ...definicao,
        label: catalogo.itensDeSincronizacao.nome(definicao.key),
    };
}

/** Cria uma nova lista para que o estado habilitado possa variar em cada operação. */
export function criarItensDeSincronizacaoPadrao(): ISyncItem[] {
    return DEFAULT_SYNC_ITEM_DEFINITIONS.map(localizarItemDeSincronizacao);
}
