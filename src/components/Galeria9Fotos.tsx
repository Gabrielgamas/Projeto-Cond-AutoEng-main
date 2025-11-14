import React from "react";
import { normalizeImageFile } from "../utils/images";
import {
  isPhotoKey,
  loadPhoto,
  storePhoto,
  removePhoto,
  type PhotoKey,
} from "../storage/photoStore";
import { getStorageBudget } from "../utils/storageBudget";

type Props = {
  value: string[];
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

  const inputRefs = React.useRef<Array<HTMLInputElement | null>>([]);

  const multiInputRef = React.useRef<HTMLInputElement | null>(null);

  const hiddenInputStyle: React.CSSProperties = {
    position: "absolute",
    width: 0.5,
    height: 0.5,
    opacity: 0,
    overflow: "hidden",
    zIndex: -1,
  };

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

  function updateMany(indices: number[], keys: string[]) {
    const next = [...slots];
    indices.forEach((i, n) => {
      if (i >= 0 && i < next.length) next[i] = keys[n] ?? next[i];
    });
    onChange(next);
  }

  async function handlePick(idx: number, file: File | null) {
    if (!file || disabled) return;

    const budget = await getStorageBudget();
    if (budget && budget.quota && budget.pct > 0.8) {
      alert(
        "Armazenamento quase cheio. Exporte um backup e/ou apague algumas fotos antes de continuar."
      );
      return;
    }

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

  function openMultiPicker() {
    if (disabled) return;
    multiInputRef.current?.click();
  }

  async function handleMultiSelect(files: FileList | null) {
    if (!files || disabled) return;

    const emptyIdxs = slots
      .map((v, i) => (v ? -1 : i))
      .filter((i) => i >= 0)
      .slice(0, 9);

    if (emptyIdxs.length === 0) {
      alert("Todos os 9 slots já estão preenchidos.");
      return;
    }

    const toProcess: File[] = Array.from(files).slice(0, emptyIdxs.length);

    const budget = await getStorageBudget();
    if (budget && budget.quota && budget.pct > 0.8) {
      alert(
        "Armazenamento quase cheio. Exporte um backup e/ou apague algumas fotos antes de continuar."
      );
      return;
    }

    const producedKeys: string[] = [];
    for (const f of toProcess) {
      const dataUrl = await normalizeImageFile(f);
      const key = await storePhoto(dataUrl);
      producedKeys.push(key);
    }

    if (files.length > toProcess.length) {
      alert(
        `Foram selecionadas ${files.length} fotos, mas só havia ${toProcess.length} espaço(s) disponível(is). Apenas os primeiros slots foram preenchidos.`
      );
    }

    updateMany(emptyIdxs, producedKeys);
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={openMultiPicker}
          disabled={disabled}
          className={`px-3 py-2 rounded-lg text-white ${
            disabled
              ? "bg-gray-300 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700"
          }`}
          title="Selecionar várias fotos para preencher os slots vazios"
        >
          Adicionar várias
        </button>

        <input
          ref={multiInputRef}
          type="file"
          multiple
          accept="image/*"
          style={hiddenInputStyle}
          onChange={(e) => {
            void handleMultiSelect(e.target.files);

            e.currentTarget.value = "";
          }}
        />
      </div>

      <div className="grid grid-cols-3 gap-2">
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

              <input
                ref={(el: HTMLInputElement | null) => {
                  inputRefs.current[idx] = el;
                }}
                type="file"
                accept="image/*"
                style={hiddenInputStyle}
                onChange={(e) => {
                  void handlePick(idx, e.target.files?.[0] ?? null);
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
    </div>
  );
}
