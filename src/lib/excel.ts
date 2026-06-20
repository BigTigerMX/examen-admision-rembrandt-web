// Generación de libros de Excel (.xlsx) con formato profesional:
// títulos, tablas con filtros, fórmulas (promedios, conteos), colores por
// nivel y un cuadro de resumen. Se usa ExcelJS, importado de forma dinámica
// para no inflar el bundle ni romper el render del servidor.
import type { Workbook, Worksheet, Borders } from "exceljs";

/* ---- Paleta institucional (ARGB, sin #) ---- */
const C = {
  azul: "FF1E3A8A",
  azul2: "FF3B5BD6",
  acento: "FFE3A008",
  rojo: "FFD6263B",
  verde: "FF15A34A",
  naranja: "FFE08A1E",
  blanco: "FFFFFFFF",
  grisClaro: "FFF5F7FD",
  zebra: "FFEEF3FF",
  verdeSuave: "FFEAFAF0",
  rojoSuave: "FFFCE8EA",
  ambarSuave: "FFFFF7E6",
};

type Subject = { id: string; name: string };
type Per = Record<string, { hits: number; total: number }>;
type Result = {
  folio: string;
  student_name: string;
  origin: string;
  contact_email: string;
  hits: number;
  total: number;
  pct: number;
  grade: number;
  level: string;
  per: Per;
  created_at: string;
};
type Student = {
  code: string;
  full_name: string;
  origin: string;
  contact_email: string;
  status: string;
};
type Cfg = {
  school: string;
  subtitle: string;
  period: string;
  pass: number;
  escala: number;
} | null;

const thin: Partial<Borders> = {
  top: { style: "thin", color: { argb: "FFD9DEEA" } },
  left: { style: "thin", color: { argb: "FFD9DEEA" } },
  bottom: { style: "thin", color: { argb: "FFD9DEEA" } },
  right: { style: "thin", color: { argb: "FFD9DEEA" } },
};

const col = (n: number) => {
  // 1 -> A, 27 -> AA
  let s = "";
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
};

function fill(ws: Worksheet, addr: string, argb: string) {
  ws.getCell(addr).fill = { type: "pattern", pattern: "solid", fgColor: { argb } };
}

function nivelArgb(level: string) {
  if (level.startsWith("Sobre")) return C.verde;
  if (level.startsWith("Satis")) return C.azul2;
  if (level.startsWith("Bás") || level.startsWith("Bas")) return C.naranja;
  return C.rojo;
}

async function newBook(): Promise<{ ExcelJS: typeof import("exceljs"); wb: Workbook }> {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = "Instituto Rembrandt de Querétaro";
  wb.created = new Date();
  return { ExcelJS, wb };
}

