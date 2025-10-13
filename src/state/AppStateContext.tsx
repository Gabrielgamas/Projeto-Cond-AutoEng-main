// src/state/AppStateContext.tsx
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { get, set } from "idb-keyval";
import type { AppState, Condominio, Bloco, Apartamento } from "../types";

const STORAGE_KEY = "autoeng-data";

type Ctx = {
  data: AppState;
  loading: boolean;
  saveData: (next: AppState) => Promise<void>;
  addCondominio: (nome: string) => void;
  removeCondominio: (id: string) => void;
  addBloco: (condId: string, idBlocoNovo: string) => void;
  removeBloco: (condId: string, blocoId: string) => void;
  addApartamento: (condId: string, blocoId: string, idApto: string) => void;
  removeApartamento: (condId: string, blocoId: string, aptoId: string) => void;
  upsertApartamento: (
    condId: string,
    blocoId: string,
    apto: Apartamento
  ) => void;
};

const AppStateContext = createContext<Ctx | null>(null);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<AppState>({
    schemaVersion: 1,
    condominios: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const stored = await get<AppState | undefined>(STORAGE_KEY);
        if (stored?.schemaVersion === 1) setData(stored);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const saveData = async (next: AppState) => {
    setData(next);
    await set(STORAGE_KEY, next);
  };

  function addCondominio(nome: string) {
    const novo: Condominio = { id: crypto.randomUUID(), nome, blocos: [] };
    void saveData({ ...data, condominios: [...data.condominios, novo] });
  }

  function removeCondominio(id: string) {
    void saveData({
      ...data,
      condominios: data.condominios.filter((c) => c.id !== id),
    });
  }

  function addBloco(condId: string, idBlocoNovo: string) {
    if (!idBlocoNovo.trim()) return;
    const d = structuredClone(data);
    const cond = d.condominios.find((c) => c.id === condId);
    if (!cond) return;
    const exists = cond.blocos.some((b) => b.id === idBlocoNovo);
    if (exists) return;
    const novo: Bloco = { id: idBlocoNovo, apartamentos: [] };
    cond.blocos.push(novo);
    void saveData(d);
  }

  function removeBloco(condId: string, blocoId: string) {
    const d = structuredClone(data);
    const cond = d.condominios.find((c) => c.id === condId);
    if (!cond) return;
    cond.blocos = cond.blocos.filter((b) => b.id !== blocoId);
    void saveData(d);
  }

  function addApartamento(condId: string, blocoId: string, idApto: string) {
    if (!idApto.trim()) return;
    const d = structuredClone(data);
    const cond = d.condominios.find((c) => c.id === condId);
    const bloco = cond?.blocos.find((b) => b.id === blocoId);
    if (!bloco) return;
    const exists = bloco.apartamentos.some((a) => a.id === idApto);
    if (exists) return;
    const novo: Apartamento = {
      id: idApto,
      comodos: {
        Sala: {
          "Tugs e Tues": true,
          Iluminação: true,
          Acabamento: true,
          "Tensão e Corrente": true,
        },
        Cozinha: {
          "Tugs e Tues": true,
          Iluminação: true,
          Acabamento: true,
          "Tensão e Corrente": true,
        },
        Quartos: {
          "Tugs e Tues": true,
          Iluminação: true,
          Acabamento: true,
          "Tensão e Corrente": true,
        },
        Banheiro: {
          "Tugs e Tues": true,
          Iluminação: true,
          Acabamento: true,
          "Tensão e Corrente": true,
        },
        "Área de Serv.": {
          "Tugs e Tues": true,
          Iluminação: true,
          Acabamento: true,
          "Tensão e Corrente": true,
        },
        Varanda: {
          "Tugs e Tues": true,
          Iluminação: true,
          Acabamento: true,
          "Tensão e Corrente": true,
        },
      },
      quadro: {
        Acabamento: true,
        Circuitos: true,
        Identificação: true,
        "Tensão e Corrente": true,
        "Seção Condutor": true,
        "Tensão Nominal": true,
      },
      especificacoes: { Campainha: true, Chuveiro: true },
      erros: [],
      fotos: Array(9).fill(""),
    };
    bloco.apartamentos.push(novo);
    void saveData(d);
  }

  function removeApartamento(condId: string, blocoId: string, aptoId: string) {
    const d = structuredClone(data);
    const cond = d.condominios.find((c) => c.id === condId);
    const bloco = cond?.blocos.find((b) => b.id === blocoId);
    if (!bloco) return;
    bloco.apartamentos = bloco.apartamentos.filter((a) => a.id !== aptoId);
    void saveData(d);
  }

  function upsertApartamento(
    condId: string,
    blocoId: string,
    apto: Apartamento
  ) {
    const d = structuredClone(data);
    const cond = d.condominios.find((c) => c.id === condId);
    const bloco = cond?.blocos.find((b) => b.id === blocoId);
    if (!bloco) return;
    const idx = bloco.apartamentos.findIndex((a) => a.id === apto.id);
    if (idx >= 0) bloco.apartamentos[idx] = apto;
    else bloco.apartamentos.push(apto);
    void saveData(d);
  }

  const value = useMemo<Ctx>(
    () => ({
      data,
      loading,
      saveData,
      addCondominio,
      removeCondominio,
      addBloco,
      removeBloco,
      addApartamento,
      removeApartamento,
      upsertApartamento,
    }),
    [data, loading]
  );

  return (
    <AppStateContext.Provider value={value}>
      {children}
    </AppStateContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAppState() {
  const ctx = useContext(AppStateContext);
  if (!ctx)
    throw new Error("useAppState deve ser usado dentro de AppStateProvider");
  return ctx;
}
