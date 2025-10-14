// utils/backup.ts
import { get, set } from "idb-keyval";

// Se o seu AppStateContext exporta a chave, importe de lá.
// Caso contrário, garanta que este valor seja o MESMO usado no app:
export const STORAGE_KEY = "autoeng-data";

export async function exportData(
  filenamePrefix = "autoeng_backup"
): Promise<void> {
  const state = await get(STORAGE_KEY);
  const blob = new Blob([JSON.stringify(state, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const today = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `${filenamePrefix}_${today}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function importDataFromFile(file: File): Promise<void> {
  const txt = await file.text();
  const json = JSON.parse(txt);
  await set(STORAGE_KEY, json);
  // recarrega para todo mundo ler o estado novo
  location.reload();
}
