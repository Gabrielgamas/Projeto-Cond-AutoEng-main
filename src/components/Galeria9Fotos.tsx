import { useRef } from "react";

type Props = Readonly<{
  value: string[]; // 9 elementos (dataURL ou "")
  onChange: (next: string[]) => void;
}>;

export default function Galeria9Fotos({ value, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const bulkInputRef = useRef<HTMLInputElement>(null);
  const tmpSlot = useRef<number>(-1);

  const fotos = value.length === 9 ? value : Array(9).fill("");

  // === Foto individual ===
  async function handlePick(slot: number) {
    tmpSlot.current = slot;
    inputRef.current?.click();
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // permite re-selecionar mesma foto
    if (!file) return;

    const dataUrl = await fileToDataURL(file);
    const idx = tmpSlot.current;
    const next = [...fotos];
    next[idx] = dataUrl;
    onChange(next);
  }

  // === Adicionar várias de uma vez ===
  async function handleBulkPick() {
    bulkInputRef.current?.click();
  }

  async function handleBulkFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const arr = Array.from(files).slice(0, 9);
    const dataUrls = await Promise.all(arr.map(fileToDataURL));

    const next = [...fotos];
    let slot = 0;
    for (const url of dataUrls) {
      // preenche slots vazios primeiro
      let idx = next.findIndex((v, i) => v === "" && i >= slot);
      if (idx === -1) idx = slot;
      next[idx] = url;
      slot = idx + 1;
      if (slot >= 9) slot = 0;
    }
    onChange(next);
    if (bulkInputRef.current) bulkInputRef.current.value = "";
  }

  const completos = fotos.filter(Boolean).length;
  const valido = completos === 9;

  return (
    <div className="space-y-2">
      {/* input individual */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={onFile}
      />

      {/* input múltiplo */}
      <input
        ref={bulkInputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => handleBulkFiles(e.target.files)}
      />

      {!valido && (
        <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2">
          Adicione exatamente 9 fotos (faltam {9 - completos}).
        </div>
      )}

      <div className="flex justify-end mb-2">
        <button
          onClick={handleBulkPick}
          className="px-3 py-1.5 rounded-lg border hover:bg-gray-50 text-sm"
        >
          Adicionar 9 fotos de uma vez
        </button>
      </div>

      {/* grade de 9 fotos */}
      <div className="grid grid-cols-3 gap-2">
        {fotos.map((f, i) => (
          <button
            key={i}
            type="button"
            onClick={() => handlePick(i)}
            className="aspect-square rounded-lg border overflow-hidden relative bg-gray-50 group"
            title={f ? "Trocar foto" : "Adicionar foto"}
            aria-label={f ? `Trocar foto ${i + 1}` : `Adicionar foto ${i + 1}`}
          >
            {f ? (
              <img src={f} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
                {i + 1}/9
              </div>
            )}

            {/* Botão de remover no canto superior direito */}
            {f && (
              <button
                type="button"
                className="absolute top-2 right-2 px-2 py-1 text-xs rounded bg-white/90 shadow hover:bg-white opacity-0 group-hover:opacity-100 transition"
                onClick={(e) => {
                  e.stopPropagation();
                  const next = [...fotos];
                  next[i] = "";
                  onChange(next);
                }}
              >
                Remover
              </button>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

function fileToDataURL(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onload = () => res(String(reader.result));
    reader.onerror = rej;
    reader.readAsDataURL(file);
  });
}
