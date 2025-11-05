// src/components/Galeria9Fotos.tsx
import React from "react";
import { normalizeImageFile } from "../utils/images";
import {
  isPhotoKey,
  loadPhoto,
  storePhoto,
  removePhoto,
  type PhotoKey,
} from "../storage/photoStore";

type Props = {
  value: string[]; // 9 posições: chave @img:... ou ""
  onChange: (v: string[]) => void;
  showRemove?: boolean;
  disabled?: boolean;
  className?: string;
};

export default function Galeria9Fotos({
  value,
  onChange,
  showRemove = true,
  disabled = false,
  className = "",
}: Props) {
  const slots = React.useMemo(
    () => Array.from({ length: 9 }, (_, i) => value[i] ?? ""),
    [value]
  );

  const [resolved, setResolved] = React.useState<string[]>(() =>
    Array.from({ length: 9 }, () => "")
  );

  // refs dos inputs
  const inputRefs = React.useRef<Array<HTMLInputElement | null>>([]);

  React.useEffect(() => {
    let alive = true;
    (async () => {
      const arr = await Promise.all(
        slots.map((k) => (k ? loadPhoto(k) : Promise.resolve("")))
      );
      if (alive) setResolved(arr);
    })();
    return () => {
      alive = false;
    };
  }, [slots]);

  function updateAt(idx: number, newVal: string) {
    const next = [...slots];
    next[idx] = newVal;
    onChange(next);
  }

  async function handlePick(idx: number, file: File | null) {
    if (!file || disabled) return;
    const dataUrl = await normalizeImageFile(file);
    const key = await storePhoto(dataUrl);
    updateAt(idx, key);
  }

  async function handleRemove(idx: number) {
    if (disabled || !showRemove) return;
    const current = slots[idx] ?? "";
    if (isPhotoKey(current)) {
      await removePhoto(current as PhotoKey);
    }
    updateAt(idx, "");
  }

  function openPicker(idx: number) {
    if (disabled) return;
    inputRefs.current[idx]?.click();
  }

  return (
    <div className={`grid grid-cols-3 gap-2 ${className}`}>
      {slots.map((_, idx) => {
        const src = resolved[idx] || "";
        return (
          <div
            key={idx}
            className={`relative rounded-lg border border-gray-300 overflow-hidden group cursor-pointer ${
              disabled ? "opacity-60 cursor-not-allowed" : "hover:shadow-md"
            }`}
            onClick={() => openPicker(idx)}
          >
            {src ? (
              <img
                src={src}
                alt={`Foto ${idx + 1}`}
                className="block w-full h-28 object-cover"
                draggable={false}
              />
            ) : (
              <div className="w-full h-28 flex items-center justify-center text-gray-400 select-none">
                <span className="text-sm">Adicionar foto</span>
              </div>
            )}

            {/* input real, escondido visualmente (sem display:none) */}
            <input
              ref={(el: HTMLInputElement | null) => {
                // ← retorna void, não o 'el'
                inputRefs.current[idx] = el;
              }}
              type="file"
              accept="image/*"
              className="absolute w-0.5 h-0.5 opacity-0 -z-10"
              onChange={(e) => handlePick(idx, e.target.files?.[0] ?? null)}
              onClick={(e) => {
                // permite re-selecionar o mesmo arquivo
                (e.target as HTMLInputElement).value = "";
              }}
            />

            {showRemove && !disabled && src && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  void handleRemove(idx);
                }}
                className="absolute top-1 right-1 text-xs px-2 py-1 rounded bg-black/60 text-white opacity-0 group-hover:opacity-100 transition"
                title="Remover foto"
              >
                Remover
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
