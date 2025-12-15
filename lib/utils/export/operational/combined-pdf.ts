import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { formatNumber, formatCurrency } from "../../format-client";
import type { ComprehensiveSalesReport } from "@/lib/services/report-sales.service";
import type { DateRange } from "@/components/reusable/date-picker";
import {
  addBackgroundLogo,
  addPDFHeader,
  addPDFFooter,
  addStatCards,
} from "../shared/pdf-helper";

export type StockReportData = {
  tanks: Array<{
    tankId: string;
    tankName: string;
    productName: string;
    capacity: number;
    openingStock: number;
    totalUnload: number;
    totalSales: number;
    closingStock: number;
    totalVariance: number;
    variancePercentage: number;
    fillPercentage: number;
  }>;
  summary: {
    totalCapacity: number;
    totalOpeningStock: number;
    totalUnload: number;
    totalSales: number;
    totalClosingStock: number;
    totalVariance: number;
  };
};

export async function exportOperationalReportsToPDF(
  salesReport: ComprehensiveSalesReport,
  stockReport: StockReportData,
  gasStationName: string,
  dateRange: DateRange,
  userRole: string,
  userName?: string
) {
  const doc = new jsPDF("landscape", "mm", "a4");
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;

  // Add background logo
  await addBackgroundLogo(doc);

  // ========== PAGE 1: SALES REPORT ==========
  let yPosition = await addPDFHeader(
    doc,
    "LAPORAN PENJUALAN KOMPREHENSIF",
    gasStationName,
    dateRange
  );

  // Summary Section with Stat Cards
  yPosition += 3;
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("RINGKASAN", 14, yPosition);
  yPosition += 7;

  yPosition = addStatCards(
    doc,
    [
      {
        label: "Total Volume",
        value: `${formatNumber(salesReport.summary.totalVolume)} L`,
        bgColor: [239, 246, 255],
        borderColor: [191, 219, 254],
        textColor: [30, 64, 175],
      },
      {
        label: "Total Nilai",
        value: formatCurrency(salesReport.summary.totalAmount),
        bgColor: [240, 253, 244],
        borderColor: [187, 247, 208],
        textColor: [20, 83, 45],
      },
    ],
    yPosition
  );

  // Product Table with Breakdown
  yPosition += 5;
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("DETAIL PER PRODUK DENGAN BREAKDOWN NOZZLE", 14, yPosition);
  yPosition += 5;

  const salesTableData: any[] = [];

  salesReport.byProduct.forEach((product: any) => {
    salesTableData.push([
      product.productName,
      "",
      "",
      "",
      "",
      "",
      formatNumber(product.totalVolume),
      formatCurrency(product.price),
      formatCurrency(product.totalAmount),
    ]);

    if (product.nozzleBreakdown && product.nozzleBreakdown.length > 0) {
      product.nozzleBreakdown.forEach((nozzle: any) => {
        salesTableData.push([
          "",
          `${nozzle.stationCode} (${nozzle.stationName})`,
          nozzle.nozzleName || nozzle.nozzleCode,
          formatNumber(nozzle.totalizerOpen),
          formatNumber(nozzle.totalizerClose),
          formatNumber(nozzle.pumpTest),
          formatNumber(nozzle.volume),
          formatCurrency(nozzle.price),
          formatCurrency(nozzle.amount),
        ]);
      });
    }
  });

  salesTableData.push([
    "TOTAL",
    "",
    "",
    "",
    "",
    "",
    formatNumber(salesReport.summary.totalVolume),
    "",
    formatCurrency(salesReport.summary.totalAmount),
  ]);

  autoTable(doc, {
    startY: yPosition,
    head: [
      [
        "Produk",
        "Station",
        "Nozzle",
        "Totalizer Buka",
        "Totalizer Tutup",
        "Pump Test",
        "Volume (L)",
        "Harga (Rp)",
        "Amount (Rp)",
      ],
    ],
    body: salesTableData,
    styles: {
      fontSize: 7,
      cellPadding: 2,
    },
    headStyles: {
      fillColor: [66, 139, 202],
      textColor: 255,
      fontStyle: "bold",
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
    columnStyles: {
      0: { fontStyle: "bold" },
      3: { halign: "right" },
      4: { halign: "right" },
      5: { halign: "right" },
      6: { halign: "right", fontStyle: "bold" },
      7: { halign: "right" },
      8: { halign: "right", fontStyle: "bold" },
    },
    margin: { left: 14, right: 14 },
  });

  // Footer for sales report page
  addPDFFooter(doc, userRole, userName);

  // ========== PAGE 2: STOCK REPORT ==========
  doc.addPage("landscape");
  await addBackgroundLogo(doc);

  yPosition = await addPDFHeader(
    doc,
    "LAPORAN STOCK",
    gasStationName,
    dateRange
  );

  // Summary Section
  yPosition += 3;
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("RINGKASAN", 14, yPosition);
  yPosition += 7;

  yPosition = addStatCards(
    doc,
    [
      {
        label: "Kapasitas Total",
        value: `${formatNumber(stockReport.summary.totalCapacity)} L`,
        bgColor: [239, 246, 255],
        borderColor: [191, 219, 254],
        textColor: [30, 64, 175],
      },
      {
        label: "Stock Awal",
        value: `${formatNumber(stockReport.summary.totalOpeningStock)} L`,
        bgColor: [250, 245, 255],
        borderColor: [221, 214, 254],
        textColor: [88, 28, 135],
      },
      {
        label: "Total Unload",
        value: `${formatNumber(stockReport.summary.totalUnload)} L`,
        bgColor: [240, 253, 244],
        borderColor: [187, 247, 208],
        textColor: [20, 83, 45],
      },
      {
        label: "Total Penjualan",
        value: `${formatNumber(stockReport.summary.totalSales)} L`,
        bgColor: [255, 247, 237],
        borderColor: [254, 215, 170],
        textColor: [154, 52, 18],
      },
      {
        label: "Stock Akhir",
        value: `${formatNumber(stockReport.summary.totalClosingStock)} L`,
        bgColor: [240, 253, 244],
        borderColor: [187, 247, 208],
        textColor: [20, 83, 45],
      },
      {
        label: "Total Variance",
        value: `${formatNumber(stockReport.summary.totalVariance)} L`,
        bgColor:
          stockReport.summary.totalVariance < 0
            ? [254, 242, 242]
            : [240, 253, 244],
        borderColor:
          stockReport.summary.totalVariance < 0
            ? [254, 202, 202]
            : [187, 247, 208],
        textColor:
          stockReport.summary.totalVariance < 0 ? [127, 29, 29] : [20, 83, 45],
      },
    ],
    yPosition
  );

  // Tank Table
  yPosition += 5;
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("DETAIL PER TANGKI", 14, yPosition);
  yPosition += 5;

  const stockTableData = stockReport.tanks.map((tank) => [
    tank.tankName,
    tank.productName,
    formatNumber(tank.capacity),
    formatNumber(tank.openingStock),
    formatNumber(tank.totalUnload),
    formatNumber(tank.totalSales),
    formatNumber(tank.closingStock),
    formatNumber(tank.totalVariance),
    `${tank.variancePercentage.toFixed(2)}%`,
    `${tank.fillPercentage.toFixed(1)}%`,
  ]);

  stockTableData.push([
    "TOTAL",
    "",
    formatNumber(stockReport.summary.totalCapacity),
    formatNumber(stockReport.summary.totalOpeningStock),
    formatNumber(stockReport.summary.totalUnload),
    formatNumber(stockReport.summary.totalSales),
    formatNumber(stockReport.summary.totalClosingStock),
    formatNumber(stockReport.summary.totalVariance),
    "",
    "",
  ]);

  autoTable(doc, {
    startY: yPosition,
    head: [
      [
        "Tangki",
        "Produk",
        "Kapasitas (L)",
        "Stock Awal (L)",
        "Unload (L)",
        "Penjualan (L)",
        "Stock Akhir (L)",
        "Variance (L)",
        "Var %",
        "Fill %",
      ],
    ],
    body: stockTableData,
    styles: {
      fontSize: 7,
      cellPadding: 2,
    },
    headStyles: {
      fillColor: [66, 139, 202],
      textColor: 255,
      fontStyle: "bold",
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
    columnStyles: {
      2: { halign: "right" },
      3: { halign: "right" },
      4: { halign: "right" },
      5: { halign: "right" },
      6: { halign: "right" },
      7: { halign: "right" },
      8: { halign: "right" },
      9: { halign: "right" },
    },
    margin: { left: 14, right: 14 },
  });

  // Footer for stock report page
  addPDFFooter(doc, userRole, userName);

  // Save
  // Format UTC date for filename
  const formatUTCDate = (date: Date, formatStr: string): string => {
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth();
    const day = date.getUTCDate();
    const localDate = new Date(year, month, day);
    return format(localDate, formatStr);
  };

  const filename = `Laporan_Operasional_${gasStationName.replace(
    /\s+/g,
    "_"
  )}_${formatUTCDate(dateRange.from, "yyyyMMdd")}-${formatUTCDate(
    dateRange.to,
    "yyyyMMdd"
  )}.pdf`;
  doc.save(filename);
}
