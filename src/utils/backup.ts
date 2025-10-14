/* src/utils/backup.ts */
import { get, set } from "idb-keyval";
import type { Condominio, Bloco, Apartamento } from "../types";

/** Use a MESMA chave do seu AppState/IndexedDB */
export const STORAGE_KEY = "autoeng-data";

/** Estrutura mínima salva no storage */
type AppState = {
  schemaVersion: number;
  condominios: Condominio[];
};

/** Tipo mínimo para deduplicar erros */
type ErroItem = { descricao?: string; comodo?: string; item?: string };

/* ====================================================================== */
/*                                EXPORTAR                                 */
/* ====================================================================== */
export async function exportData(
  filenamePrefix = "autoeng_backup"
): Promise<void> {
  const state = (await get(STORAGE_KEY)) as AppState | undefined;
  const blob = new Blob([JSON.stringify(state ?? {}, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const today = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `${filenamePrefix}_${today}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ====================================================================== */
/*                       IMPORTAR (SUBSTITUI TUDO)                         */
/* ====================================================================== */
export async function importDataFromFile(file: File): Promise<void> {
  const txt = await file.text();
  const json = JSON.parse(txt);
  await set(STORAGE_KEY, json);
  location.reload();
}

/* ====================================================================== */
/*                    HELPERS (type guards e utilitários)                  */
/* ====================================================================== */
function byId<T extends { id: string }>(arr: T[] | undefined) {
  const m = new Map<string, T>();
  (arr ?? []).forEach((x) => m.set(x.id, x));
  return m;
}

function blobToDataUrl(b: Blob): Promise<string> {
  return new Promise((resolve) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result as string);
    fr.readAsDataURL(b);
  });
}

/** Garante fotos como dataURL (string[]) */
async function normalizeFotosToDataUrl(
  fotos: (string | Blob)[] | undefined
): Promise<string[]> {
  const out: string[] = [];
  for (const f of fotos ?? []) {
    if (typeof f === "string") out.push(f);
    else out.push(await blobToDataUrl(f));
  }
  return out;
}

/** Mescla fotos mantendo string[] e limite 9 */
function mergeFotosString(
  atuais: string[],
  novas: string[],
  max = 9
): string[] {
  const out = [...atuais];
  for (const f of novas) {
    if (out.length >= max) break;
    out.push(f);
  }
  return out.slice(0, max);
}

/** Dedup por descricao+comodo+item */
function dedupErros(list: ErroItem[] | undefined): ErroItem[] {
  const seen = new Set<string>();
  const out: ErroItem[] = [];
  for (const e of list ?? []) {
    const key = `${e?.descricao ?? ""}|${e?.comodo ?? ""}|${e?.item ?? ""}`;
    if (!seen.has(key)) {
      seen.add(key);
      out.push(e);
    }
  }
  return out;
}

/* ---------- type guards/normalizadores para campos opcionais ---------- */

/** Retorna 'BLOCOS'/'CASAS' se existir no objeto */
function getTipo(obj: unknown): "BLOCOS" | "CASAS" | undefined {
  if (obj && typeof obj === "object" && "tipo" in obj) {
    const t = (obj as { tipo?: unknown }).tipo;
    return t === "BLOCOS" || t === "CASAS" ? t : undefined;
  }
  return undefined;
}

/** Retorna a lista de casas se existir e for array */
function getCasas(obj: unknown): Apartamento[] | undefined {
  if (obj && typeof obj === "object" && "casas" in obj) {
    const v = (obj as { casas?: unknown }).casas;
    return Array.isArray(v) ? (v as Apartamento[]) : undefined;
  }
  return undefined;
}

/** Retorna um endereço (objeto) se existir */
function getEndereco(obj: unknown): Record<string, unknown> | undefined {
  if (obj && typeof obj === "object" && "endereco" in obj) {
    const v = (obj as { endereco?: unknown }).endereco;
    return v && typeof v === "object"
      ? (v as Record<string, unknown>)
      : undefined;
  }
  return undefined;
}

/** Lê fotos como união (string|Blob) se existir esse campo */
function getFotosUnion(obj: unknown): (string | Blob)[] | undefined {
  if (obj && typeof obj === "object" && "fotos" in obj) {
    const v = (obj as { fotos?: unknown }).fotos;
    return Array.isArray(v) ? (v as (string | Blob)[]) : undefined;
  }
  return undefined;
}

/* ====================================================================== */
/*                                MERGES                                   */
/* ====================================================================== */
/** Mescla unidade (apto/casa) mantendo fotos como string[] e SEM `any` */
async function mergeUnidade(
  atual: Apartamento,
  inc: Apartamento
): Promise<Apartamento> {
  // fotos: aceita string|Blob em ambos os lados e normaliza para string
  const fotosA = await normalizeFotosToDataUrl(
    getFotosUnion(atual) ?? atual.fotos
  );
  const fotosB = await normalizeFotosToDataUrl(getFotosUnion(inc) ?? inc.fotos);

  const errosA = (atual.erros ?? []) as unknown as ErroItem[];
  const errosB = (inc.erros ?? []) as unknown as ErroItem[];
  const errosMerged = dedupErros([
    ...errosA,
    ...errosB,
  ]) as unknown as Apartamento["erros"];

  return {
    ...atual,
    comodos: { ...(atual.comodos ?? {}), ...(inc.comodos ?? {}) },
    quadro: { ...(atual.quadro ?? {}), ...(inc.quadro ?? {}) },
    especificacoes: {
      ...(atual.especificacoes ?? {}),
      ...(inc.especificacoes ?? {}),
    },
    erros: errosMerged,
    fotos: mergeFotosString(fotosA, fotosB, 9), // sempre string[]
  };
}

/** Mescla bloco */
async function mergeBloco(atual: Bloco, inc: Bloco): Promise<Bloco> {
  const mapA = byId(atual.apartamentos);
  const mapB = byId(inc.apartamentos);
  const ids = new Set<string>([...mapA.keys(), ...mapB.keys()]);
  const apartamentos: Apartamento[] = [];
  for (const id of ids) {
    const A = mapA.get(id);
    const B = mapB.get(id);
    if (A && B) apartamentos.push(await mergeUnidade(A, B));
    else apartamentos.push((A ?? B)!);
  }
  return { ...atual, apartamentos };
}

/** Mescla casas (modo CASAS) */
async function mergeCasas(
  atuais: Apartamento[] | undefined,
  novas: Apartamento[] | undefined
) {
  const mapA = byId(atuais);
  const mapB = byId(novas);
  const ids = new Set<string>([...mapA.keys(), ...mapB.keys()]);
  const casas: Apartamento[] = [];
  for (const id of ids) {
    const A = mapA.get(id);
    const B = mapB.get(id);
    if (A && B) casas.push(await mergeUnidade(A, B));
    else casas.push((A ?? B)!);
  }
  return casas;
}

/** Mescla condomínio (sem `any`) */
async function mergeCondominio(
  atual: Condominio,
  inc: Condominio
): Promise<Condominio> {
  // tipo: preserva o existente; senão, usa o do import; senão, "BLOCOS"
  const tipo = getTipo(atual) ?? getTipo(inc) ?? "BLOCOS";

  // blocos (modo BLOCOS)
  const mapA = byId(atual.blocos);
  const mapB = byId(inc.blocos);
  const blocosIds = new Set<string>([...mapA.keys(), ...mapB.keys()]);
  const blocos: Bloco[] = [];
  for (const id of blocosIds) {
    const A = mapA.get(id);
    const B = mapB.get(id);
    if (A && B) blocos.push(await mergeBloco(A, B));
    else blocos.push((A ?? B)!);
  }

  // casas (modo CASAS)
  const casas = await mergeCasas(getCasas(atual), getCasas(inc));

  // endereço (opcional): só adiciona se existir em um dos lados
  const enderecoMerged = {
    ...(getEndereco(atual) ?? {}),
    ...(getEndereco(inc) ?? {}),
  };
  const enderecoPart =
    Object.keys(enderecoMerged).length > 0 ? { endereco: enderecoMerged } : {};

  // monta o retorno com campos extras opcionais
  return {
    ...atual,
    nome: atual.nome || inc.nome,
    ...enderecoPart,
    // Estes 2 campos podem não existir no tipo local; mantenho mesmo assim:

    tipo,

    casas,
    blocos,
  };
}

/* ====================================================================== */
/*                 IMPORTAR (ACRESCENTAR / MESCLAR)                        */
/* ====================================================================== */
export async function importDataMerge(file: File): Promise<void> {
  const txt = await file.text();
  const incoming: AppState = JSON.parse(txt);

  const current: AppState = ((await get(STORAGE_KEY)) as
    | AppState
    | undefined) ?? {
    schemaVersion: incoming?.schemaVersion ?? 2,
    condominios: [],
  };

  const mapA = byId(current.condominios);
  const mapB = byId(incoming?.condominios);

  const ids = new Set<string>([...mapA.keys(), ...mapB.keys()]);
  const merged: Condominio[] = [];

  for (const id of ids) {
    const A = mapA.get(id);
    const B = mapB.get(id);
    if (A && B) merged.push(await mergeCondominio(A, B));
    else merged.push((A ?? B)!);
  }

  const out: AppState = {
    schemaVersion: Math.max(
      current.schemaVersion ?? 2,
      incoming?.schemaVersion ?? 2
    ),
    condominios: merged,
  };

  await set(STORAGE_KEY, out);
  location.reload();
}
