import { useEffect, useRef } from "react";
import type { PropsWithChildren } from "react";

type ModalProps = Readonly<{
  open: boolean;
  onClose: () => void;
  title?: string;
  widthClass?: string;
}>;

export default function Modal({
  open,
  onClose,
  title,
  widthClass = "max-w-md",
  children,
}: PropsWithChildren<ModalProps>) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;

    function onCancel(e: Event) {
      e.preventDefault();
      onClose();
    }

    if (open) {
      document.body.style.overflow = "hidden";
      if (!el.open) el.showModal();
      el.addEventListener("cancel", onCancel);
    } else {
      if (el.open) el.close();
      document.body.style.overflow = "";
      el.removeEventListener("cancel", onCancel);
    }

    return () => {
      document.body.style.overflow = "";
      el?.removeEventListener("cancel", onCancel);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <dialog
      ref={dialogRef}
      className="m-0 p-0 w-full h-full bg-transparent overflow-visible"
    >
      <button
        type="button"
        aria-label="Fechar modal"
        onClick={onClose}
        className="absolute inset-0 bg-black/40"
      />

      <div
        className={`relative bg-white w-[min(92vw,42rem)] ${widthClass} mx-auto mt-16 rounded-2xl shadow-xl`}
        role="document"
      >
        {title && (
          <div className="px-4 py-3 border-b">
            <h3 className="text-lg font-semibold">{title}</h3>
          </div>
        )}
        <div className="p-4">{children}</div>
      </div>
    </dialog>
  );
}
