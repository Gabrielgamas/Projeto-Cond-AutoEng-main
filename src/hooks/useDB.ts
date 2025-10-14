import { get, set } from "idb-keyval";
import { useEffect, useMemo, useState } from "react";
import type { AppState, Condominio, Bloco, Apartamento } from "../types";
const STORAGE_KEY = "condominio-data-v1";

// Debounce simples para salvar
function useDebouncedEffect(
  effect: () => void | Promise<void>,
  deps: any[],
  delay = 400
) {
  useEffect(() => {
    const h = setTimeout(() => {
      void effect();
    }, delay);
    return () => clearTimeout(h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

export function useDB() {
  const [data, setData] = useState<AppState>({
    condominios: [],
    schemaVersion: 1,
  });
  const [loaded, setLoaded] = useState(false);

  // Carrega ao iniciar
  useEffect(() => {
    (async () => {
      const stored = await get<AppState>(STORAGE_KEY);
      if (stored) setData(stored);
      setLoaded(true);
    })();
  }, []);

  // Salva com debounce quando data muda
  useDebouncedEffect(() => set(STORAGE_KEY, data), [data], 400);

  // Helpers CRUD (condomínio / bloco / apartamento)
  const api = useMemo(() => {
    function addCondominio(nome: string) {
      const novo: Condominio = {
        id: crypto.randomUUID(),
        nome,
        tipo: "BLOCOS", // ✅ adicione isto
        blocos: [],
      };
      setData((prev) => ({
        ...prev,
        condominios: [...prev.condominios, novo],
      }));
      return novo.id;
    }

    function updateCondominio(c: Condominio) {
      setData((prev) => ({
        ...prev,
        condominios: prev.condominios.map((x) => (x.id === c.id ? c : x)),
      }));
    }

    function removeCondominio(id: string) {
      setData((prev) => ({
        ...prev,
        condominios: prev.condominios.filter((c) => c.id !== id),
      }));
    }

    function addBloco(condoId: string, blocoId: string) {
      setData((prev) => ({
        ...prev,
        condominios: prev.condominios.map((c) => {
          if (c.id !== condoId) return c;
          if (c.blocos.find((b) => b.id === blocoId)) return c; // evita duplicado
          const novo: Bloco = { id: blocoId, apartamentos: [] };
          return { ...c, blocos: [...c.blocos, novo] };
        }),
      }));
    }

    function removeBloco(condoId: string, blocoId: string) {
      setData((prev) => ({
        ...prev,
        condominios: prev.condominios.map((c) =>
          c.id !== condoId
            ? c
            : { ...c, blocos: c.blocos.filter((b) => b.id !== blocoId) }
        ),
      }));
    }

    function upsertApartamento(
      condoId: string,
      blocoId: string,
      apto: Apartamento
    ) {
      setData((prev) => ({
        ...prev,
        condominios: prev.condominios.map((c) => {
          if (c.id !== condoId) return c;
          return {
            ...c,
            blocos: c.blocos.map((b) => {
              if (b.id !== blocoId) return b;
              const exists = b.apartamentos.some((a) => a.id === apto.id);
              return exists
                ? {
                    ...b,
                    apartamentos: b.apartamentos.map((a) =>
                      a.id === apto.id ? apto : a
                    ),
                  }
                : { ...b, apartamentos: [...b.apartamentos, apto] };
            }),
          };
        }),
      }));
    }

    function removeApartamento(
      condoId: string,
      blocoId: string,
      aptoId: string
    ) {
      setData((prev) => ({
        ...prev,
        condominios: prev.condominios.map((c) => {
          if (c.id !== condoId) return c;
          return {
            ...c,
            blocos: c.blocos.map((b) =>
              b.id !== blocoId
                ? b
                : {
                    ...b,
                    apartamentos: b.apartamentos.filter((a) => a.id !== aptoId),
                  }
            ),
          };
        }),
      }));
    }

    return {
      addCondominio,
      updateCondominio,
      removeCondominio,
      addBloco,
      removeBloco,
      upsertApartamento,
      removeApartamento,
    };
  }, []);

  return { loaded, data, setData, ...api };
}
