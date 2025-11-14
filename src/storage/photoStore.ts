import { get, set, del } from "idb-keyval";

const PREFIX = "autoeng-photo:";
export type PhotoKey = `@img:${string}`;

export function isPhotoKey(v: string): v is PhotoKey {
  return v.startsWith("@img:");
}
export function makePhotoKey(): PhotoKey {
  return `@img:${crypto.randomUUID()}`;
}

export async function storePhoto(
  dataUrl: string,
  key?: PhotoKey
): Promise<PhotoKey> {
  const k = key ?? makePhotoKey();
  await set(PREFIX + k, dataUrl);
  return k;
}

export async function loadPhoto(src: string): Promise<string> {
  if (!isPhotoKey(src)) return src;
  const val = await get<string>(PREFIX + src);
  return val ?? "";
}

export async function removePhoto(key: PhotoKey): Promise<void> {
  await del(PREFIX + key);
}
