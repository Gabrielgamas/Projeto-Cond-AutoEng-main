// utils/storage.ts
export type StorageEstimate = { usage: number; quota: number };

export async function getStorageEstimate(): Promise<StorageEstimate> {
  const { usage = 0, quota = 0 } =
    (await navigator.storage?.estimate?.()) ?? {};
  return { usage, quota };
}

/** Pede “armazenamento persistente” quando suportado (Chrome/Android/desktop). */
export async function ensurePersistentStorage(): Promise<boolean> {
  if (!("storage" in navigator) || !("persist" in navigator.storage))
    return false;
  try {
    const persisted = await navigator.storage.persist();
    return persisted;
  } catch {
    return false;
  }
}

/**
 * Verifica se podemos gravar `bytesToAdd` sem passar de uma margem da cota.
 * Por padrão deixa 10% de folga (reserveRatio=0.9).
 */
export async function canStoreBytes(
  bytesToAdd: number,
  reserveRatio = 0.9
): Promise<boolean> {
  const { usage, quota } = await getStorageEstimate();
  if (!quota) return true; // não consegue estimar → deixa passar
  return usage + bytesToAdd < quota * reserveRatio;
}

/** Converte um dataURL base64 em bytes aproximados (conta simples). */
export function approxBytesFromDataUrl(dataUrl: string): number {
  // base64 tem ~4/3 do tamanho do binário
  return Math.floor((dataUrl.length * 3) / 4);
}
