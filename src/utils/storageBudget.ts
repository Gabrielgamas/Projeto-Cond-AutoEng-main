// src/utils/storageBudget.ts
export async function getStorageBudget() {
  if (!("storage" in navigator) || !navigator.storage?.estimate) {
    return null;
  }
  const { usage = 0, quota = 0 } = await navigator.storage.estimate();
  return { usage, quota, pct: quota ? usage / quota : 0 };
}

export async function ensurePersistentStorage() {
  if ("storage" in navigator && "persist" in navigator.storage) {
    try {
      const persisted = await navigator.storage.persisted?.();
      if (!persisted) await navigator.storage.persist?.();
    } catch {
      /* ignore */
    }
  }
}
