import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type {
  Condominio,
  Apartamento,
  ChecklistComodo,
  TabelaComodos,
  QuadroDistribuicao,
  Especificacao,
  CondominioTipo,
} from "../types";

/* ============================= Persistência ============================= */

const STORAGE_KEY = "autoeng-data";

type AppState = {
  schemaVersion: number;
  condominios: Condominio[];
};

function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as AppState;
  } catch {
    /* ignore */
  }
  return { schemaVersion: 2, condominios: [] };
}

function saveState(s: AppState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

/* ============================ Helpers gerais ============================ */

// normaliza textos para comparação (case-insensitive, sem acentos e espaços extras)
const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

type OpResult = { ok: true } | { ok: false; error: string };

/* ====================== Fábricas de objetos (tipadas) ==================== */

function createChecklistComodoAllTrue(): ChecklistComodo {
  return {
    "Tugs e Tues": true,
    Iluminação: true,
    Acabamento: true,
    "Tensão e Corrente": true,
  };
}

function createComodosDefault(): TabelaComodos {
  return {
    Sala: createChecklistComodoAllTrue(),
    Cozinha: createChecklistComodoAllTrue(),
    Quartos: createChecklistComodoAllTrue(),
    Banheiro: createChecklistComodoAllTrue(),
    "Área de Serv.": createChecklistComodoAllTrue(),
    Varanda: createChecklistComodoAllTrue(),
  };
}

function createQuadroDefault(): QuadroDistribuicao {
  return {
    Acabamento: true,
    Circuitos: true,
    Identificação: true,
    "Tensão e Corrente": true,
  };
}

function createEspecificacoesDefault(): Especificacao {
  return {
    Campainha: true,
    Chuveiro: true,
  };
}

function createUnidadeDefault(id: string): Apartamento {
  return {
    id,
    comodos: createComodosDefault(),
    quadro: createQuadroDefault(),
    especificacoes: createEspecificacoesDefault(),
    erros: [],
    fotos: Array<string>(9).fill(""),
  };
}

/* =============================== Contexto =============================== */

type Ctx = {
  data: AppState;
  setData: React.Dispatch<React.SetStateAction<AppState>>;

  addCondominio: (nome: string, tipo: CondominioTipo) => OpResult;
  removeCondominio: (condId: string) => void;

  addBloco: (condId: string, idBloco: string) => OpResult;
  removeBloco: (condId: string, blocoId: string) => void;

  addApartamento: (condId: string, blocoId: string, idApto: string) => OpResult;
  removeApartamento: (condId: string, blocoId: string, idApto: string) => void;

  addCasa: (condId: string, idCasa: string) => OpResult;
  removeCasa: (condId: string, idCasa: string) => void;

  /** atualiza (ou insere) um apartamento existente */
  upsertApartamento: (
    condId: string,
    blocoId: string,
    apto: Apartamento
  ) => void;
  /** atualiza (ou insere) uma casa existente */
  upsertCasa: (condId: string, apto: Apartamento) => void;

  saveData: (d: AppState) => void;
};

const AppStateContext = createContext<Ctx | null>(null);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<AppState>(() => loadState());

  useEffect(() => {
    saveState(data);
  }, [data]);

  const saveData = (d: AppState) => {
    setData(d);
    saveState(d);
  };

  /* ===================== Ações com validação de duplicados ===================== */

  function addCondominio(nomeRaw: string, tipo: CondominioTipo): OpResult {
    const nome = nomeRaw.trim();
    if (!nome) return { ok: false, error: "Informe o nome do condomínio." };

    const key = norm(nome);
    let inserted = false;
    let duplicated = false;

    setData((prev) => {
      // checa no estado mais recente (prev)
      if (prev.condominios.some((c) => norm(c.nome) === key)) {
        duplicated = true;
        return prev;
      }
      const d = structuredClone(prev);
      d.condominios.push({
        id: crypto.randomUUID(),
        nome,
        tipo,
        blocos: [],
        casas: [], // sua estrutura já usa 'casas'; mantemos aqui
      });
      saveState(d);
      inserted = true;
      return d;
    });

    if (duplicated)
      return { ok: false, error: `Já existe um condomínio chamado "${nome}".` };
    return inserted
      ? { ok: true }
      : { ok: false, error: "Não foi possível adicionar." };
  }

  function removeCondominio(condId: string) {
    setData((prev) => {
      const d = structuredClone(prev);
      d.condominios = d.condominios.filter((c) => c.id !== condId);
      saveData(d);
      return d;
    });
  }

  function addBloco(condId: string, idBlocoRaw: string): OpResult {
    const idBloco = idBlocoRaw.trim();
    if (!idBloco) return { ok: false, error: "Informe o número do bloco." };

    let ok = false;
    let error: string | undefined;

    setData((prev) => {
      const d = structuredClone(prev);
      const cond = d.condominios.find((c) => c.id === condId);
      if (!cond) {
        error = "Condomínio não encontrado.";
        return prev;
      }

      const key = norm(idBloco);
      if ((cond.blocos ?? []).some((b) => norm(b.id) === key)) {
        error = `O bloco "${idBloco}" já existe neste condomínio.`;
        return prev;
      }
      (cond.blocos ??= []).push({ id: idBloco, apartamentos: [] });
      saveState(d);
      ok = true;
      return d;
    });

    return ok
      ? { ok: true }
      : { ok: false, error: error ?? "Não foi possível adicionar." };
  }

  function removeBloco(condId: string, blocoId: string) {
    setData((prev) => {
      const d = structuredClone(prev);
      const cond = d.condominios.find((c) => c.id === condId);
      if (!cond) return prev;
      cond.blocos = (cond.blocos ?? []).filter((b) => b.id !== blocoId);
      saveData(d);
      return d;
    });
  }

  function addApartamento(
    condId: string,
    blocoId: string,
    idAptoRaw: string
  ): OpResult {
    const idApto = idAptoRaw.trim();
    if (!idApto)
      return { ok: false, error: "Informe o número do apartamento." };

    let ok = false;
    let error: string | undefined;

    setData((prev) => {
      const d = structuredClone(prev);
      const cond = d.condominios.find((c) => c.id === condId);
      if (!cond) {
        error = "Condomínio não encontrado.";
        return prev;
      }

      const bloco = (cond.blocos ?? []).find((b) => b.id === blocoId);
      if (!bloco) {
        error = "Bloco não encontrado.";
        return prev;
      }

      const key = norm(idApto);
      if ((bloco.apartamentos ?? []).some((a) => norm(a.id) === key)) {
        error = `O apartamento "${idApto}" já existe neste bloco.`;
        return prev;
      }

      bloco.apartamentos.push(createUnidadeDefault(idApto));
      saveState(d);
      ok = true;
      return d;
    });

    return ok
      ? { ok: true }
      : { ok: false, error: error ?? "Não foi possível adicionar." };
  }

  function removeApartamento(condId: string, blocoId: string, idApto: string) {
    setData((prev) => {
      const d = structuredClone(prev);
      const cond = d.condominios.find((c) => c.id === condId);
      if (!cond) return prev;

      const bloco = (cond.blocos ?? []).find((b) => b.id === blocoId);
      if (!bloco) return prev;

      bloco.apartamentos = (bloco.apartamentos ?? []).filter(
        (a) => a.id !== idApto
      );

      saveData(d);
      return d;
    });
  }

  function addCasa(condId: string, idCasaRaw: string): OpResult {
    const idCasa = idCasaRaw.trim();
    if (!idCasa) return { ok: false, error: "Informe o número da casa." };

    let ok = false;
    let error: string | undefined;

    setData((prev) => {
      const d = structuredClone(prev);
      const cond = d.condominios.find((c) => c.id === condId);
      if (!cond) {
        error = "Condomínio não encontrado.";
        return prev;
      }

      const key = norm(idCasa);

      if ((cond.casas ?? []).some((a: Apartamento) => norm(a.id) === key)) {
        error = `A casa "${idCasa}" já existe neste condomínio.`;
        return prev;
      }

      (cond.casas ??= []).push(createUnidadeDefault(idCasa));
      saveState(d);
      ok = true;
      return d;
    });

    return ok
      ? { ok: true }
      : { ok: false, error: error ?? "Não foi possível adicionar." };
  }

  function removeCasa(condId: string, idCasa: string) {
    setData((prev) => {
      const d = structuredClone(prev);
      const cond = d.condominios.find((c) => c.id === condId);
      if (!cond) return prev;

      cond.casas = (cond.casas ?? []).filter(
        (a: Apartamento) => a.id !== idCasa
      );
      saveData(d);
      return d;
    });
  }

  /* ======================= Upserts (editar/salvar) ======================== */

  function upsertApartamento(
    condId: string,
    blocoId: string,
    apto: Apartamento
  ) {
    setData((prev) => {
      const d = structuredClone(prev);
      const cond = d.condominios.find((c) => c.id === condId);
      if (!cond) return prev;

      const bloco = (cond.blocos ?? []).find((b) => b.id === blocoId);
      if (!bloco) return prev;

      const i = (bloco.apartamentos ?? []).findIndex((a) => a.id === apto.id);
      if (i >= 0) bloco.apartamentos[i] = apto;
      else bloco.apartamentos.push(apto);

      saveState(d);
      return d;
    });
  }

  function upsertCasa(condId: string, apto: Apartamento) {
    setData((prev) => {
      const d = structuredClone(prev);
      const cond = d.condominios.find((c) => c.id === condId);
      if (!cond) return prev;

      const arr: Apartamento[] = (cond.casas ??= []);
      const i = arr.findIndex((a) => a.id === apto.id);
      if (i >= 0) arr[i] = apto;
      else arr.push(apto);

      saveState(d);
      return d;
    });
  }

  const value = useMemo<Ctx>(
    () => ({
      data,
      setData,
      addCondominio,
      removeCondominio,
      addBloco,
      removeBloco,
      addApartamento,
      removeApartamento,
      addCasa,
      removeCasa,
      upsertApartamento,
      upsertCasa,
      saveData,
    }),
    [data]
  );

  return (
    <AppStateContext.Provider value={value}>
      {children}
    </AppStateContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAppState(): Ctx {
  const ctx = useContext(AppStateContext);
  if (!ctx)
    throw new Error("useAppState deve ser usado dentro de AppStateProvider");
  return ctx;
}
