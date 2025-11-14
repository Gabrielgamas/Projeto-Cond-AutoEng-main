import type {
  Apartamento,
  TabelaComodos,
  ChecklistComodo,
  QuadroDistribuicao,
  Especificacao,
} from "../types";

const baseChecklist: ChecklistComodo = {
  "Tugs e Tues": true,
  Iluminação: true,
  Acabamento: true,
  "Tensão e Corrente": true,
};

const baseComodos: TabelaComodos = {
  Sala: { ...baseChecklist },
  Cozinha: { ...baseChecklist },
  Quartos: { ...baseChecklist },
  Banheiro: { ...baseChecklist },
  "Área de Serv.": { ...baseChecklist },
  Varanda: { ...baseChecklist },
};

const baseQuadro: QuadroDistribuicao = {
  Acabamento: true,
  Circuitos: true,
  Identificação: true,
  "Tensão e Corrente": true,
};

const baseEspecificacao: Especificacao = {
  Campainha: true,
  Chuveiro: true,
};

export function createApartamento(id: string): Apartamento {
  return {
    id,

    comodos: JSON.parse(JSON.stringify(baseComodos)) as TabelaComodos,
    quadro: { ...baseQuadro },
    especificacoes: { ...baseEspecificacao },
    erros: [],
    fotos: Array(9).fill(""),
  };
}
