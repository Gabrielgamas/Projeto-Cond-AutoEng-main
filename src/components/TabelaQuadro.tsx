import ToggleChip from "./ToggleChip";
import type { QuadroDistribuicao } from "../types";

const FIELDS: (keyof QuadroDistribuicao)[] = [
  "Acabamento",
  "Circuitos",
  "Identificação",
  "Tensão e Corrente",
];

type Props = Readonly<{
  value: QuadroDistribuicao;
  onChange: (next: QuadroDistribuicao) => void;
}>;

export default function TabelaQuadro({ value, onChange }: Props) {
  function toggle(k: keyof QuadroDistribuicao) {
    const next = { ...value, [k]: !value[k] };
    onChange(next);
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {FIELDS.map((k) => (
        <div
          key={k as string}
          className="flex items-center justify-between border rounded-md p-2"
        >
          <span className="font-medium">{k}</span>
          <ToggleChip checked={value[k]} onToggle={() => toggle(k)} />
        </div>
      ))}
    </div>
  );
}
