import * as XLSX from "xlsx";
import Papa from "papaparse";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export function exportarCSV(nombreArchivo: string, filas: Record<string, unknown>[]) {
  const csv = Papa.unparse(filas);
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  descargarBlob(blob, `${nombreArchivo}.csv`);
}

export function exportarExcel(nombreArchivo: string, filas: Record<string, unknown>[], hoja = "Datos") {
  const ws = XLSX.utils.json_to_sheet(filas);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, hoja);
  XLSX.writeFile(wb, `${nombreArchivo}.xlsx`);
}

export function exportarPDF(
  nombreArchivo: string,
  titulo: string,
  columnas: string[],
  filas: (string | number)[][]
) {
  const doc = new jsPDF();
  doc.setFontSize(14);
  doc.text(titulo, 14, 16);
  autoTable(doc, {
    head: [columnas],
    body: filas,
    startY: 22,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [22, 58, 95] },
  });
  doc.save(`${nombreArchivo}.pdf`);
}

function descargarBlob(blob: Blob, nombre: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
