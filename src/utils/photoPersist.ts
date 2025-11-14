import { isPhotoKey, loadPhoto } from "../storage/photoStore";

type Unidade = { fotos?: string[] };
type Bloco = { apartamentos?: Unidade[] };
type Condominio = { casas?: Unidade[]; blocos?: Bloco[] };
type AppLike = { condominios?: Condominio[] };

const isDataUrl = (v: string) => /^data:image\//i.test(v);

export async function materializePhotosToKeys<T extends AppLike>(
  data: T
): Promise<T> {
  return structuredClone(data);
}

export async function keysToDataUrls<T extends AppLike>(data: T): Promise<T> {
  const copy: T = structuredClone(data);

  const toDataUrlsInPlace = async (fotos?: string[]) => {
    if (!Array.isArray(fotos)) return;
    for (let i = 0; i < fotos.length; i++) {
      const v = fotos[i] ?? "";
      if (!v) continue;

      if (!isDataUrl(v) && isPhotoKey(v)) {
        try {
          const dataUrl = await loadPhoto(v);
          fotos[i] = dataUrl || "";
        } catch {
          fotos[i] = "";
        }
      }
    }
  };

  const onUnidade = async (u?: Unidade) => {
    if (!u) return;
    await toDataUrlsInPlace(u.fotos);
  };

  for (const cond of copy.condominios ?? []) {
    for (const casa of cond.casas ?? []) await onUnidade(casa);
    for (const bloco of cond.blocos ?? []) {
      for (const ap of bloco.apartamentos ?? []) await onUnidade(ap);
    }
  }

  return copy;
}

export async function exportTudoComImagens<T extends AppLike>(
  data: T,
  filename = "autoeng-backup-com-imagens.json"
): Promise<void> {
  const copy = await keysToDataUrls(data);

  const blob = new Blob([JSON.stringify(copy, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