function download(buffer: ArrayBuffer, name: string) {
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

/* =====================================================================
   RESULTADOS — tabla con fórmulas de promedio, ¿INGRESA/NO INGRESA?,
   colores por nivel y cuadro de resumen.
   ===================================================================== */
export async function exportResultsXlsx(
  results: Result[],
  subjects: Subject[],
  cfg: Cfg,
) {
  const { wb } = await newBook();
  const ws = wb.addWorksheet("Resultados", {
    views: [{ state: "frozen", ySplit: 6, xSplit: 3 }],
    pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });
  const pass = cfg?.pass ?? 60;
  const escala = cfg?.escala ?? 10;

  // Columnas dinámicas: fijas + una por materia + fijas finales.
  const headers = [
    "#",
    "Folio",
    "Aspirante",
    "Escuela de procedencia",
    ...subjects.map((s) => s.name),
    "Aciertos",
    "Reactivos",
    "% Aciertos",
    `Calif. (/${escala})`,
    "Nivel de desempeño",
    "Resultado",
    "Fecha",
    "Correo de contacto",
  ];
  const nCols = headers.length;
  const last = col(nCols);

  // ---- Encabezado / título ----
  ws.mergeCells(`A1:${last}1`);
  ws.getCell("A1").value = (cfg?.school || "Instituto Rembrandt de Querétaro").toUpperCase();
  ws.getCell("A1").font = { bold: true, size: 16, color: { argb: C.blanco } };
  ws.getCell("A1").alignment = { vertical: "middle", horizontal: "center" };
  fill(ws, "A1", C.azul);
  ws.getRow(1).height = 30;

  ws.mergeCells(`A2:${last}2`);
  ws.getCell("A2").value =
    cfg?.subtitle || "Resultados del Examen de Admisión a Bachillerato";
  ws.getCell("A2").font = { bold: true, size: 11, color: { argb: C.blanco } };
  ws.getCell("A2").alignment = { vertical: "middle", horizontal: "center" };
  fill(ws, "A2", C.azul2);
  ws.getRow(2).height = 20;

  ws.mergeCells(`A3:${last}3`);
  ws.getCell("A3").value = `Generado el ${new Date().toLocaleString("es-MX")}  ·  Aprueba con ${pass}% o más  ·  ${results.length} examen(es) presentado(s)`;
  ws.getCell("A3").font = { italic: true, size: 9.5, color: { argb: "FF586074" } };
  ws.getCell("A3").alignment = { horizontal: "center" };
  ws.getRow(4).height = 6; // espacio

  // ---- Tabla con filtros y fila de totales (promedios) ----
  const headerRow = 5;
  const firstData = headerRow + 1;
  const subjStart = 5; // columna E (1-based) donde inician materias

  const rows = results.map((r, i) => {
    const subjVals = subjects.map((s) => r.per?.[s.id]?.hits ?? 0);
    return [
      i + 1,
      r.folio,
      r.student_name,
      r.origin || "—",
      ...subjVals,
      r.hits,
      r.total,
      r.pct,
      Number(r.grade),
      r.level,
      r.pct >= pass ? "INGRESA" : "NO INGRESA",
      new Date(r.created_at).toLocaleDateString("es-MX"),
      r.contact_email || "—",
    ];
  });

  const tableColumns = headers.map((name, i) => {
    const isSubject = i >= subjStart - 1 && i < subjStart - 1 + subjects.length;
    const isNumAvg = isSubject || ["Aciertos", "Reactivos", "% Aciertos"].includes(name) || name.startsWith("Calif");
    return {
      name,
      filterButton: true,
      totalsRowFunction: (i === 0 ? "none" : isNumAvg ? "average" : "none") as
        | "none"
        | "average",
      totalsRowLabel: i === 0 ? "PROMEDIO" : undefined,
    };
  });

  ws.addTable({
    name: "TablaResultados",
    ref: `A${headerRow}`,
    headerRow: true,
    totalsRow: true,
    style: { theme: "TableStyleMedium2", showRowStripes: true },
    columns: tableColumns,
    rows,
  });

  const totalsRow = firstData + rows.length;

  // ---- Estilo de encabezado de la tabla ----
  for (let c = 1; c <= nCols; c++) {
    const cell = ws.getCell(`${col(c)}${headerRow}`);
    cell.font = { bold: true, color: { argb: C.blanco }, size: 10 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.azul } };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = thin;
  }
  ws.getRow(headerRow).height = 30;

  // ---- Formato de cada fila de datos ----
  for (let i = 0; i < rows.length; i++) {
    const r = results[i];
    const rowN = firstData + i;
    for (let c = 1; c <= nCols; c++) {
      const cell = ws.getCell(`${col(c)}${rowN}`);
      cell.border = thin;
      cell.alignment = { vertical: "middle", horizontal: c <= 4 || c >= nCols - 1 ? "left" : "center" };
    }
    // % y calificación con formato numérico
    const pctCol = subjStart + subjects.length + 2; // Aciertos, Reactivos, %Aciertos
    ws.getCell(`${col(pctCol)}${rowN}`).numFmt = '0"%"';
    ws.getCell(`${col(pctCol + 1)}${rowN}`).numFmt = "0.0";
    // Nivel coloreado
    const nivelCol = subjStart + subjects.length + 4;
    const nc = ws.getCell(`${col(nivelCol)}${rowN}`);
    nc.font = { bold: true, color: { argb: C.blanco }, size: 10 };
    fill(ws, `${col(nivelCol)}${rowN}`, nivelArgb(r.level));
    // Resultado INGRESA / NO INGRESA
    const resCol = nivelCol + 1;
    const rc = ws.getCell(`${col(resCol)}${rowN}`);
    const ingresa = r.pct >= pass;
    rc.font = { bold: true, color: { argb: ingresa ? C.verde : C.rojo } };
    fill(ws, `${col(resCol)}${rowN}`, ingresa ? C.verdeSuave : C.rojoSuave);
  }

  // ---- Fila de totales (promedios) resaltada ----
  for (let c = 1; c <= nCols; c++) {
    const cell = ws.getCell(`${col(c)}${totalsRow}`);
    cell.font = { bold: true, color: { argb: C.azul } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.grisClaro } };
    cell.border = { ...thin, top: { style: "medium", color: { argb: C.azul } } };
    cell.alignment = { vertical: "middle", horizontal: "center" };
  }
  ws.getCell(`${col(subjStart + subjects.length + 2)}${totalsRow}`).numFmt = '0"%"';
  ws.getCell(`${col(subjStart + subjects.length + 3)}${totalsRow}`).numFmt = "0.0";

  // ---- Anchos de columna ----
  ws.getColumn(1).width = 5;
  ws.getColumn(2).width = 16;
  ws.getColumn(3).width = 30;
  ws.getColumn(4).width = 26;
  subjects.forEach((_, i) => (ws.getColumn(subjStart + i).width = 13));
  const off = subjStart + subjects.length;
  ws.getColumn(off).width = 10; // Aciertos
  ws.getColumn(off + 1).width = 10; // Reactivos
  ws.getColumn(off + 2).width = 11; // %
  ws.getColumn(off + 3).width = 12; // Calif
  ws.getColumn(off + 4).width = 20; // Nivel
  ws.getColumn(off + 5).width = 13; // Resultado
  ws.getColumn(off + 6).width = 12; // Fecha
  ws.getColumn(off + 7).width = 26; // Correo

  // ---- Cuadro de RESUMEN con fórmulas ----
  const calLetter = col(subjStart + subjects.length + 3);
  const pctLetter = col(subjStart + subjects.length + 2);
  const resLetter = col(subjStart + subjects.length + 5);
  const dataA = firstData;
  const dataB = firstData + rows.length - 1;
  const sumStart = totalsRow + 2;

  const summary: [string, string, string?][] = [
    ["Exámenes presentados", `=COUNTA(C${dataA}:C${dataB})`, "0"],
    ["Promedio general", `=IFERROR(AVERAGE(${calLetter}${dataA}:${calLetter}${dataB}),0)`, "0.0"],
    ["Promedio de aciertos", `=IFERROR(AVERAGE(${pctLetter}${dataA}:${pctLetter}${dataB}),0)`, '0"%"'],
    ["Calificación más alta", `=IFERROR(MAX(${calLetter}${dataA}:${calLetter}${dataB}),0)`, "0.0"],
    ["Calificación más baja", `=IFERROR(MIN(${calLetter}${dataA}:${calLetter}${dataB}),0)`, "0.0"],
    ["Aspirantes que INGRESAN", `=COUNTIF(${resLetter}${dataA}:${resLetter}${dataB},"INGRESA")`, "0"],
    ["Aspirantes que NO INGRESAN", `=COUNTIF(${resLetter}${dataA}:${resLetter}${dataB},"NO INGRESA")`, "0"],
    ["% de ingreso", `=IFERROR(COUNTIF(${resLetter}${dataA}:${resLetter}${dataB},"INGRESA")/COUNTA(C${dataA}:C${dataB}),0)`, "0.0%"],
  ];

  ws.mergeCells(`A${sumStart}:C${sumStart}`);
  ws.getCell(`A${sumStart}`).value = "RESUMEN ESTADÍSTICO";
  ws.getCell(`A${sumStart}`).font = { bold: true, size: 12, color: { argb: C.blanco } };
  ws.getCell(`A${sumStart}`).alignment = { horizontal: "center", vertical: "middle" };
  fill(ws, `A${sumStart}`, C.azul);
  ws.getRow(sumStart).height = 22;

  summary.forEach(([label, formula, fmt], i) => {
    const rN = sumStart + 1 + i;
    const lc = ws.getCell(`A${rN}`);
    ws.mergeCells(`A${rN}:B${rN}`);
    lc.value = label;
    lc.font = { bold: true, color: { argb: C.azul } };
    lc.alignment = { vertical: "middle" };
    lc.fill = { type: "pattern", pattern: "solid", fgColor: { argb: i % 2 ? C.blanco : C.grisClaro } };
    lc.border = thin;
    const vc = ws.getCell(`C${rN}`);
    vc.value = { formula, date1904: false } as unknown as string;
    vc.numFmt = fmt || "General";
    vc.font = { bold: true, color: { argb: C.azul2 } };
    vc.alignment = { horizontal: "center", vertical: "middle" };
    vc.border = thin;
    vc.fill = { type: "pattern", pattern: "solid", fgColor: { argb: i % 2 ? C.blanco : C.grisClaro } };
  });

  const buf = await wb.xlsx.writeBuffer();
  download(buf as ArrayBuffer, "Resultados_Admision_Rembrandt.xlsx");
}

