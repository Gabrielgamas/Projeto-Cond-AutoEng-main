/* eslint-disable @typescript-eslint/naming-convention */
import jsPDF from "jspdf";
import autoTable, { type CellHookData, type CellInput } from "jspdf-autotable";
import { isPhotoKey, loadPhoto } from "../storage/photoStore";

import type {
  Condominio,
  Apartamento,
  ChecklistComodo,
  TabelaComodos,
  QuadroDistribuicao,
  Especificacao,
} from "../types";

/** -------- Declaration merging: propriedade que o plugin anexa -------- */
declare module "jspdf" {
  interface jsPDF {
    lastAutoTable?: { finalY: number };
  }
}
/* eslint-enable @typescript-eslint/naming-convention */

/** ----------------- Constantes de layout (A4 paisagem) ----------------- */
const PW = 297; // width (mm)
const PH = 210; // height (mm)
const MARGIN = 12;
const SITUACAO_COL_W = 28;

type RGB = [number, number, number];
const NAVY: RGB = [20, 35, 60]; // #14233C
const ORANGE: RGB = [245, 161, 25]; // #F5A119
const GRAY: RGB = [90, 90, 90];

const getLastY = (doc: jsPDF) => doc.lastAutoTable?.finalY ?? 0;
const fmtDate = (d: Date) =>
  d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

