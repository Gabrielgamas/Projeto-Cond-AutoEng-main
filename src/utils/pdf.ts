/* eslint-disable @typescript-eslint/naming-convention */
import jsPDF from "jspdf";
import autoTable, { type CellHookData, type CellInput } from "jspdf-autotable";
import type {
  Condominio,
  Bloco,
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
    const response = await fetch("/logo.png"); // ← novo caminho
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
      // eslint-disable-next-line no-console
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

function addIndexPage(doc: jsPDF, logo?: string) {
  doc.addPage("a4", "landscape");
  topBar(doc);
  sectionTitle(doc, "Índice", 50);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(14);
  const itens = [
    "1. Objetivo",
    "2. Normas Aplicáveis",
    "3. Metodologia",
    "4. Casas Selecionadas",
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

function addCasasSelecionadasPage(doc: jsPDF, cond: Condominio, logo?: string) {
  doc.addPage("a4", "landscape");
  topBar(doc);
  sectionTitle(doc, "Casas Selecionadas", 60);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Casas:", MARGIN + 8, 90);

  doc.setFont("helvetica", "normal");
  const colW = (PW - 2 * MARGIN - 16) / 3;
  let colX = MARGIN + 8;
  let y = 104;
  const lineH = 9;

  const blocos = cond.blocos
    .slice()
    .sort((a, b) => a.id.localeCompare(b.id, "pt-BR", { numeric: true }));

  blocos.forEach((b, idx) => {
    const aptos = b.apartamentos
      .slice()
      .sort((a, b2) => a.id.localeCompare(b2.id, "pt-BR", { numeric: true }));
    const aptosStr = aptos.map((a) => a.id).join("   ");

    if (y > PH - 30) {
      y = 104;
      colX += colW;
    }
    const blocoLabel = `Bloco ${b.id}:`;
    doc.setFont("helvetica", "bold");
    doc.text(blocoLabel, colX, y);
    doc.setFont("helvetica", "normal");
    doc.text(aptosStr, colX + doc.getTextWidth(blocoLabel) + 2, y);

    y += lineH;

    if (
      colX > MARGIN + 8 + 2 * colW &&
      y > PH - 30 &&
      idx < blocos.length - 1
    ) {
      doc.addPage("a4", "landscape");
      topBar(doc);
      sectionTitle(doc, "Casas Selecionadas (continuação)", 60);
      doc.setFont("helvetica", "normal");
      colX = MARGIN + 8;
      y = 104;
    }
  });

  footerLogo(doc, logo);
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
    "O presente laudo técnico apresentou a análise das instalações elétricas das casas " +
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
  const cy = y + h / 2 + 0.2; // leve ajuste vertical
  const s = Math.min(w, h) * 0.32; // escala: menor que antes
  const lw = Math.max(0.35, s * 0.06); // linha mais fina

  doc.setDrawColor(0, 128, 0);
  doc.setLineWidth(lw);
  // dois traços do "check"
  doc.line(cx - s * 0.6, cy + s * 0.1, cx - s * 0.18, cy + s * 0.6);
  doc.line(cx - s * 0.18, cy + s * 0.6, cx + s * 0.75, cy - s * 0.45);
}

function drawCross(doc: jsPDF, x: number, y: number, w: number, h: number) {
  const cx = x + w / 2;
  const cy = y + h / 2 + 0.2;
  const s = Math.min(w, h) * 0.2; // um pouco menor
  const lw = Math.max(0.35, s * 0.06);

  doc.setDrawColor(200, 0, 0);
  doc.setLineWidth(lw);
  doc.line(cx - s, cy - s, cx + s, cy + s);
  doc.line(cx + s, cy - s, cx - s, cy + s);
}

function tableComodos(
  doc: jsPDF,
  comodos: TabelaComodos,
  startY: number,
  width: number
) {
  const COLS: (keyof ChecklistComodo)[] = [
    "Tugs e Tues",
    "Iluminação",
    "Acabamento",
    "Tensão e Corrente",
  ];

  const body: CellInput[][] = (
    Object.keys(comodos) as (keyof TabelaComodos)[]
  ).map((r) => [r, ...COLS.map((c) => !!comodos[r][c])]);

  const yTitle = 10;

  const y = yTitle;

  const yAfterTitle = yTitle + 8; // controla a distância do título para o conteúdo

  autoTable(doc, {
    ...tableBase,
    startY: yAfterTitle,
    head: [["Cômodo", ...COLS]],
    body,
    margin: { left: MARGIN, right: PW - (MARGIN + width) },
    tableWidth: width,

    // ⬇️ Limpa o texto ANTES de imprimir
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
        cell.text = []; // remove conteúdo textual
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
    // ⬇️ Limpa o texto ANTES de imprimir
    didParseCell: (data: CellHookData) => {
      if (data.section === "body" && data.column.index > 0) {
        data.cell.text = [];
      }
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
    // ⬇️ Limpa o texto ANTES de imprimir
    didParseCell: (data: CellHookData) => {
      if (data.section === "body" && data.column.index > 0) {
        data.cell.text = [];
      }
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
  const top = areaY + 10;
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
          // eslint-disable-next-line no-console
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

/** ----------------- Observações (lista) ----------------- */
function observacoesBox2Cols(
  doc: jsPDF,
  apto: Apartamento,
  startY: number
): number {
  const titleH = 8;
  const totalW = PW - 2 * MARGIN;
  const colGap = 0;
  const colW = (totalW - colGap) / 2;

  // Altura disponível na página a partir do startY
  const availH = PH - MARGIN - startY;
  const contentH = Math.max(20, availH - titleH); // garante algo mínimo

  // Tarja de título
  doc.setFillColor(...NAVY);
  doc.rect(MARGIN, startY, totalW, titleH, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Observações", MARGIN + 4, startY + 5.8);
  doc.setTextColor(0, 0, 0);

  const yTop = startY + titleH;
  const lineH = 10; // altura por linha de observação

  // Quantas linhas cabem por coluna nesta página
  const linesPerCol = Math.max(1, Math.floor((contentH - 6) / lineH));

  const erros = apto.erros ?? [];
  const total = erros.length;

  // Desenha o contêiner das duas colunas
  doc.setDrawColor(0);
  doc.rect(MARGIN, yTop, colW, contentH);
  doc.rect(MARGIN + colW + colGap, yTop, colW, contentH);

  // Quantos itens cabem no bloco atual (duas colunas)
  const capThisPage = linesPerCol * 2;

  // fatia a lista para esta página
  const pageItems = erros.slice(0, capThisPage);
  const restItems = erros.slice(capThisPage);

  // Escreve as linhas na coluna esquerda e direita
  const writeCol = (items: typeof erros, x: number, startIndex: number) => {
    let y = yTop + 7;
    for (let i = 0; i < items.length; i++) {
      const e = items[i];
      const idx = startIndex + i + 1;
      const txt = e
        ? [
            `${idx}. ${e.descricao}`,
            e.comodo ? ` — ${e.comodo}` : "",
            e.item ? ` (${e.item})` : "",
          ].join("")
        : "";

      // texto
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      const wrapped = doc.splitTextToSize(txt, colW - 8);
      doc.text(wrapped, x + 4, y);

      // linha horizontal guia
      doc.setDrawColor(200);
      doc.line(x, y + 2.8, x + colW, y + 2.8);

      y += lineH;
      if (y > yTop + contentH - 4) break;
    }
  };

  // esquerda
  writeCol(
    pageItems.slice(0, Math.min(linesPerCol, pageItems.length)),
    MARGIN,
    0
  );

  // direita
  const rightSlice = pageItems.slice(linesPerCol);
  writeCol(rightSlice, MARGIN + colW + colGap, linesPerCol);

  // Se sobrou conteúdo, cria nova página e continua
  if (restItems.length > 0) {
    doc.addPage("a4", "landscape");
    // cabeçalho estreito (faixa azul) para manter a identidade
    doc.setFillColor(...NAVY);
    doc.rect(0, 0, PW, 6, "F");
    // recomeça a caixa em nova página na mesma posição vertical
    // (pode mudar start para 20 se quiser mais espaço)
    return observacoesBox2Cols(doc, { ...apto, erros: restItems }, 20);
  }

  return yTop + contentH;
}

/** ----------------- Página por apartamento ----------------- */
function apartmentChecklistPage(
  doc: jsPDF,
  cond: Condominio,
  bloco: Bloco,
  apto: Apartamento,
  logo?: string
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

  // Título

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);

  // partes da frase
  const textoBase = "Checklist da Instalação Elétrica do Apartamento ";
  const aptoFmt = apto.id.padStart(2, "0");
  const textoBloco = " Bloco ";
  const textoFinal = bloco.id;

  // calcula largura de cada trecho
  const wBase = doc.getTextWidth(textoBase);
  const wApto = doc.getTextWidth(aptoFmt);
  const wBloco = doc.getTextWidth(textoBloco);
  const wId = doc.getTextWidth(textoFinal);

  // calcula posição inicial pra centralizar tudo
  const totalWidth = wBase + wApto + wBloco + wId;
  const startX = (PW - totalWidth) / 2;
  const z = 10;

  // desenha partes com suas cores
  let cursor = startX;

  // parte azul — “Checklist da Instalação Elétrica do Apartamento”
  doc.setTextColor(...NAVY);
  doc.text(textoBase, cursor, z);
  cursor += wBase;

  // parte laranja — número do apartamento
  doc.setTextColor(...ORANGE);
  doc.text(aptoFmt, cursor, z);
  cursor += wApto;

  // parte azul — “ Bloco ”
  doc.setTextColor(...NAVY);
  doc.text(textoBloco, cursor, z);
  cursor += wBloco;

  // parte laranja — número do bloco
  doc.setTextColor(...ORANGE);
  doc.text(textoFinal, cursor, z);

  // volta para preto, se for continuar desenhando
  doc.setTextColor(0, 0, 0);

  // Layout: tabelas à esquerda, fotos à direita

  // 📐 queremos dividir a largura total (PW - 2*MARGIN) em 2 partes iguais
  const usableWidth = PW - 2 * MARGIN;
  const halfWidth = usableWidth / 2 - 3; // -3 pra dar espaçamento central

  // coluna esquerda = tabelas
  const leftW = halfWidth;
  const leftX = MARGIN;

  // coluna direita = fotos
  const rightX = MARGIN + halfWidth + 6; // 6mm de espaço entre colunas
  const rightW = halfWidth;
  // 🖼️ Fotos ocupando metade direita
  photosGridRight(doc, apto.fotos, rightX, 18, rightW);

  // 📋 Tabelas ocupando metade esquerda
  let y = tableComodos(doc, apto.comodos, 36, leftW);
  y = tableQuadro(doc, apto.quadro, y + 6, leftW);
  y = tableEspecificacoes(doc, apto.especificacoes, y + 6, leftW);
  const obsY = Math.max(y + 8, 150);
  observacoesBox2Cols(doc, apto, obsY);
}

/** ----------------- API pública ----------------- */
export const generateCondominioPDF = async (
  cond: Condominio
): Promise<void> => {
  // cria o documento já no formato A4 horizontal
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "landscape" });

  try {
    // carrega logo (se falhar, segue sem logo)
    const logo = await loadPublicLogo();

    // páginas institucionais
    addCoverPage(doc, cond, logo);
    addIndexPage(doc, logo);
    addObjetivoPage(doc, cond, logo);
    addNormasPage(doc, logo);
    addMetodologiaPage(doc, logo);
    addCasasSelecionadasPage(doc, cond, logo);

    // páginas por apartamento
    const blocosOrdenados = cond.blocos
      .slice()
      .sort((a, b) => a.id.localeCompare(b.id, "pt-BR", { numeric: true }));

    for (const bloco of blocosOrdenados) {
      const aptosOrdenados = bloco.apartamentos
        .slice()
        .sort((a, b) => a.id.localeCompare(b.id, "pt-BR", { numeric: true }));

      for (const apto of aptosOrdenados) {
        try {
          apartmentChecklistPage(doc, cond, bloco, apto, logo);
        } catch (e) {
          // não interrompe o laudo inteiro se um apê falhar
          // eslint-disable-next-line no-console
          console.error(
            `Falha ao montar página do apto ${apto.id} do bloco ${bloco.id}:`,
            e
          );
        }
      }
    }

    // considerações e conclusão
    addConsideracoesPage(doc, logo);
    addConclusaoPage(doc, logo);

    const todayIso = new Date().toISOString().slice(0, 10);
    doc.save(`${sanitizeFileName(cond.nome)}_${todayIso}.pdf`);
  } catch (err) {
    // repassa para o botão tratar (exibe alerta)
    throw err instanceof Error ? err : new Error(String(err));
  }
};

/** ----------------- Utils ----------------- */
function sanitizeFileName(s: string) {
  return s.replace(/[\\/:*?"<>|]+/g, "_").trim() || "relatorio";
}
