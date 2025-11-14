import ToggleChip from "./ToggleChip";
import type { ChecklistComodo, TabelaComodos } from "../types";

const ROWS: (keyof TabelaComodos)[] = [
  "Sala",
  "Cozinha",
  "Quartos",
  "Banheiro",
  "Área de Serv.",
  "Varanda",
];

const COLS: (keyof ChecklistComodo)[] = [
  "Tugs e Tues",
  "Iluminação",
  "Acabamento",
  "Tensão e Corrente",
];

type Props = Readonly<{
  value: TabelaComodos;
  onChange: (next: TabelaComodos) => void;
}>;

export default function TabelaComodos({ value, onChange }: Props) {
  function toggle(r: keyof TabelaComodos, c: keyof ChecklistComodo) {
    const next = structuredClone(value);
    next[r][c] = !next[r][c];
    onChange(next);
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr>
            <th className="p-2 text-left">Cômodo</th>
            {COLS.map((c) => (
              <th key={c as string} className="p-2 text-center">
                {c}
              </th>
            ))}
          </tr>
        </thead>

        <tbody className="bg-white">
          {ROWS.map((r) => (
            <tr key={r as string} className="border-t">
              <td className="p-2 font-medium align-middle">{r}</td>

              {COLS.map((c) => (
                <td key={c as string} className="p-2 text-center align-middle">
                  <div className="inline-flex items-center justify-center mx-auto">
                    <ToggleChip
                      label={`${r} - ${c}`}
                      checked={value[r][c]}
                      onToggle={() => toggle(r, c)}
                    />
                  </div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
