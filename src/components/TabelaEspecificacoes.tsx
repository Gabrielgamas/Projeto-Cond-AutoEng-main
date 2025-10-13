import ToggleChip from "./ToggleChip";
import type { Especificacao } from "../types";

const FIELDS: (keyof Especificacao)[] = ["Campainha", "Chuveiro"];

type Props = Readonly<{
  value: Especificacao;
  onChange: (next: Especificacao) => void;
}>;

export default function TabelaEspecificacoes({ value, onChange }: Props) {
  function toggle(k: keyof Especificacao) {
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
