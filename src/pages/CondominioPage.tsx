import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAppState } from "../state/AppStateContext";
import ApartmentSection from "../components/ApartmentSection";
import GenerateLaudoButton from "../components/GenerateLaudoButton";
import ConfirmDeleteDialog from "../components/ConfirmDeleteDialog";

export default function CondominioPage() {
  const { condId = "" } = useParams();
  const navigate = useNavigate();
  const {
    data,
    loading,
    addBloco,
    removeBloco,
    addApartamento,
    removeApartamento,
    upsertApartamento,
    addCasa,
    removeCasa,
    upsertCasa,
  } = useAppState();

  const cond = useMemo(
    () => data.condominios.find((c) => c.id === condId),
    [data, condId]
  );

  const [idBloco, setIdBloco] = useState("");
  const [idAptoPorBloco, setIdAptoPorBloco] = useState<Record<string, string>>(
    {}
  );
  const [idCasa, setIdCasa] = useState("");
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
  if (!cond)
    return (
      <main className="p-4">
        <div className="max-w-5xl mx-auto space-y-3">
          <p>Condomínio não encontrado.</p>
          <Link to="/" className="text-blue-600 hover:underline">
            Voltar
          </Link>
        </div>
      </main>
    );

  return (
    <main className="p-4">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center gap-2">
          <button
            className="text-sm text-gray-600 hover:underline"
            onClick={() => navigate(-1)}
          >
            ← Voltar
          </button>
          <h1 className="text-2xl font-bold flex-1">{cond.nome}</h1>
          <GenerateLaudoButton condominio={cond} />
        </div>

        {cond.tipo === "BLOCOS" ? (
          <>
            {/* adicionar bloco */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <input
                value={idBloco}
                onChange={(e) => setIdBloco(e.target.value)}
                placeholder="Nº do bloco (ex: 20)"
                className="border rounded-lg px-3 py-2 w-full sm:flex-1"
              />
              <button
                onClick={() => {
                  const id = idBloco.trim();
                  if (!id) return;
                  addBloco(cond.id, id);
                  setIdBloco("");
                }}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white w-full sm:w-auto"
              >
                Adicionar bloco
              </button>
            </div>

            {/* blocos */}
            <div className="space-y-6">
              {cond.blocos.map((b) => (
                <div key={b.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-lg font-semibold">Bloco {b.id}</h2>
                    <button
                      onClick={() =>
                        setConfirmDelete({
                          open: true,
                          label: `o Bloco ${b.id} do condomínio "${cond.nome}"`,
                          onConfirm: () => removeBloco(cond.id, b.id),
                        })
                      }
                      className="text-red-600 text-sm hover:underline"
                    >
                      Excluir bloco
                    </button>
                  </div>

                  {/* adicionar apto */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mt-2">
                    <input
                      value={idAptoPorBloco[b.id] || ""}
                      onChange={(e) =>
                        setIdAptoPorBloco({
                          ...idAptoPorBloco,
                          [b.id]: e.target.value,
                        })
                      }
                      placeholder="Nº do apto (ex: 101)"
                      className="border rounded-lg px-3 py-2 w-full sm:flex-1"
                    />
                    <button
                      onClick={() => {
                        const idApto = (idAptoPorBloco[b.id] || "").trim();
                        if (!idApto) return;
                        addApartamento(cond.id, b.id, idApto);
                        setIdAptoPorBloco({ ...idAptoPorBloco, [b.id]: "" });
                      }}
                      className="px-4 py-2 rounded-lg bg-blue-600 text-white w-full sm:w-auto"
                    >
                      Adicionar apto
                    </button>
                  </div>

                  {/* apartamentos: full width */}
                  <div className="mt-4 space-y-4">
                    {b.apartamentos.map((a) => (
                      <div key={a.id} className="border rounded-lg p-3 w-full">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">
                            Apartamento {a.id}
                          </span>
                          <button
                            onClick={() =>
                              setConfirmDelete({
                                open: true,
                                label: `o Apartamento ${a.id} do bloco ${b.id} do condomínio "${cond.nome}"`,
                                onConfirm: () =>
                                  removeApartamento(cond.id, b.id, a.id),
                              })
                            }
                            className="text-red-600 text-xs hover:underline"
                          >
                            Excluir apto
                          </button>
                        </div>

                        <ApartmentSection
                          apto={a}
                          onSave={(atualizado) =>
                            upsertApartamento(cond.id, b.id, atualizado)
                          }
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            {/* adicionar casa */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <input
                value={idCasa}
                onChange={(e) => setIdCasa(e.target.value)}
                placeholder="Nº da casa (ex: 12)"
                className="border rounded-lg px-3 py-2 w-full sm:flex-1"
              />
              <button
                onClick={() => {
                  const id = idCasa.trim();
                  if (!id) return;
                  addCasa(cond.id, id);
                  setIdCasa("");
                }}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white w-full sm:w-auto"
              >
                Adicionar casa
              </button>
            </div>

            {/* casas: full width */}
            <div className="space-y-4">
              {(cond.casas ?? []).map((casa) => (
                <div key={casa.id} className="border rounded-lg p-3 w-full">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">Casa {casa.id}</span>
                    <button
                      onClick={() =>
                        setConfirmDelete({
                          open: true,
                          label: `a Casa ${casa.id} do condomínio "${cond.nome}"`,
                          onConfirm: () => removeCasa(cond.id, casa.id),
                        })
                      }
                      className="text-red-600 text-xs hover:underline"
                    >
                      Excluir casa
                    </button>
                  </div>

                  <ApartmentSection
                    label="Casa"
                    apto={casa}
                    onSave={(atualizado) => upsertCasa(cond.id, atualizado)}
                  />
                </div>
              ))}
            </div>
          </>
        )}

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