/** ----------------- Logo: carregamento robusto (JPEG/PNG) ----------------- */
async function loadPublicLogo(): Promise<string | undefined> {
  try {
    const response = await fetch("/logo.png");
    const blob = await response.blob();
    const reader = new FileReader();

    return await new Promise((resolve, reject) => {
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.warn("Falha ao carregar logo:", e);
    return undefined;
  }
}

/** ----------------- Helpers visuais ----------------- */

async function resolveFotosToDataUrls(fotos: string[]): Promise<string[]> {
  return Promise.all(
    (fotos ?? [])
      .slice(0, 9)
      .map(async (f) => (isPhotoKey(f) ? await loadPhoto(f) : f || ""))
  );
}

function topBar(doc: jsPDF) {
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, PW, 6, "F");
}

function footerLogo(doc: jsPDF, logoDataUrl?: string) {
  if (!logoDataUrl) return;
  const w = 48;
  const h = w * 0.75;

  const isPng = logoDataUrl.startsWith("data:image/png");
  const fmt: "PNG" | "JPEG" = isPng ? "PNG" : "JPEG";

  try {
    doc.addImage(logoDataUrl, fmt, PW - MARGIN - w, PH - MARGIN - h, w, h);
  } catch {
    try {
      const alt: "PNG" | "JPEG" = fmt === "PNG" ? "JPEG" : "PNG";
      doc.addImage(logoDataUrl, alt, PW - MARGIN - w, PH - MARGIN - h, w, h);
    } catch {
      console.warn("Logo não pôde ser inserido; continuando sem logo.");
    }
  }
}

/** Tarja curta à esquerda + título (sem sobrepor texto) */
function sectionTitle(doc: jsPDF, title: string, y: number) {
  const barW = 26;
  const gap = 12;
  doc.setFillColor(...NAVY);
  doc.rect(MARGIN, y - 6, barW, 6, "F");
  doc.setTextColor(...NAVY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text(title, MARGIN + barW + gap, y);
  doc.setTextColor(0, 0, 0);
}

/** ----------------- Páginas institucionais ----------------- */
function addCoverPage(doc: jsPDF, cond: Condominio, logo?: string) {
  topBar(doc);

  const x = MARGIN + 20;
  const y1 = 55;

  doc.setFont("helvetica", "bold");
  doc.setTextColor(...NAVY);
  doc.setFontSize(34);
  doc.text("Laudo Técnico de Avaliação das", x, y1);
  doc.text("Instalações Elétricas", x, y1 + 20);

  doc.setTextColor(...ORANGE);
  doc.setFontSize(36);
  doc.text(`Condomínio ${cond.nome}`, x, y1 + 45);

  // traço pequeno
  doc.setFillColor(...NAVY);
  doc.rect(x, y1 + 55, 25, 6, "F");

  // assinatura + data
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  const today = new Date();
  doc.text("Autoeng", MARGIN, PH - 28);
  doc.setTextColor(...GRAY);
  doc.text(fmtDate(today), MARGIN, PH - 18);

  footerLogo(doc, logo);
}

function addIndexPage(doc: jsPDF, cond: Condominio, logo?: string) {
  doc.addPage("a4", "landscape");
  topBar(doc);
  sectionTitle(doc, "Índice", 50);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(14);

  const selecionadas =
    cond.tipo === "CASAS" ? "Casas Selecionadas" : "Apartamentos Selecionados";

  const itens = [
    "1. Objetivo",
    "2. Normas Aplicáveis",
    "3. Metodologia",
    `4. ${selecionadas}`,
    "5. Locais Auditados e Situações Encontradas",
    "6. Considerações",
    "7. Conclusão",
  ];
  let y = 85;
  itens.forEach((t) => {
    doc.text(t, MARGIN + 8, y);
    y += 12;
  });

  footerLogo(doc, logo);
}

function addObjetivoPage(doc: jsPDF, cond: Condominio, logo?: string) {
  doc.addPage("a4", "landscape");
  topBar(doc);
  sectionTitle(doc, "Objetivo", 60);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  const texto =
    `Elaboração do laudo técnico de avaliação das instalações elétricas prediais do ` +
    `Condomínio ${cond.nome}, apresentando a situação atual das unidades. Foram realizadas ` +
    `medições de grandezas elétricas (tensão e corrente), verificação dos pontos de iluminação ` +
    `e tomadas, checklist por cômodo e inspeção do quadro de distribuição. As avaliações ` +
    `seguiram as normas técnicas aplicáveis.`;

  const wrap = doc.splitTextToSize(texto, PW - 2 * MARGIN - 16);
  doc.text(wrap, MARGIN + 8, 90);

  footerLogo(doc, logo);
}

function addNormasPage(doc: jsPDF, logo?: string) {
  doc.addPage("a4", "landscape");
  topBar(doc);
  sectionTitle(doc, "Normas Aplicáveis", 60);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  const texto =
    "Norma Técnica Brasileira NBR 5410 (Instalações elétricas em baixa tensão) " +
    "e NR-10 (Segurança em instalações e serviços em eletricidade).";

  const wrap = doc.splitTextToSize(texto, PW - 2 * MARGIN - 16);
  doc.text(wrap, MARGIN + 8, 90);

  footerLogo(doc, logo);
}

function addMetodologiaPage(doc: jsPDF, logo?: string) {
  doc.addPage("a4", "landscape");
  topBar(doc);
  sectionTitle(doc, "Metodologia", 60);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  const texto =
    "O procedimento utilizado baseou-se no registro fotográfico das unidades, " +
    "checagem funcional de pontos de iluminação e tomadas, medições de tensão e corrente, " +
    "inspeção do quadro de distribuição e preenchimento de checklist por cômodo. " +
    "As não conformidades foram registradas e qualificadas.";

  const wrap = doc.splitTextToSize(texto, PW - 2 * MARGIN - 16);
  doc.text(wrap, MARGIN + 8, 90);

  footerLogo(doc, logo);
}

/** -------- “Unidades Selecionadas” (blocos/apartamentos ou casas) -------- */
function addUnidadesSelecionadasPage(
  doc: jsPDF,
  cond: Condominio,
  logo?: string
) {
  // Versão robusta que distribui os blocos/emparelha em colunas com paginação correta.
  const TITLE_Y = 60;
  const HEADER_Y = 90;
  const usableW = PW - 2 * MARGIN - 16;
  const cols = 3; // numero de colunas por página
  const colGap = 8;
  const colW = (usableW - colGap * (cols - 1)) / cols;
  const lineH = 9;
  const topBarHeight = 6;

  // Gera as linhas: "Bloco 145: 01 02 03 04"
  const blocos = (cond.blocos ?? [])
    .slice()
    .sort((a, b) => a.id.localeCompare(b.id, "pt-BR", { numeric: true }));
  const entries: string[] = blocos.map((b) => {
    const aptos = (b.apartamentos ?? [])
      .slice()
      .sort((x, y) => x.id.localeCompare(y.id, "pt-BR", { numeric: true }))
      .map((x) => x.id);
    return `Bloco ${b.id}: ${aptos.join("   ")}`;
  });

  // header + footer helper
  function renderHeader(isContinuation = false) {
    doc.addPage("a4", "landscape");
    topBar(doc);
    const title =
      cond.tipo === "CASAS"
        ? "Casas Selecionadas"
        : "Apartamentos Selecionados";
    sectionTitle(
      doc,
      isContinuation ? `${title} (continuação)` : title,
      TITLE_Y
    );
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(
      cond.tipo === "CASAS" ? "Casas:" : "Blocos / Apartamentos:",
      MARGIN + 8,
      HEADER_Y
    );
    footerLogo(doc, logo);
  }

  // Se for casas, simplificamos: mostramos ids em colunas também
  if (cond.tipo === "CASAS") {
    const casas = (cond.casas ?? [])
      .slice()
      .sort((a, b) => a.id.localeCompare(b.id, "pt-BR", { numeric: true }));
    const ids = casas.map((c) => String(c.id));
    // quantas linhas cabem por coluna (altura disponível: do HEADER_Y até PH - margem inferior)
    const startY = HEADER_Y + 10;
    const availH = PH - MARGIN - startY;
    const linesPerCol = Math.max(1, Math.floor(availH / lineH));
    const perCol = Math.ceil(ids.length / cols);

    renderHeader(false);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);

    let colIndex = 0;
    let y = startY;

    for (let i = 0; i < ids.length; i++) {
      const colX = MARGIN + 8 + colIndex * (colW + colGap);
      doc.text(ids[i], colX, y);
      y += lineH;

      // se a coluna encheu
      if ((i + 1) % perCol === 0) {
        colIndex++;
        y = startY;
      }

      // se ultrapassar a última coluna -> nova página
      if (colIndex >= cols && i < ids.length - 1) {
        renderHeader(true);
        colIndex = 0;
        y = startY;
      }
    }
    return;
  }

  // Para blocos/apartamentos: distribuímos entries pelas colunas e páginas
  // Calcula quantas linhas cabem por coluna por página:
  const startY = HEADER_Y + 10;
  const availH = PH - MARGIN - startY;
  const linesPerColumn = Math.max(1, Math.floor(availH / lineH));

  // Quantas entradas por página (cols * linesPerColumn)
  const perPage = cols * linesPerColumn;
  let pageIndex = 0;
  let globalIndex = 0;

  // Enquanto houver entradas, renderiza página
  while (globalIndex < entries.length) {
    const isCont = pageIndex > 0;
    renderHeader(isCont);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);

    // slice de entradas desta página
    const slice = entries.slice(globalIndex, globalIndex + perPage);
    // distribuímos verticalmente: cada coluna terá até linesPerColumn lines
    for (let c = 0; c < cols; c++) {
      const colX = MARGIN + 8 + c * (colW + colGap);
      let y = startY;
      for (let r = 0; r < linesPerColumn; r++) {
        const idx = c * linesPerColumn + r;
        if (idx >= slice.length) break;
        const text = slice[idx];
        // wrap horizontalmente se for muito longo
        const wrapped = doc.splitTextToSize(text, colW - 4);
        // se wrapped tiver mais de 1 linha, desenha e avança y de acordo
        doc.text(wrapped, colX, y);
        y += wrapped.length * (lineH / 1.1); // ajuste vertical para múltiplas linhas
      }
    }

    // avança globalIndex e página
    globalIndex += perPage;
    pageIndex++;
  }
}