/* =====================================================================
   ASPIRANTES — lista con códigos de acceso y estado coloreado.
   ===================================================================== */
export async function exportStudentsXlsx(students: Student[], cfg: Cfg) {
  const { wb } = await newBook();
  const ws = wb.addWorksheet("Aspirantes", {
    views: [{ state: "frozen", ySplit: 4 }],
    pageSetup: { orientation: "portrait", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });
  const headers = ["#", "Código de acceso", "Aspirante", "Escuela de procedencia", "Estado", "Correo de contacto"];
  const nCols = headers.length;
  const last = col(nCols);

  ws.mergeCells(`A1:${last}1`);
  ws.getCell("A1").value = (cfg?.school || "Instituto Rembrandt de Querétaro").toUpperCase();
  ws.getCell("A1").font = { bold: true, size: 15, color: { argb: C.blanco } };
  ws.getCell("A1").alignment = { horizontal: "center", vertical: "middle" };
  fill(ws, "A1", C.azul);
  ws.getRow(1).height = 28;

  ws.mergeCells(`A2:${last}2`);
  ws.getCell("A2").value = "Aspirantes registrados y códigos de acceso (un solo uso)";
  ws.getCell("A2").font = { bold: true, size: 10.5, color: { argb: C.blanco } };
  ws.getCell("A2").alignment = { horizontal: "center", vertical: "middle" };
  fill(ws, "A2", C.azul2);
  ws.getRow(3).height = 6;

  const headerRow = 4;
  const firstData = 5;
  const rows = students.map((s, i) => [
    i + 1,
    s.code,
    s.full_name,
    s.origin || "—",
    s.status === "completed" ? "Contestado" : "Pendiente",
    s.contact_email || "—",
  ]);

  ws.addTable({
    name: "TablaAspirantes",
    ref: `A${headerRow}`,
    headerRow: true,
    style: { theme: "TableStyleMedium2", showRowStripes: true },
    columns: headers.map((name) => ({ name, filterButton: true })),
    rows,
  });

  for (let c = 1; c <= nCols; c++) {
    const cell = ws.getCell(`${col(c)}${headerRow}`);
    cell.font = { bold: true, color: { argb: C.blanco }, size: 10 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.azul } };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = thin;
  }
  ws.getRow(headerRow).height = 24;

  for (let i = 0; i < rows.length; i++) {
    const s = students[i];
    const rowN = firstData + i;
    for (let c = 1; c <= nCols; c++) {
      const cell = ws.getCell(`${col(c)}${rowN}`);
      cell.border = thin;
      cell.alignment = { vertical: "middle", horizontal: c === 1 || c === 5 ? "center" : "left" };
    }
    ws.getCell(`B${rowN}`).font = { bold: true, color: { argb: C.azul }, size: 11 };
    ws.getCell(`B${rowN}`).alignment = { horizontal: "center", vertical: "middle" };
    const done = s.status === "completed";
    const est = ws.getCell(`E${rowN}`);
    est.font = { bold: true, color: { argb: done ? C.verde : C.naranja } };
    fill(ws, `E${rowN}`, done ? C.verdeSuave : C.ambarSuave);
  }

  ws.getColumn(1).width = 5;
  ws.getColumn(2).width = 16;
  ws.getColumn(3).width = 30;
  ws.getColumn(4).width = 28;
  ws.getColumn(5).width = 14;
  ws.getColumn(6).width = 28;

  const buf = await wb.xlsx.writeBuffer();
  download(buf as ArrayBuffer, "Aspirantes_Codigos_Rembrandt.xlsx");
}
