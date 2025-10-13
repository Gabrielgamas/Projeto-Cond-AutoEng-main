import type { ButtonHTMLAttributes } from "react";

type Props = Readonly<
  {
    checked: boolean;
    onToggle: () => void;
    label?: string;
  } & ButtonHTMLAttributes<HTMLButtonElement>
>;

export default function ToggleChip({
  checked,
  onToggle,
  label,
  ...rest
}: Props) {
  return (
    <button
      type="button"
      aria-pressed={checked}
      title={label}
      onClick={onToggle}
      className={`px-2 py-1 rounded-md border text-sm font-medium ${
        checked
          ? "bg-green-50 text-green-700 border-green-200"
          : "bg-red-50 text-red-700 border-red-200"
      }`}
      {...rest}
    >
      {checked ? "✔" : "✖"}
    </button>
  );
}