function addConsideracoesPage(doc: jsPDF, logo?: string) {
  doc.addPage("a4", "landscape");
  topBar(doc);
  sectionTitle(doc, "Considerações", 60);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  const texto =
    "As instalações elétricas existentes não apresentaram inconformidades que justificassem " +
    "a substituição total da instalação, entretanto foram levantados pontos a serem corrigidos " +
    "e a serem observados com maior atenção nas próximas instalações, conforme descritivo de " +
    "cada caso analisado.";
  const wrap = doc.splitTextToSize(texto, PW - 2 * MARGIN - 16);
  doc.text(wrap, MARGIN + 8, 90);

  footerLogo(doc, logo);
}

function addConclusaoPage(doc: jsPDF, logo?: string) {
  doc.addPage("a4", "landscape");
  topBar(doc);
  sectionTitle(doc, "Conclusão", 60);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  const texto =
    "O presente laudo técnico apresentou a análise das instalações elétricas das unidades " +
    "supracitadas, indicando as inconformidades através da descrição do problema e da " +
    "apresentação das imagens realizadas durante os testes. A partir dos resultados " +
    "encontrados, sugerimos que seja criado um procedimento de checklist de todo o " +
    "sistema elétrico, a fim de diminuir as inconformidades e, desta forma, evitar o " +
    "desgaste com os clientes, além de reduzir os custos com retrabalhos.";
  const wrap = doc.splitTextToSize(texto, PW - 2 * MARGIN - 16);
  doc.text(wrap, MARGIN + 8, 90);

  footerLogo(doc, logo);
}

