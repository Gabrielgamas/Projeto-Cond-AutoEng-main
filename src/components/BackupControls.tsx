import React from "react";
import { useAppState } from "../state/AppStateContext";
import { readBackupFile, mergeAppData, isValidAppData } from "../utils/backup";
import { exportTudoComImagens } from "../utils/photoPersist";

export default function BackupControls() {
  const { data, setData, saveData } = useAppState();

  const hiddenFileStyle: React.CSSProperties = {
    position: "absolute",
    width: 0.1,
    height: 0.1,
    opacity: 0,
    overflow: "hidden",
    zIndex: -1,
  };

  async function onAppendFile(e: React.ChangeEvent<HTMLInputElement>) {
    try {
      const file = e.target.files?.[0];

      e.target.value = "";
      if (!file) return;

      const incoming = await readBackupFile(file);
      if (!isValidAppData(incoming)) {
        return;
      }
      const merged = await mergeAppData(data, incoming);
      setData(merged);
    } catch (err) {
      console.error(err);
    }
  }

  async function onReplaceFile(e: React.ChangeEvent<HTMLInputElement>) {
    try {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file) return;

      const incoming = await readBackupFile(file);
      if (!isValidAppData(incoming)) {
        return;
      }
      saveData(incoming);
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => exportTudoComImagens(data)}
        className="px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-900 text-white"
        title="Exporta um arquivo .json com todos os dados"
      >
        Exportar
      </button>

      <label
        htmlFor="append-json"
        className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
        title="Acrescenta (mescla) o conteúdo de um backup ao atual"
      >
        Acrescentar
      </label>
      <input
        id="append-json"
        type="file"
        accept="application/json,.json"
        style={hiddenFileStyle}
        onChange={onAppendFile}
      />

      <label
        htmlFor="replace-json"
        className="px-3 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white cursor-pointer"
        title="Substitui TODOS os dados pelo backup selecionado"
      >
        Substituir
      </label>
      <input
        id="replace-json"
        type="file"
        accept="application/json,.json"
        style={hiddenFileStyle}
        onChange={onReplaceFile}
      />
    </div>
  );
}
