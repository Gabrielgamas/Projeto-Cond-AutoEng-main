// src/utils/images.ts
// Utilitários para normalizar imagem, corrigir rotação EXIF e comprimir JPEG.

const DEFAULT_MAX_WIDTH = 1280; // ajuste se quiser mais qualidade (maior) ou mais leve (menor)
const DEFAULT_QUALITY = 0.82; // 0..1

export async function fileToDataUrl(file: File): Promise<string> {
  await assertIsImage(file);
  return new Promise<string>((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result as string);
    fr.onerror = reject;
    fr.readAsDataURL(file);
  });
}
type ImageBitmapOptionsWithFromImage = ImageBitmapOptions & {
  imageOrientation?: "from-image" | "none" | "flipY";
};

export async function normalizeImageFile(
  file: File,
  maxWidth = DEFAULT_MAX_WIDTH,
  quality = DEFAULT_QUALITY
): Promise<string> {
  // 1) tenta normalizar orientação via createImageBitmap (quando suportado)
  if ("createImageBitmap" in window) {
    try {
      const opts: ImageBitmapOptionsWithFromImage = {
        imageOrientation: "from-image",
      };
      const bitmap = await createImageBitmap(file, opts);
      const dataUrl = await bitmapToJpegDataUrl(bitmap, maxWidth, quality);
      bitmap.close?.();
      return dataUrl;
    } catch {
      // cai para o caminho via <img/> + drawImage
    }
  }

  // 2) fallback: carrega como <img/> e renderiza em canvas
  const dataUrl = await fileToDataUrl(file);
  const img = await loadHtmlImage(dataUrl);
  return imageToJpegDataUrl(img, maxWidth, quality);
}

// ---------- helpers internos ----------

async function assertIsImage(file: File) {
  if (!file || !file.type.startsWith("image/")) {
    throw new Error("Arquivo inválido: selecione uma imagem.");
  }
}

async function loadHtmlImage(src: string): Promise<HTMLImageElement> {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    // evitar CORS issues para dataURL (não é estritamente necessário, mas seguro)
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function computeTargetSize(width: number, height: number, maxWidth: number) {
  if (width <= maxWidth) return { w: width, h: height };
  const scale = maxWidth / width;
  return { w: Math.round(width * scale), h: Math.round(height * scale) };
}

async function bitmapToJpegDataUrl(
  bmp: ImageBitmap,
  maxWidth: number,
  quality: number
): Promise<string> {
  const { w, h } = computeTargetSize(bmp.width, bmp.height, maxWidth);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bmp, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", quality);
}

function imageToJpegDataUrl(
  img: HTMLImageElement,
  maxWidth: number,
  quality: number
): string {
  const { w, h } = computeTargetSize(
    img.naturalWidth || img.width,
    img.naturalHeight || img.height,
    maxWidth
  );
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", quality);
}

// Converte dataURL base64 -> Blob (usado no merge de importação)
export function dataUrlToBlob(dataUrl: string): Blob {
  const arr = dataUrl.split(",");
  const mimeMatch = arr[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : "image/jpeg";
  const bstr = atob(arr[1]);
  const n = bstr.length;
  const u8 = new Uint8Array(n);
  for (let i = 0; i < n; i++) u8[i] = bstr.charCodeAt(i);
  return new Blob([u8], { type: mime });
}
