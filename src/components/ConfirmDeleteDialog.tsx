import { useEffect, useState } from "react";
import Modal from "./Modal";

type Props = Readonly<{
  open: boolean;
  onClose: () => void;
  entityLabel: string;
  onConfirm: () => void;
}>;

export default function ConfirmDeleteDialog({
  open,
  onClose,
  entityLabel,
  onConfirm,
}: Props) {
  const [text, setText] = useState("");

  useEffect(() => {
    if (open) setText("");
  }, [open]);

  const enabled = text === "EXCLUIR";

  return (
    <Modal open={open} onClose={onClose} title="Confirmar exclusão">
      <div className="space-y-4">
        <p className="text-sm text-gray-700">
          Tem certeza que deseja excluir <b>{entityLabel}</b>? Esta ação não
          pode ser desfeita.
        </p>

        <label className="block text-sm text-gray-600">
          Digite <b>EXCLUIR</b> para confirmar:
          <input
            className="mt-1 w-full border rounded-lg p-2"
            placeholder="EXCLUIR"
            value={text}
            onChange={(e) => setText(e.target.value)}
            autoFocus
          />
        </label>

        <div className="flex justify-end gap-2">
          <button className="px-4 py-2 rounded-lg border" onClick={onClose}>
            Cancelar
          </button>
          <button
            className={`px-4 py-2 rounded-lg text-white ${
              enabled ? "bg-red-600" : "bg-red-300 cursor-not-allowed"
            }`}
            disabled={!enabled}
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            Excluir
          </button>
        </div>
      </div>
    </Modal>
  );
}
