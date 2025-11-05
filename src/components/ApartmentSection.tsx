import { useState } from "react";
import type { Apartamento } from "../types";
import TabelaComodos from "./TabelaComodos";
import TabelaQuadro from "./TabelaQuadro";
import TabelaEspecificacoes from "./TabelaEspecificacoes";
import ErrosSection from "./ErrosSection";
import Galeria9Fotos from "./Galeria9Fotos";

type Props = Readonly<{
  apto: Apartamento;
  onSave: (apto: Apartamento) => void;
  label?: string; // chama upsertApartamento
}>;

export default function ApartmentSection({
  apto,
  onSave,
  label = "Apartamento",
}: Props) {
  // abre por padrão
  const [open, setOpen] = useState<boolean>(true);

  function update<K extends keyof Apartamento>(key: K, value: Apartamento[K]) {
    // guarda sempre um novo objeto (imutável)
    onSave({ ...apto, [key]: value });
  }

  const fotosCount = Array.isArray(apto.fotos)
    ? apto.fotos.filter(Boolean).length
    : 0;

  return (
    <div className="rounded-xl border p-3 bg-white">
      {/* Cabeçalho / botão de expandir */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          className="flex items-center gap-2 font-medium"
          onClick={() => setOpen((o) => !o)}
        >
          <span
            className={`inline-block transition-transform ${
              open ? "rotate-90" : ""
            }`}
            aria-hidden
          >
            ▶
          </span>
          <span>
            {label} {apto.id}
          </span>
        </button>
        <span className="text-sm text-gray-500">Fotos: {fotosCount}/9</span>
      </div>

      {!open ? null : (
        <div className="mt-3 space-y-6">
          <section>
            <h4 className="font-semibold mb-2">Cômodos</h4>
            <TabelaComodos
              value={apto.comodos}
              onChange={(v) => update("comodos", v)}
            />
          </section>

          <section>
            <h4 className="font-semibold mb-2">Quadro de Distribuição</h4>
            <TabelaQuadro
              value={apto.quadro}
              onChange={(v) => update("quadro", v)}
            />
          </section>

          <section>
            <h4 className="font-semibold mb-2">Especificações</h4>
            <TabelaEspecificacoes
              value={apto.especificacoes}
              onChange={(v) => update("especificacoes", v)}
            />
          </section>

          <section>
            <h4 className="font-semibold mb-2">Erros</h4>
            <ErrosSection
              comodos={apto.comodos}
              value={apto.erros}
              onChange={(v) => update("erros", v)}
            />
          </section>

          <section>
            <h4 className="font-semibold mb-2">Fotos (9/9)</h4>
            <Galeria9Fotos
              value={apto.fotos} // array de 9 strings (chaves ou "")
              onChange={(fotos) =>
                onSave({
                  // salve apenas as CHAVES no estado
                  ...apto,
                  fotos,
                })
              }
            />
          </section>
        </div>
      )}
    </div>
  );
}