/** ----------------- Tabelas com ✓ / ✗ ----------------- */
const tableBase = {
  styles: { fontSize: 9, cellPadding: 2, lineColor: 120, lineWidth: 0.25 },
  headStyles: {
    fillColor: NAVY as RGB,
    textColor: 255,
    halign: "center" as const,
  },
  theme: "grid" as const,
};

function drawTick(doc: jsPDF, x: number, y: number, w: number, h: number) {
  const cx = x + w / 2;
  const cy = y + h / 2 + 0.2;
  const s = Math.min(w, h) * 0.32;
  const lw = Math.max(0.35, s * 0.06);

  doc.setDrawColor(0, 128, 0);
  doc.setLineWidth(lw);
  doc.line(cx - s * 0.6, cy + s * 0.1, cx - s * 0.18, cy + s * 0.6);
  doc.line(cx - s * 0.18, cy + s * 0.6, cx + s * 0.75, cy - s * 0.45);
}

function drawCross(doc: jsPDF, x: number, y: number, w: number, h: number) {
  const cx = x + w / 2;
  const cy = y + h / 2 + 0.2;
  const s = Math.min(w, h) * 0.2;
  const lw = Math.max(0.35, s * 0.06);

  doc.setDrawColor(200, 0, 0);
  doc.setLineWidth(lw);
  doc.line(cx - s, cy - s, cx + s, cy + s);
  doc.line(cx + s, cy - s, cx - s, cy + s);
}

function tableComodos(
  doc: jsPDF,
  comodos: TabelaComodos,
  _startY: number,
  width: number
) {
  const COLS: (keyof ChecklistComodo)[] = [
    "Tugs e Tues",
    "Iluminação",
    "Acabamento",
    "Tensão e Corrente",
  ];

  // ✅ sem "any"
  const body: CellInput[][] = (
    Object.entries(comodos) as [keyof TabelaComodos, ChecklistComodo][]
  ).map(([room, checklist]) => [room, ...COLS.map((c) => !!checklist[c])]);

  const yTitle = 10;
  const yAfterTitle = yTitle + 8;

  autoTable(doc, {
    ...tableBase,
    startY: yAfterTitle,
    head: [["Cômodo", ...COLS]],
    body,
    margin: { left: MARGIN, right: PW - (MARGIN + width) },
    tableWidth: width,
    didParseCell: (data: CellHookData) => {
      if (data.section === "body" && data.column.index > 0) {
        data.cell.text = [];
      }
    },
    didDrawCell: (data: CellHookData) => {
      const { cell, column, row } = data;
      if (row.section === "body" && column.index > 0) {
        const raw = cell.raw as boolean;
        if (raw) drawTick(doc, cell.x, cell.y, cell.width, cell.height);
        else drawCross(doc, cell.x, cell.y, cell.width, cell.height);
        cell.text = [];
      }
    },
  });

  return getLastY(doc);
}

function tableQuadro(
  doc: jsPDF,
  q: QuadroDistribuicao,
  startY: number,
  width: number
) {
  const linhas: [string, boolean][] = [
    ["Acabamento", !!q["Acabamento"]],
    ["Circuitos", !!q["Circuitos"]],
    ["Identificação", !!q["Identificação"]],
    ["Tensão e Corrente", !!q["Tensão e Corrente"]],
  ];
  const body: CellInput[][] = linhas.map(([label, ok]) => [label, ok]);

  autoTable(doc, {
    ...tableBase,
    startY,
    head: [["Quadro de Distribuição", "Situação"]],
    body,
    margin: { left: MARGIN, right: PW - (MARGIN + width) },
    tableWidth: width,

    // ➜ mesma largura sempre para a coluna “Situação”
    columnStyles: {
      0: { cellWidth: width - SITUACAO_COL_W },
      1: { cellWidth: SITUACAO_COL_W, halign: "center" as const },
    },

    didParseCell: (data: CellHookData) => {
      if (data.section === "body" && data.column.index > 0) data.cell.text = [];
    },
    didDrawCell: (data: CellHookData) => {
      const { cell, column, row } = data;
      if (row.section === "body" && column.index === 1) {
        const raw = cell.raw as boolean;
        if (raw) drawTick(doc, cell.x, cell.y, cell.width, cell.height);
        else drawCross(doc, cell.x, cell.y, cell.width, cell.height);
        cell.text = [];
      }
    },
  });

  return getLastY(doc);
}

