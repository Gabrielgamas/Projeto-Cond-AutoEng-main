export type ChecklistComodo = {
  "Tugs e Tues": boolean;
  Iluminação: boolean;
  Acabamento: boolean;
  "Tensão e Corrente": boolean;
};

export type TabelaComodos = Record<
  "Sala" | "Cozinha" | "Quartos" | "Banheiro" | "Área de Serv." | "Varanda",
  ChecklistComodo
>;

export type QuadroDistribuicao = {
  Acabamento: boolean;
  Circuitos: boolean;
  Identificação: boolean;
  "Tensão e Corrente": boolean;
};

export type Especificacao = {
  Campainha: boolean;
  Chuveiro: boolean;
};

export type ErroItem = {
  id: string;
  descricao: string;
  comodo?: keyof TabelaComodos | "Geral";
  item?: keyof ChecklistComodo | "Quadro" | "Especificação";
};

export type Apartamento = {
  id: string;
  comodos: TabelaComodos;
  quadro: QuadroDistribuicao;
  especificacoes: Especificacao;
  erros: ErroItem[];
  fotos: string[];
  observacoes?: string;
};

export type Bloco = {
  id: string;
  apartamentos: Apartamento[];
};

export type CondominioTipo = "BLOCOS" | "CASAS";

export type Condominio = {
  id: string;
  nome: string;
  tipo: CondominioTipo;
  blocos: Bloco[];
  casas?: Apartamento[];
};

export type AppState = {
  schemaVersion: number;
  condominios: Condominio[];
};
