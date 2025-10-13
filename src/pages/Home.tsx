import { useEffect, useState } from "react";
import { get, set } from "idb-keyval";
import type { AppState, Condominio, Bloco, Apartamento } from "../types";
import ApartmentSection from "../components/ApartmentSection";
import GenerateLaudoButton from "../components/GenerateLaudoButton";
import ConfirmDeleteDialog from "../components/ConfirmDeleteDialog";

const STORAGE_KEY = "autoeng-data";

export default function Home() {
  /** ----------------- estado base ----------------- */
  const [confirmDelete, setConfirmDelete] = useState<{
    open: boolean;
    label: string;
    onConfirm: () => void;
  }>({ open: false, label: "", onConfirm: () => {} });
  const [data, setData] = useState<AppState>({
    schemaVersion: 1, // ✅ necessário pelo seu tipo AppState
    condominios: [],
  });
  const [loading, setLoading] = useState(true);

  /** ----------------- estado de formulários ----------------- */
  const [nomeCond, setNomeCond] = useState("");
  const [idBloco, setIdBloco] = useState<Record<string, string>>({});
  const [idApto, setIdApto] = useState<Record<string, string>>({});

  /** ----------------- carregar do IndexedDB ----------------- */
  useEffect(() => {
    (async () => {
      const saved = (await get(STORAGE_KEY)) as AppState | undefined;
      if (saved) setData(saved);
      setLoading(false);
    })();
  }, []);

  /** ----------------- persistência ----------------- */
  const saveData = async (next: AppState) => {
    setData(next);
    await set(STORAGE_KEY, next);
  };

  /** ----------------- ações: condomínio ----------------- */
  const addCondominio = (nome: string) => {
    if (!nome.trim()) return;
    const novo: Condominio = { id: crypto.randomUUID(), nome, blocos: [] };
    void saveData({ ...data, condominios: [...data.condominios, novo] });
  };

  const removeCondominio = (id: string) => {
    if (prompt("Digite EXCLUIR para confirmar") !== "EXCLUIR") return;
    void saveData({
      ...data,
      condominios: data.condominios.filter((c) => c.id !== id),
    });
  };

  /** ----------------- ações: bloco ----------------- */
  const addBloco = (condId: string, idBlocoNovo: string) => {
    if (!idBlocoNovo.trim()) return;
    const cond = data.condominios.find((c) => c.id === condId);
    if (!cond) return;
    const novo: Bloco = { id: idBlocoNovo, apartamentos: [] };
    cond.blocos.push(novo);
    void saveData({ ...data });
  };

  const removeBloco = (condId: string, blocoId: string) => {
    const cond = data.condominios.find((c) => c.id === condId);
    if (!cond) return;
    cond.blocos = cond.blocos.filter((b) => b.id !== blocoId);
    void saveData({ ...data });
  };

  /** ----------------- ações: apartamento ----------------- */
  const addApartamento = (
    condId: string,
    blocoId: string,
    idAptoNovo: string
  ) => {
    if (!idAptoNovo.trim()) return;
    const cond = data.condominios.find((c) => c.id === condId);
    const bloco = cond?.blocos.find((b) => b.id === blocoId);
    if (!bloco) return;

    const novo: Apartamento = {
      id: idAptoNovo,
      comodos: {
        Sala: {
          "Tugs e Tues": true,
          Iluminação: true,
          Acabamento: true,
          "Tensão e Corrente": true,
        },
        Cozinha: {
          "Tugs e Tues": true,
          Iluminação: true,
          Acabamento: true,
          "Tensão e Corrente": true,
        },
        Quartos: {
          "Tugs e Tues": true,
          Iluminação: true,
          Acabamento: true,
          "Tensão e Corrente": true,
        },
        Banheiro: {
          "Tugs e Tues": true,
          Iluminação: true,
          Acabamento: true,
          "Tensão e Corrente": true,
        },
        "Área de Serv.": {
          "Tugs e Tues": true,
          Iluminação: true,
          Acabamento: true,
          "Tensão e Corrente": true,
        },
        Varanda: {
          "Tugs e Tues": true,
          Iluminação: true,
          Acabamento: true,
          "Tensão e Corrente": true,
        },
      },
      quadro: {
        Acabamento: true,
        Circuitos: true,
        Identificação: true,
        "Tensão e Corrente": true,
      },
      especificacoes: { Campainha: true, Chuveiro: true },
      erros: [],
      fotos: Array(9).fill(""),
      observacoes: "",
    };

    bloco.apartamentos.push(novo);
    void saveData({ ...data });
  };

  const removeApartamento = (
    condId: string,
    blocoId: string,
    aptoId: string
  ) => {
    const cond = data.condominios.find((c) => c.id === condId);
    const bloco = cond?.blocos.find((b) => b.id === blocoId);
    if (!bloco) return;
    bloco.apartamentos = bloco.apartamentos.filter((a) => a.id !== aptoId);
    void saveData({ ...data });
  };

  const upsertApartamento = (
    condId: string,
    blocoId: string,
    apto: Apartamento
  ) => {
    const cond = data.condominios.find((c) => c.id === condId);
    const bloco = cond?.blocos.find((b) => b.id === blocoId);
    if (!bloco) return;
    const idx = bloco.apartamentos.findIndex((a) => a.id === apto.id);
    if (idx >= 0) bloco.apartamentos[idx] = apto;
    else bloco.apartamentos.push(apto);
    void saveData({ ...data });
  };

  /** ----------------- render ----------------- */
  if (loading) return <p className="text-center py-10">Carregando...</p>;

  return (
    <main className="max-w-5xl mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-bold">Condomínios</h1>

      {/* Criar novo condomínio */}
      <div className="flex items-center gap-2">
        <input
          value={nomeCond}
          onChange={(e) => setNomeCond(e.target.value)}
          placeholder="Nome do condomínio"
          className="flex-1 border rounded-lg px-3 py-2"
        />
        <button
          onClick={() => {
            addCondominio(nomeCond);
            setNomeCond("");
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg"
        >
          Adicionar
        </button>
      </div>

      {/* Lista de condomínios */}
      {data.condominios.map((c) => (
        <div
          key={c.id}
          className="border rounded-2xl p-4 space-y-3 bg-white shadow-sm"
        >
          <div className="flex justify-between items-center">
            <h2 className="font-semibold text-lg">{c.nome}</h2>
            <div className="flex items-center gap-3">
              <GenerateLaudoButton condominio={c} />
              <button
                onClick={() =>
                  setConfirmDelete({
                    open: true,
                    label: `o Condomínio "${c.nome}"`,
                    onConfirm: () => removeCondominio(c.id),
                  })
                }
                className="text-red-600 hover:underline"
              >
                Excluir condomínio
              </button>
            </div>
          </div>

          {/* Adicionar bloco */}
          <div className="flex items-center gap-2 mt-2">
            <input
              value={idBloco[c.id] || ""}
              onChange={(e) =>
                setIdBloco({ ...idBloco, [c.id]: e.target.value })
              }
              placeholder="Nº do bloco (ex: 20)"
              className="flex-1 border rounded-lg px-3 py-2"
            />
            <button
              onClick={() => {
                addBloco(c.id, idBloco[c.id] || "");
                setIdBloco({ ...idBloco, [c.id]: "" });
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg"
            >
              Adicionar bloco
            </button>
          </div>

          {/* Blocos */}
          {c.blocos.map((b) => (
            <div key={b.id} className="border rounded-xl p-3 mt-3 space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold">Bloco {b.id}</h3>
                <button
                  onClick={() =>
                    setConfirmDelete({
                      open: true,
                      label: `o Bloco ${b.id} do condomínio "${c.nome}"`,
                      onConfirm: () => removeBloco(c.id, b.id),
                    })
                  }
                  className="text-red-600 hover:underline"
                >
                  Excluir bloco
                </button>
              </div>

              {/* adicionar apartamento */}
              <div className="flex items-center gap-2">
                <input
                  value={idApto[b.id] || ""}
                  onChange={(e) =>
                    setIdApto({ ...idApto, [b.id]: e.target.value })
                  }
                  placeholder="Apto (ex: 201)"
                  className="flex-1 border rounded-lg px-3 py-2"
                />
                <button
                  onClick={() => {
                    addApartamento(c.id, b.id, idApto[b.id] || "");
                    setIdApto({ ...idApto, [b.id]: "" });
                  }}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg"
                >
                  Adicionar apto
                </button>
              </div>

              {/* apartamentos */}
              {b.apartamentos.map((a) => (
                <div
                  key={a.id}
                  className="border rounded-lg p-3 bg-gray-50 space-y-2"
                >
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Apartamento {a.id}</span>
                    <button
                      onClick={() =>
                        setConfirmDelete({
                          open: true,
                          label: `o Apartamento ${a.id} do bloco ${b.id} do condomínio "${c.nome}"`,
                          onConfirm: () => removeApartamento(c.id, b.id, a.id),
                        })
                      }
                      className="text-red-500 text-sm hover:underline"
                    >
                      Excluir apto
                    </button>
                  </div>

                  <ApartmentSection
                    apto={a}
                    onSave={(atualizado) =>
                      upsertApartamento(c.id, b.id, atualizado)
                    }
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
      ))}
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
    </main>
  );
}
