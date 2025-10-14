import React, { useRef } from "react";
import { normalizeImageFile } from "../utils/images";
import { canStoreBytes, approxBytesFromDataUrl } from "../utils/storage";

type Props = {
  /** Você pode passar value OU fotos (são equivalentes) */
  value?: string[];
  fotos?: string[];
  onChange: (v: string[]) => void;

  maxWidth?: number; // default 1280
  quality?: number; // default 0.82
};

export default function Galeria9Fotos({
  value,
  fotos: fotosProp,
  onChange,
  maxWidth = 1280,
  quality = 0.82,
}: Props) {
  // aceita value ou fotos; se nenhum vier, preenche 9 vazios
  const fotos = (value ?? fotosProp ?? Array(9).fill("")) as string[];

  const inputRef = useRef<HTMLInputElement | null>(null);

  const setFoto = (idx: number, dataUrl: string) => {
    const next = [...fotos];
    next[idx] = dataUrl;
    onChange(next);
  };

  const clearFoto = (idx: number) => {
    const next = [...fotos];
    next[idx] = "";
    onChange(next);
  };

  async function handleSingleSelect(idx: number, file?: File) {
    if (!file) return;
    try {
      const optimized = await normalizeImageFile(file, maxWidth, quality);

      const ok = await canStoreBytes(approxBytesFromDataUrl(optimized));
      if (!ok) {
        alert(
          "Espaço insuficiente para salvar esta foto. Exporte seus dados ou apague algumas fotos."
        );
        return;
      }

      setFoto(idx, optimized);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Falha ao processar imagem.");
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  // multi-upload: preenche slots vazios

  async function handleMultiSelect(files: FileList | null) {
    if (!files || files.length === 0) return;
    try {
      const emptyIdxs = fotos
        .map((v, i) => (v ? -1 : i))
        .filter((i) => i >= 0)
        .slice(0, files.length);

      const next = [...fotos];
      for (let j = 0; j < emptyIdxs.length; j++) {
        const idx = emptyIdxs[j];
        const file = files[j];
        if (!file) break;
        const optimized = await normalizeImageFile(file, maxWidth, quality);

        const ok = await canStoreBytes(approxBytesFromDataUrl(optimized));
        if (!ok) {
          alert(
            `Sem espaço para salvar a foto ${
              j + 1
            }. Dica: exporte seus dados e libere espaço.`
          );
          break;
        }

        next[idx] = optimized;
      }
      onChange(next);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Falha ao processar imagens.");
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-2">
      {/* multi-upload */}
      <div className="flex items-center gap-2">
        <label className="px-3 py-2 border rounded-lg cursor-pointer">
          Adicionar várias fotos
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => handleMultiSelect(e.target.files)}
          />
        </label>
        <span className="text-sm text-gray-500">
          Espaços livres: {fotos.filter((f) => !f).length}/9
        </span>
      </div>

      {/* grade 3x3 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {Array.from({ length: 9 }, (_, i) => (
          <FotoItem
            key={i}
            idx={i}
            src={fotos[i]}
            onPick={(file) => handleSingleSelect(i, file)}
            onRemove={() => clearFoto(i)}
          />
        ))}
      </div>
    </div>
  );
}

type FotoItemProps = {
  idx: number;
  src: string;
  onPick: (file?: File) => void;
  onRemove?: () => void; // ← deixa opcional, mas não vamos destruturar
};

function FotoItem({ idx, src, onPick }: FotoItemProps) {
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const handleClick = () => inputRef.current?.click();
  return (
    <div
      className="relative aspect-[4/3] border rounded-md overflow-hidden cursor-pointer group"
      onClick={handleClick}
      title={src ? "Trocar foto" : "Adicionar foto"}
    >
      {src ? (
        <img
          src={src}
          alt={`Foto ${idx + 1}`}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-sm text-gray-500">
          {`Foto ${idx + 1}`}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => onPick(e.target.files?.[0])}
      />
    </div>
  );
}
