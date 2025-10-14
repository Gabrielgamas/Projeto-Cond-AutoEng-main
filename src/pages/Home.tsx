import { useState } from "react";
import { Link } from "react-router-dom";
import ConfirmDeleteDialog from "../components/ConfirmDeleteDialog";
import { useAppState } from "../state/AppStateContext";
import type { CondominioTipo } from "../types";
import { exportData, importDataFromFile } from "../utils/backup";

export default function Home() {
  const { data, loading, addCondominio, removeCondominio } = useAppState();

  const [nomeCondominio, setNomeCondominio] = useState("");
  const [tipo, setTipo] = useState<CondominioTipo>("BLOCOS"); // NOVO
  const [confirmDelete, setConfirmDelete] = useState<{
    open: boolean;
    label: string;
    onConfirm: () => void;
  }>({ open: false, label: "", onConfirm: () => {} });

  if (loading)
    return (
      <main className="p-4">
        <div className="max-w-5xl mx-auto">Carregando…</div>
      </main>
    );

  return (
    <main className="p-4">
      <div className="max-w-5xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold">Condomínios</h1>

        {/* adicionar condomínio */}
        <div className="flex flex-col md:flex-row gap-2 md:items-center">
          <input
            value={nomeCondominio}
            onChange={(e) => setNomeCondominio(e.target.value)}
            placeholder="Nome do condomínio"
            className="border rounded-lg px-3 py-2 flex-1"
          />

          {/* seletor de layout */}
          <div className="flex gap-2">
            <label
              className={`px-3 py-2 rounded-lg border cursor-pointer ${
                tipo === "BLOCOS" ? "bg-blue-50 border-blue-300" : ""
              }`}
            >
              <input
                type="radio"
                className="mr-2"
                checked={tipo === "BLOCOS"}
                onChange={() => setTipo("BLOCOS")}
              />
              Blocos & apartamentos
            </label>

            <label
              className={`px-3 py-2 rounded-lg border cursor-pointer ${
                tipo === "CASAS" ? "bg-blue-50 border-blue-300" : ""
              }`}
            >
              <input
                type="radio"
                className="mr-2"
                checked={tipo === "CASAS"}
                onChange={() => setTipo("CASAS")}
              />
              Somente casas
            </label>
          </div>

          <button
            onClick={() => {
              const nome = nomeCondominio.trim();
              if (!nome) return;
              addCondominio(nome, tipo); // passa o tipo escolhido
              setNomeCondominio("");
            }}
            className="px-4 py-2 rounded-lg cursor-pointer bg-blue-600 text-white"
          >
            Adicionar
          </button>
          <button
            onClick={() => exportData()}
            className="px-3 py-2 rounded-lg hover:border cursor-pointer bg-green-500 hover:bg-gray-50"
            title="Baixar um arquivo .json com todos os dados"
          >
            Exportar dados
          </button>

          <label className="text-center text-white px-3 py-2 cursor-pointer bg-green-800 rounded-lg hover:border hover:bg-gray-50 cursor-pointer hover:text-black">
            Importar
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

        {/* lista */}
        <div className="grid md:grid-cols-2 gap-4">
          {data.condominios.map((c) => {
            const totalAptos =
              c.tipo === "BLOCOS"
                ? c.blocos.reduce((acc, b) => acc + b.apartamentos.length, 0)
                : c.casas?.length ?? 0;

            return (
              <div key={c.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <Link
                    to={`/condominio/${c.id}`}
                    className="text-lg font-semibold hover:underline"
                  >
                    {c.nome}
                  </Link>
                  <button
                    className="text-red-600 cursor-pointer text-sm hover:underline"
                    onClick={() =>
                      setConfirmDelete({
                        open: true,
                        label: `o Condomínio "${c.nome}"`,
                        onConfirm: () => removeCondominio(c.id),
                      })
                    }
                  >
                    Excluir
                  </button>
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  {c.tipo === "BLOCOS"
                    ? `${c.blocos.length} bloco(s) — ${totalAptos} apartamento(s)`
                    : `${totalAptos} casa(s)`}
                </div>
              </div>
            );
          })}
        </div>

        <ConfirmDeleteDialog
          open={confirmDelete.open}
          onClose={() => setConfirmDelete({ ...confirmDelete, open: false })}
          entityLabel={confirmDelete.label}
          onConfirm={() => {
            const fn = confirmDelete.onConfirm;
            setConfirmDelete({ ...confirmDelete, open: false });
            fn();
          }}
        />
      </div>
    </main>
  );
}