function tableEspecificacoes(
  doc: jsPDF,
  e: Especificacao,
  startY: number,
  width: number
) {
  const linhas: [string, boolean][] = [
    ["Campainha", !!e["Campainha"]],
    ["Chuveiro", !!e["Chuveiro"]],
  ];
  const body: CellInput[][] = linhas.map(([label, ok]) => [label, ok]);

  autoTable(doc, {
    ...tableBase,
    startY,
    head: [["Especificações", "Situação"]],
    body,
    margin: { left: MARGIN, right: PW - (MARGIN + width) },
    tableWidth: width,

    // ➜ usa o MESMO valor da função acima
    columnStyles: {
      0: { cellWidth: width - SITUACAO_COL_W },
      1: { cellWidth: SITUACAO_COL_W, halign: "center" as const },
    },

    didParseCell: (data: CellHookData) => {
      if (data.section === "body" && data.column.index > 0) data.cell.text = [];
    },
    didDrawCell: (data: CellHookData) => {
      const { cell, column, row } = data;
      if (row.section === "body" && column.index === 1) {
        const raw = cell.raw as boolean;
        if (raw) drawTick(doc, cell.x, cell.y, cell.width, cell.height);
        else drawCross(doc, cell.x, cell.y, cell.width, cell.height);
        cell.text = [];
      }
    },
  });

  return getLastY(doc);
}

