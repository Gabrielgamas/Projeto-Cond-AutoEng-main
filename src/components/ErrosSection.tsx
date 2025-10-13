import { useMemo, useState } from "react";
import type { ErroItem, TabelaComodos } from "../types";
import errorsCatalog from "../data/errorsCatalog";

type Props = Readonly<{
  comodos: TabelaComodos;
  value: ErroItem[];
  onChange: (next: ErroItem[]) => void;
}>;

const COMODO_OPS = [
  "Geral",
  "Sala",
  "Cozinha",
  "Quartos",
  "Banheiro",
  "Área de Serv.",
  "Varanda",
] as const;
type ComodoOption = (typeof COMODO_OPS)[number];

const ITEM_OPS = [
  "Tugs e Tues",
  "Iluminação",
  "Acabamento",
  "Tensão e Corrente",
  "Quadro",
  "Especificação",
] as const;
type ItemOption = (typeof ITEM_OPS)[number];

export default function ErrosSection({ value, onChange }: Props) {
  const [desc, setDesc] = useState("");
  const [comodo, setComodo] = useState<ComodoOption>("Geral");
  const [item, setItem] = useState<ItemOption>("Tugs e Tues");

  const catalog = useMemo(() => errorsCatalog, []);

  function add() {
    const d = desc.trim();
    if (!d) return;
    const next: ErroItem = {
      id: crypto.randomUUID(),
      descricao: d,
      comodo: comodo === "Geral" ? "Geral" : comodo,
      item,
    };
    onChange([...(value || []), next]);
    setDesc("");
  }

  function remove(id: string) {
    onChange((value || []).filter((e) => e.id !== id));
  }

  return (
    <div className="space-y-3">
      <div className="grid sm:grid-cols-4 gap-2">
        <input
          className="border rounded p-2 sm:col-span-2"
          list="erros-catalog"
          placeholder="Selecione ou digite o erro"
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
        />
        <datalist id="erros-catalog">
          {catalog.map((e) => (
            <option key={e} value={e} />
          ))}
        </datalist>

        <select
          className="border rounded p-2"
          value={comodo}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
            setComodo(e.target.value as ComodoOption)
          }
        >
          {COMODO_OPS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <select
          className="border rounded p-2"
          value={item}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
            setItem(e.target.value as ItemOption)
          }
        >
          {ITEM_OPS.map((i) => (
            <option key={i} value={i}>
              {i}
            </option>
          ))}
        </select>

        <button
          className="bg-blue-600 text-white rounded p-2"
          onClick={add}
          title="Adicionar erro"
        >
          Adicionar
        </button>
      </div>

      <ul className="space-y-2">
        {value.length === 0 && (
          <li className="text-sm text-gray-600">Nenhum erro adicionado.</li>
        )}
        {value.map((e) => (
          <li
            key={e.id}
            className="flex items-center justify-between border rounded p-2"
          >
            <span className="text-sm">
              {e.descricao}
              {e.comodo ? ` — ${e.comodo}` : ""} {e.item ? `(${e.item})` : ""}
            </span>
            <button
              className="text-red-600 text-sm"
              onClick={() => remove(e.id)}
            >
              Remover
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
