import { useState } from "react";
import { Link } from "react-router-dom";
import ConfirmDeleteDialog from "../components/ConfirmDeleteDialog";
import { useAppState } from "../state/AppStateContext";

export default function Home() {
  const { data, loading, addCondominio, removeCondominio } = useAppState();

  const [nomeCondominio, setNomeCondominio] = useState("");
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
        <div className="flex gap-2 items-center">
          <input
            value={nomeCondominio}
            onChange={(e) => setNomeCondominio(e.target.value)}
            placeholder="Nome do condomínio"
            className="border rounded-lg px-3 py-2 flex-1"
          />
          <button
            onClick={() => {
              const nome = nomeCondominio.trim();
              if (!nome) return;
              addCondominio(nome);
              setNomeCondominio("");
            }}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white"
          >
            Adicionar
          </button>
        </div>

        {/* lista de condomínios */}
        <div className="grid md:grid-cols-2 gap-4">
          {data.condominios.map((c) => {
            const totalAptos = c.blocos.reduce(
              (acc, b) => acc + b.apartamentos.length,
              0
            );
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
                    className="text-red-600 text-sm hover:underline"
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
                  {c.blocos.length} bloco(s) — {totalAptos} apartamento(s)
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