/** ----------------- Fotos 3×3 (direita) ----------------- */
function photosGridRight(
  doc: jsPDF,
  fotos: string[],
  areaX: number,
  areaY: number,
  areaW: number
) {
  // Tarja
  doc.setFillColor(...NAVY);
  doc.rect(areaX, areaY, areaW, 8, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Fotos", areaX + 4, areaY + 5.8);
  doc.setTextColor(0, 0, 0);

  const cols = 3;
  const gap = 2.2;
  const top = areaY + 20;
  const cellW = (areaW - gap * (cols - 1)) / cols;
  const cellH = cellW * 0.75;

  const nine =
    Array.isArray(fotos) && fotos.length === 9 ? fotos : Array(9).fill("");

  let x = areaX;
  let y = top;

  for (let i = 0; i < nine.length; i++) {
    const src = nine[i];

    doc.setDrawColor(180);
    doc.rect(x, y, cellW, cellH);

    if (src && src.startsWith("data:image/")) {
      const isPng = src.startsWith("data:image/png");
      const fmt: "PNG" | "JPEG" = isPng ? "PNG" : "JPEG";
      try {
        doc.addImage(src, fmt, x + 1, y + 1, cellW - 2, cellH - 2);
      } catch {
        try {
          const alt: "PNG" | "JPEG" = fmt === "PNG" ? "JPEG" : "PNG";
          doc.addImage(src, alt, x + 1, y + 1, cellW - 2, cellH - 2);
        } catch {
          console.warn("Foto inválida/inesperada; pulando este slot.");
        }
      }
    } else if (!src) {
      doc.setFontSize(8);
      doc.text("Vazio", x + cellW / 2, y + cellH / 2, {
        align: "center",
        baseline: "middle",
      });
    }

    const isLastCol = (i + 1) % cols === 0;
    if (isLastCol) {
      x = areaX;
      y += cellH + gap;
    } else {
      x += cellW + gap;
    }
  }
}

/** ----------------- Observações (duas colunas, com checkbox centralizado) ----------------- */
function observacoesBox2Cols(
  doc: jsPDF,
  apto: Apartamento,
  startY: number
): number {
  // ====== ajustes rápidos ======
  const TITLE_H = 8; // altura da tarja azul "Observações"
  const COL_GAP = 0; // gap entre colunas
  const LINE_H = 10; // altura por item
  const BOX_SIZE = 4; // tamanho do "checkbox"
  const BOX_LEFT_PAD = 6; // distância da borda até o checkbox
  const TEXT_GAP = 3; // espaço entre checkbox e texto
  const FONT_SIZE = 10; // mesmo tamanho usado no texto
  const BASELINE_ADJ = 1.5; // ajuste fino p/ centralizar (3.0–4.0 com fs=10)
  // =============================

  const totalW = PW - 2 * MARGIN;
  const colW = (totalW - COL_GAP) / 2;

  // título
  doc.setFillColor(...NAVY);
  doc.rect(MARGIN, startY, totalW, TITLE_H, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Observações", MARGIN + 4, startY + 5.8);
  doc.setTextColor(0, 0, 0);

  const yTop = startY + TITLE_H;

  // área disponível nesta página
  const availH = PH - MARGIN - yTop;
  const contentH = Math.max(20, availH);

  // molduras
  doc.setDrawColor(0);
  doc.rect(MARGIN, yTop, colW, contentH);
  doc.rect(MARGIN + colW + COL_GAP, yTop, colW, contentH);

  // capacidade desta página
  const linesPerCol = Math.max(1, Math.floor((contentH - 6) / LINE_H));
  const erros = apto.erros ?? [];
  const capThisPage = linesPerCol * 2;

  const pageItems = erros.slice(0, capThisPage);
  const restItems = erros.slice(capThisPage);

  // desenha itens de uma coluna (sem numeração; com checkbox)
  const drawItems = (items: typeof erros, x: number) => {
    let y = yTop + 7;
    for (let i = 0; i < items.length; i++) {
      const e = items[i];
      if (!e) continue;

      const txt = [
        e.descricao || "",
        e.comodo ? ` — ${e.comodo}` : "",
        e.item ? ` (${e.item})` : "",
      ].join("");

      // checkbox centralizado na vertical em relação à linha do texto
      const boxTop = y - BASELINE_ADJ - BOX_SIZE / 2;
      doc.setDrawColor(90);
      doc.rect(x + BOX_LEFT_PAD, boxTop, BOX_SIZE, BOX_SIZE);

      // texto
      doc.setFont("helvetica", "normal");
      doc.setFontSize(FONT_SIZE);
      const textX = x + BOX_LEFT_PAD + BOX_SIZE + TEXT_GAP;
      const wrapped = doc.splitTextToSize(txt, colW - (textX - x) - 4);
      doc.text(wrapped, textX, y);

      // linha guia (opcional)
      doc.setDrawColor(200);
      doc.line(x, y + 2.8, x + colW, y + 2.8);

      y += LINE_H;
      if (y > yTop + contentH - 4) break;
    }
  };

  // esquerda
  drawItems(
    pageItems.slice(0, Math.min(linesPerCol, pageItems.length)),
    MARGIN
  );
  // direita
  const rightSlice = pageItems.slice(linesPerCol);
  drawItems(rightSlice, MARGIN + colW + COL_GAP);

  // paginação se sobrar itens
  if (restItems.length > 0) {
    doc.addPage("a4", "landscape");
    doc.setFillColor(...NAVY);
    doc.rect(0, 0, PW, 6, "F");
    return observacoesBox2Cols(doc, { ...apto, erros: restItems }, 20);
  }

  return yTop + contentH;
}

/** ----------------- Página por unidade (apto/casa) ----------------- */
function unitChecklistPage(
  doc: jsPDF,
  _cond: Condominio,
  unidade: Apartamento,
  logo: string | undefined,
  label: "Apartamento" | "Casa",
  blocoId?: string
) {
  doc.addPage("a4", "landscape");

  // logo topo direita
  if (logo) {
    const w = 15;
    const h = w;
    const isPng = logo.startsWith("data:image/png");
    const fmt: "PNG" | "JPEG" = isPng ? "PNG" : "JPEG";
    try {
      doc.addImage(logo, fmt, PW - MARGIN - w, 2, w, h);
    } catch {
      try {
        const alt: "PNG" | "JPEG" = fmt === "PNG" ? "JPEG" : "PNG";
        doc.addImage(logo, alt, PW - MARGIN - w, 2, w, h);
      } catch {
        // ignora
      }
    }
  }

  // Título centralizado com partes coloridas
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);

  const textoBase = `Checklist da Instalação Elétrica do ${label} `;
  const idFmt = unidade.id.padStart(2, "0");
  const textoBloco = blocoId ? " Bloco " : "";
  const textoFinal = blocoId ?? "";

  const wBase = doc.getTextWidth(textoBase);
  const wId = doc.getTextWidth(idFmt);
  const wBloco = doc.getTextWidth(textoBloco);
  const wBlocoId = doc.getTextWidth(textoFinal);

  const totalWidth = wBase + wId + wBloco + wBlocoId;
  const startX = (PW - totalWidth) / 2;
  const z = 10;

  let cursor = startX;

  doc.setTextColor(...NAVY);
  doc.text(textoBase, cursor, z);
  cursor += wBase;

  doc.setTextColor(...ORANGE);
  doc.text(idFmt, cursor, z);
  cursor += wId;

  if (blocoId) {
    doc.setTextColor(...NAVY);
    doc.text(textoBloco, cursor, z);
    cursor += wBloco;

    doc.setTextColor(...ORANGE);
    doc.text(textoFinal, cursor, z);
  }

  doc.setTextColor(0, 0, 0);

  // layout 2 colunas
  const usableWidth = PW - 2 * MARGIN;
  const halfWidth = usableWidth / 2 - 3;
  const leftW = halfWidth;
  const rightX = MARGIN + halfWidth + 6;
  const rightW = halfWidth;

  // fotos à direita
  photosGridRight(doc, unidade.fotos, rightX, 18, rightW);

  // tabelas à esquerda
  let y = tableComodos(doc, unidade.comodos, 36, leftW);
  y = tableQuadro(doc, unidade.quadro, y + 6, leftW);
  y = tableEspecificacoes(doc, unidade.especificacoes, y + 6, leftW);
  const obsY = Math.max(y + 8, 150);
  observacoesBox2Cols(doc, unidade, obsY);
}

/** ----------------- API pública ----------------- */
export const generateCondominioPDF = async (
  cond: Condominio
): Promise<void> => {
  // cria o documento já no formato A4 horizontal
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "landscape" });

  try {
    const logo = await loadPublicLogo();

    // páginas institucionais
    addCoverPage(doc, cond, logo);
    addIndexPage(doc, cond, logo);
    addObjetivoPage(doc, cond, logo);
    addNormasPage(doc, logo);
    addMetodologiaPage(doc, logo);
    addUnidadesSelecionadasPage(doc, cond, logo);

    // páginas por unidade (apto/casa)
    if (cond.tipo === "CASAS") {
      const casas = (cond.casas ?? [])
        .slice()
        .sort((a, b) => a.id.localeCompare(b.id, "pt-BR", { numeric: true }));
      for (const casa of casas) {
        try {
          const fotosData = await resolveFotosToDataUrls(casa.fotos ?? []);
          const casaResolvida = { ...casa, fotos: fotosData };
          unitChecklistPage(doc, cond, casaResolvida, logo, "Casa");
        } catch (e) {
          console.error(`Falha ao montar página da casa ${casa.id}:`, e);
        }
      }
    } else {
      const blocosOrdenados = cond.blocos
        .slice()
        .sort((a, b) => a.id.localeCompare(b.id, "pt-BR", { numeric: true }));

      for (const bloco of blocosOrdenados) {
        const aptosOrdenados = bloco.apartamentos
          .slice()
          .sort((a, b) => a.id.localeCompare(b.id, "pt-BR", { numeric: true }));

        for (const apto of aptosOrdenados) {
          try {
            const fotosData = await resolveFotosToDataUrls(apto.fotos ?? []);
            const aptoResolvido = { ...apto, fotos: fotosData };
            unitChecklistPage(
              doc,
              cond,
              aptoResolvido,
              logo,
              "Apartamento",
              bloco.id
            );
          } catch (e) {
            console.error(
              `Falha ao montar página do apto ${apto.id} do bloco ${bloco.id}:`,
              e
            );
          }
        }
      }
    }

    // considerações e conclusão
    addConsideracoesPage(doc, logo);
    addConclusaoPage(doc, logo);

    const todayIso = new Date().toISOString().slice(0, 10);
    doc.save(`${sanitizeFileName(cond.nome)}_${todayIso}.pdf`);
  } catch (err) {
    throw err instanceof Error ? err : new Error(String(err));
  }
};

/** ----------------- Utils ----------------- */
function sanitizeFileName(s: string) {
  return s.replace(/[\\/:*?"<>|]+/g, "_").trim() || "relatorio";
}
