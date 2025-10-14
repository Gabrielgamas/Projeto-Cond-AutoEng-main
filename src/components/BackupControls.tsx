/* src/components/BackupControls.tsx */
import {
  exportData,
  importDataFromFile,
  importDataMerge,
} from "../utils/backup";

export default function BackupControls() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        onClick={() => exportData()}
        className="cursor-pointer px-3 py-2 rounded-lg bg-yellow-500 hover:border hover:bg-gray-50"
        title="Baixar um arquivo .json com todos os dados"
      >
        Exportar
      </button>

      <label className="px-3 py-2 rounded-lg bg-green-400 hover:border hover:bg-gray-50 cursor-pointer">
        Acrescentar
        <input
          type="file"
          accept="application/json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) importDataMerge(f);
          }}
        />
      </label>

      <label className="px-3 py-2 rounded-lg bg-green-600 hover:border hover:bg-gray-50 cursor-pointer">
        Substituir
        <input
          type="file"
          accept="application/json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) importDataFromFile(f);
          }}
        />
      </label>
    </div>
  );
}
