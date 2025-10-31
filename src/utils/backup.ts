// src/utils/backup.ts
import type {
  Apartamento,
  ChecklistComodo,
  Condominio,
  Especificacao,
  QuadroDistribuicao,
  TabelaComodos,
} from "../types";

/* =========================================================================
 * Tipos básicos do arquivo de backup
 * ========================================================================= */
export type AppData = {
  schemaVersion: number;
  condominios: Condominio[];
};

/* =========================================================================
 * Utilidades gerais (sem 'any')
 * ========================================================================= */
const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

type AnyRec = Record<string, unknown>;
const isRec = (v: unknown): v is AnyRec =>
  !!v && typeof v === "object" && !Array.isArray(v);
const asArray = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

const put = <T>(obj: AnyRec, key: string, val: T) => {
  (obj as { [k: string]: T })[key] = val;
};

/* =========================================================================
 * Leitura/validação do arquivo
 * ========================================================================= */
export async function readBackupFile(file: File): Promise<AppData> {
  const text = await file.text();
  const parsed: unknown = JSON.parse(text);
  // normaliza para garantir fotos string[9], arrays presentes, etc.
  normalizeRoot(parsed);
  return parsed as AppData;
}

export function isValidAppData(v: unknown): v is AppData {
  if (!isRec(v)) return false;
  return typeof v.schemaVersion === "number" && Array.isArray(v.condominios);
}

/* =========================================================================
 * Normalização do JSON (sem 'any')
 * - garante que blocos/casas existam como array
 * - garante que cada unidade tenha exatamente 9 fotos string
 * ========================================================================= */
function normalizeUnidade(u: unknown): void {
  if (!isRec(u)) return;

  const rawFotos = asArray(u["fotos"]);
  const fotos = rawFotos
    .map((x) => (typeof x === "string" ? x : ""))
    .slice(0, 9);

  while (fotos.length < 9) fotos.push("");
  put<string[]>(u, "fotos", fotos);
}

function normalizeRoot(data: unknown): void {
  if (!isRec(data)) return;

  const list = asArray(data["condominios"]);
  if (!Array.isArray(list)) return;

  for (const condRaw of list) {
    if (!isRec(condRaw)) continue;

    const tipo = condRaw["tipo"] === "CASAS" ? "CASAS" : "BLOCOS";
    put(condRaw, "tipo", tipo);

    const blocos = asArray(condRaw["blocos"]);
    put(condRaw, "blocos", blocos);

    const casas = asArray(condRaw["casas"]);
    put(condRaw, "casas", casas);

    for (const bRaw of blocos) {
      if (!isRec(bRaw)) continue;
      const aptos = asArray(bRaw["apartamentos"]);
      put(bRaw, "apartamentos", aptos);
      for (const a of aptos) normalizeUnidade(a);
    }
    for (const a of casas) normalizeUnidade(a);
  }
}

/* =========================================================================
 * Merge profundo das unidades (apartamentos/casas)
 * ========================================================================= */
const COMODO_COLS: (keyof ChecklistComodo)[] = [
  "Tugs e Tues",
  "Iluminação",
  "Acabamento",
  "Tensão e Corrente",
];

const orBool = (a?: boolean, b?: boolean) => Boolean(a) || Boolean(b);

function mergeChecklist(
  a: ChecklistComodo,
  b: ChecklistComodo
): ChecklistComodo {
  const out = {} as ChecklistComodo;
  for (const k of COMODO_COLS) {
    out[k] = orBool(a?.[k], b?.[k]);
  }
  return out;
}

function mergeComodos(a: TabelaComodos, b: TabelaComodos): TabelaComodos {
  const out: TabelaComodos = {} as TabelaComodos;
  const keys = new Set<keyof TabelaComodos>([
    ...(Object.keys(a) as (keyof TabelaComodos)[]),
    ...(Object.keys(b) as (keyof TabelaComodos)[]),
  ]);
  keys.forEach((k) => {
    out[k] = mergeChecklist(
      a?.[k] ?? ({} as ChecklistComodo),
      b?.[k] ?? ({} as ChecklistComodo)
    );
  });
  return out;
}

function mergeQuadro(
  a: QuadroDistribuicao,
  b: QuadroDistribuicao
): QuadroDistribuicao {
  return {
    Acabamento: orBool(a?.Acabamento, b?.Acabamento),
    Circuitos: orBool(a?.Circuitos, b?.Circuitos),
    Identificação: orBool(a?.Identificação, b?.Identificação),
    "Tensão e Corrente": orBool(
      a?.["Tensão e Corrente"],
      b?.["Tensão e Corrente"]
    ),
  };
}

