import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { get, set } from "idb-keyval";
import type {
  AppState,
  Condominio,
  Bloco,
  Apartamento,
  CondominioTipo,
} from "../types";

const STORAGE_KEY = "autoeng-data";

type Ctx = {
  data: AppState;
  loading: boolean;
  saveData: (next: AppState) => Promise<void>;
  // condomínio
  addCondominio: (nome: string, tipo: CondominioTipo) => void;
  removeCondominio: (id: string) => void;
  // blocos/apartamentos
  addBloco: (condId: string, idBloco: string) => void;
  removeBloco: (condId: string, blocoId: string) => void;
  addApartamento: (condId: string, blocoId: string, idApto: string) => void;
  removeApartamento: (condId: string, blocoId: string, aptoId: string) => void;
  upsertApartamento: (
    condId: string,
    blocoId: string,
    apto: Apartamento
  ) => void;
  // casas (sem bloco)
  addCasa: (condId: string, idCasa: string) => void;
  removeCasa: (condId: string, idCasa: string) => void;
  upsertCasa: (condId: string, casa: Apartamento) => void;
};
// eslint-disable-next-line react-refresh/only-export-components
export const AppStateContext = createContext<Ctx | null>(null);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<AppState>({
    schemaVersion: 2,
    condominios: [],
  });
  const [loading, setLoading] = useState(true);

  type CondominioV1 = {
    id: string;
    nome: string;
    blocos: Bloco[];
  };

  type AppStateV1 = {
    schemaVersion: 1;
    condominios: CondominioV1[];
  };

  // migração p/ schema v2 (adiciona tipo e casas opcional)
  useEffect(() => {
    (async () => {
      try {
        const stored = await get<AppState | AppStateV1 | undefined>(
          STORAGE_KEY
        );
        if (!stored) return;

        // dados já no schema novo
        if ("schemaVersion" in stored && stored.schemaVersion >= 2) {
          setData(stored as AppState);
          return;
        }

        // v1 -> v2 (sem any)
        const v1 = stored as AppStateV1;
        const migrated: AppState = {
          schemaVersion: 2,
          condominios: v1.condominios.map(
            (c): Condominio => ({
              ...c,
              tipo: "BLOCOS",
              casas: [],
            })
          ),
        };

        setData(migrated);
        await set(STORAGE_KEY, migrated);
      } finally {
        setLoading(false);
      }
    })().catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (loading) setLoading(false);
  }, [loading]);

  const saveData = async (next: AppState) => {
    setData(next);
    await set(STORAGE_KEY, next);
  };

  // helpers
  function newUnit(id: string): Apartamento {
    return {
      id,
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
      },
      especificacoes: { Campainha: true, Chuveiro: true },
      erros: [],
      fotos: Array(9).fill(""),
    };
  }

  // condomínio
  function addCondominio(nome: string, tipo: CondominioTipo) {
    const novo: Condominio = {
      id: crypto.randomUUID(),
      nome,
      tipo,
      blocos: [],
      casas: tipo === "CASAS" ? [] : undefined,
    };
    void saveData({ ...data, condominios: [...data.condominios, novo] });
  }

  function removeCondominio(id: string) {
    void saveData({
      ...data,
      condominios: data.condominios.filter((c) => c.id !== id),
    });
  }

  // blocos/apartamentos
  function addBloco(condId: string, idBloco: string) {
    if (!idBloco.trim()) return;
    const d = structuredClone(data);
    const cond = d.condominios.find((c) => c.id === condId);
    if (!cond || cond.tipo !== "BLOCOS") return;
    if (cond.blocos.some((b) => b.id === idBloco)) return;
    const novo: Bloco = { id: idBloco, apartamentos: [] };
    cond.blocos.push(novo);
    void saveData(d);
  }

  function removeBloco(condId: string, blocoId: string) {
    const d = structuredClone(data);
    const cond = d.condominios.find((c) => c.id === condId);
    if (!cond || cond.tipo !== "BLOCOS") return;
    cond.blocos = cond.blocos.filter((b) => b.id !== blocoId);
    void saveData(d);
  }

  function addApartamento(condId: string, blocoId: string, idApto: string) {
    if (!idApto.trim()) return;
    const d = structuredClone(data);
    const cond = d.condominios.find((c) => c.id === condId);
    const bloco = cond?.blocos.find((b) => b.id === blocoId);
    if (!bloco) return;
    if (bloco.apartamentos.some((a) => a.id === idApto)) return;
    bloco.apartamentos.push(newUnit(idApto));
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

  // casas
  function addCasa(condId: string, idCasa: string) {
    if (!idCasa.trim()) return;
    const d = structuredClone(data);
    const cond = d.condominios.find((c) => c.id === condId);
    if (!cond || cond.tipo !== "CASAS") return;
    cond.casas ??= [];
    if (cond.casas.some((u) => u.id === idCasa)) return;
    cond.casas.push(newUnit(idCasa));
    void saveData(d);
  }

  function removeCasa(condId: string, idCasa: string) {
    const d = structuredClone(data);
    const cond = d.condominios.find((c) => c.id === condId);
    if (!cond || cond.tipo !== "CASAS" || !cond.casas) return;
    cond.casas = cond.casas.filter((u) => u.id !== idCasa);
    void saveData(d);
  }

  function upsertCasa(condId: string, casa: Apartamento) {
    const d = structuredClone(data);
    const cond = d.condominios.find((c) => c.id === condId);
    if (!cond || cond.tipo !== "CASAS") return;
    cond.casas ??= [];
    const idx = cond.casas.findIndex((u) => u.id === casa.id);
    if (idx >= 0) cond.casas[idx] = casa;
    else cond.casas.push(casa);
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
      addCasa,
      removeCasa,
      upsertCasa,
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
