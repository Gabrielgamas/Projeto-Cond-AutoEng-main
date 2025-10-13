import { useState } from "react";
import { generateCondominioPDF } from "../utils/pdf";
import type { Condominio } from "../types";

type Props = { condominio: Condominio; className?: string };

export default function GenerateLaudoButton({ condominio, className }: Props) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    try {
      if (!condominio?.blocos?.length) {
        alert(
          "Adicione pelo menos 1 bloco com 1 apartamento para gerar o laudo."
        );
        return;
      }
      const hasApto = condominio.blocos.some((b) => b.apartamentos?.length);
      if (!hasApto) {
        alert("Adicione pelo menos 1 apartamento para gerar o laudo.");
        return;
      }

      setLoading(true);
      await generateCondominioPDF(condominio);
    } catch (err) {
      // loga tudo com mais contexto
      // eslint-disable-next-line no-console
      console.error("Erro ao gerar PDF:", err);
      const msg =
        err instanceof Error
          ? err.message
          : typeof err === "string"
          ? err
          : JSON.stringify(err);
      alert("Falha ao gerar o PDF. Veja o console para detalhes.\n\n" + msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className={
        className ??
        "px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
      }
      aria-busy={loading}
    >
      {loading ? "Gerando..." : "Gerar laudo"}
    </button>
  );
}