function mergeEspecificacoes(
  a: Especificacao,
  b: Especificacao
): Especificacao {
  return {
    Campainha: orBool(a?.Campainha, b?.Campainha),
    Chuveiro: orBool(a?.Chuveiro, b?.Chuveiro),
  };
}

type ErroApto = NonNullable<Apartamento["erros"]>[number];
const erroKey = (e: ErroApto) =>
  `${e?.descricao ?? ""}|${e?.comodo ?? ""}|${e?.item ?? ""}`;

function mergeErros(a: ErroApto[] = [], b: ErroApto[] = []): ErroApto[] {
  const seen = new Set<string>();
  const out: ErroApto[] = [];
  for (const e of [...a, ...b]) {
    const k = erroKey(e);
    if (k && !seen.has(k)) {
      seen.add(k);
      out.push(e);
    }
  }
  return out;
}

function mergeFotos(a: string[] = [], b: string[] = []): string[] {
  const out = Array.from({ length: 9 }, (_, i) => a[i] ?? "");
  let bi = 0;
  for (let i = 0; i < out.length; i++) {
    if (!out[i]) {
      while (bi < b.length && !b[bi]) bi++;
      if (bi < b.length) {
        out[i] = b[bi]!;
        bi++;
      }
    }
  }
  return out.slice(0, 9);
}

function mergeUnidade(a: Apartamento, b: Apartamento): Apartamento {
  return {
    id: a.id,
    comodos: mergeComodos(a.comodos, b.comodos),
    quadro: mergeQuadro(a.quadro, b.quadro),
    especificacoes: mergeEspecificacoes(a.especificacoes, b.especificacoes),
    erros: mergeErros(a.erros, b.erros),
    fotos: mergeFotos(a.fotos, b.fotos),
  };
}

/* =========================================================================
 * Merge de blocos/apartamentos
 * ========================================================================= */
function mergeBlocos(dest: Condominio, src: Condominio) {
  dest.blocos ??= [];
  const byId = new Map(dest.blocos.map((b) => [norm(b.id), b]));

  for (const bInc of src.blocos ?? []) {
    const key = norm(bInc.id);
    const bCur = byId.get(key);
    if (!bCur) {
      dest.blocos.push(bInc);
      byId.set(key, bInc);
      continue;
    }
    // mesmo bloco: unir apartamentos
    bCur.apartamentos ??= [];
    const aptById = new Map(bCur.apartamentos.map((a) => [norm(a.id), a]));
    for (const aInc of bInc.apartamentos ?? []) {
      const aKey = norm(aInc.id);
      const aCur = aptById.get(aKey);
      if (!aCur) {
        bCur.apartamentos.push(aInc);
        aptById.set(aKey, aInc);
      } else {
        const merged = mergeUnidade(aCur, aInc);
        Object.assign(aCur, merged);
      }
    }
  }
}

/* =========================================================================
 * Merge de casas (sem 'any')
 * ========================================================================= */
function readCasas(c: Condominio): Apartamento[] {
  const rec = c as Record<string, unknown>;
  const raw = rec["casas"];
  return Array.isArray(raw) ? (raw as Apartamento[]) : [];
}

function ensureCasas(c: Condominio): Apartamento[] {
  const rec = c as Record<string, unknown>;
  const raw = rec["casas"];
  if (!Array.isArray(raw)) {
    const created: Apartamento[] = [];
    rec["casas"] = created;
    return created;
  }
  return raw as Apartamento[];
}

function mergeCasas(dest: Condominio, src: Condominio) {
  const casasDest = ensureCasas(dest);
  const byId = new Map(casasDest.map((a) => [norm(a.id), a]));

  const casasSrc = readCasas(src);
  for (const aInc of casasSrc) {
    const key = norm(aInc.id);
    const aCur = byId.get(key);
    if (!aCur) {
      casasDest.push(aInc);
      byId.set(key, aInc);
    } else {
      const merged = mergeUnidade(aCur, aInc);
      Object.assign(aCur, merged);
    }
  }
}

/* =========================================================================
 * Função principal usada pelo botão "Acrescentar"
 * ========================================================================= */
export async function mergeAppData(
  current: AppData,
  incoming: AppData
): Promise<AppData> {
  const out: AppData = structuredClone(current);

  for (const cInc of incoming.condominios) {
    const idx = out.condominios.findIndex(
      (c) => norm(c.nome) === norm(cInc.nome)
    );
    if (idx < 0) {
      out.condominios.push(cInc);
      continue;
    }

    // condomínio já existe: unir conteúdos
    const cCur = out.condominios[idx];
    mergeBlocos(cCur, cInc);
    mergeCasas(cCur, cInc);

    // Mantemos o tipo do destino (para não “mudar de natureza” por engano).
    // Se preferir priorizar o tipo do arquivo, é só descomentar:
    // cCur.tipo = cInc.tipo;
  }

  return out;
}
