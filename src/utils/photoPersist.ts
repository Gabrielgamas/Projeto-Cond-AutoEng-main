// src/utils/photoPersist.ts
import type { Apartamento, Condominio } from "../types";
import type { AppData } from "./backup"; // ajuste o caminho se AppData estiver noutro arquivo
import { isPhotoKey, storePhoto } from "../storage/photoStore";

/** Guard auxiliar para detectar DataURL */
function isDataUrl(v: string): boolean {
  return v.startsWith("data:image/");
}

/** Lê a lista de casas de forma segura (se não existir, retorna []). */
function readCasas(c: Condominio): Apartamento[] {
  const rec = c as Record<string, unknown>;
  const raw = rec["casas"];
  return Array.isArray(raw) ? (raw as Apartamento[]) : [];
}

/** Itera blocos/apartamentos e casas de um condomínio chamando 'fn' para cada unidade. */
async function forEachUnidade(
  cond: Condominio,
  fn: (a: Apartamento) => Promise<void>
): Promise<void> {
  // blocos / apartamentos
  for (const b of cond.blocos ?? []) {
    for (const a of b.apartamentos ?? []) {
      await fn(a);
    }
  }

  // casas
  for (const a of readCasas(cond)) {
    await fn(a);
  }
}

/**
 * Varre todas as unidades (aptos/casas) e garante que fotos sejam
 * chaves do IndexedDB (armazenando DataURLs quando necessário).
 * Retorna uma cópia do AppData com as fotos substituídas por chaves.
 */
export async function materializePhotosToKeys(data: AppData): Promise<AppData> {
  const copy: AppData = structuredClone(data);

  const processUnidade = async (a: Apartamento) => {
    if (!a?.fotos) return;
    for (let i = 0; i < a.fotos.length; i++) {
      const v = a.fotos[i] ?? "";
      if (v && !isPhotoKey(v) && isDataUrl(v)) {
        // salva no IndexedDB e troca DataURL por chave
        const key = await storePhoto(v);
        a.fotos[i] = key;
      }
    }
  };

  for (const cond of copy.condominios) {
    await forEachUnidade(cond, processUnidade);
  }

  return copy;
}
