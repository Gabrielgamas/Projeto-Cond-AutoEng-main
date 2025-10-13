// src/components/GenerateLaudoButton.tsx
import { generateCondominioPDF } from "../utils/pdf";
import type { Condominio } from "../types";

type Props = Readonly<{
  condominio: Condominio;
  className?: string;
}>;

export default function GenerateLaudoButton({ condominio, className }: Props) {
  async function handleClick() {
    try {
      await generateCondominioPDF(condominio); // ✅ apenas 1 argumento
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : "Erro inesperado ao gerar o laudo.";
      // use o tratamento que preferir (toast/alert/etc)
      alert(msg);
      // console opcional para depuração:
      // console.error(e);
    }
  }

  return (
    <button
      onClick={handleClick}
      className={`px-4 py-2 rounded-lg bg-blue-600 text-white ${
        className ?? ""
      }`}
      title="Gerar laudo do condomínio"
    >
      Gerar laudo
    </button>
  );
}
