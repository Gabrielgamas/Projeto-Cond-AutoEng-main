export type StorageEstimate = { usage: number; quota: number };

export async function getStorageEstimate(): Promise<StorageEstimate> {
  const { usage = 0, quota = 0 } =
    (await navigator.storage?.estimate?.()) ?? {};
  return { usage, quota };
}

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

export async function canStoreBytes(
  bytesToAdd: number,
  reserveRatio = 0.9
): Promise<boolean> {
  const { usage, quota } = await getStorageEstimate();
  if (!quota) return true;
  return usage + bytesToAdd < quota * reserveRatio;
}

export function approxBytesFromDataUrl(dataUrl: string): number {
  return Math.floor((dataUrl.length * 3) / 4);
}
