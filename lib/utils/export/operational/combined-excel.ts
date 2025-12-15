import ExcelJS from "exceljs";
import { format } from "date-fns";
import { formatNumber, formatCurrency } from "../../format-client";
import type {
  ComprehensiveSalesReport,
  ProductSalesData,
  NozzleBreakdown,
} from "@/lib/services/report-sales.service";
import type { SalesChartData } from "@/lib/services/report-saleschart.service";
import type { DateRange } from "@/components/reusable/date-picker";
import type { StockReportData } from "./combined-pdf";
import { downloadExcelFile } from "../shared/excel-helper";

/**
 * Format UTC date to local date string for display
 * Uses UTC methods to ensure date doesn't shift due to timezone
 */
function formatUTCDate(date: Date, formatStr: string): string {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();
  const localDate = new Date(year, month, day);
  return format(localDate, formatStr);
}

export async function exportOperationalReportsToExcel(
  salesReport: ComprehensiveSalesReport,
  stockReport: StockReportData,
  chartData: SalesChartData[],
  gasStationName: string,
  dateRange: DateRange
) {
  const workbook = new ExcelJS.Workbook();

  // ========== SHEET 1: SALES REPORT ==========
  const salesSheet = workbook.addWorksheet("Laporan Penjualan");

  salesSheet.addRow(["LAPORAN PENJUALAN KOMPREHENSIF"]);
  salesSheet.addRow([gasStationName]);
  salesSheet.addRow([
    `Periode: ${formatUTCDate(
      dateRange.from,
      "dd MMM yyyy"
    )} s/d ${formatUTCDate(dateRange.to, "dd MMM yyyy")}`,
  ]);
  salesSheet.addRow([]);
  salesSheet.addRow(["RINGKASAN"]);
  salesSheet.addRow([
    "Total Volume",
    formatNumber(salesReport.summary.totalVolume),
    "Liter",
  ]);
  salesSheet.addRow([
    "Total Nilai",
    formatCurrency(salesReport.summary.totalAmount),
  ]);
  salesSheet.addRow([
    "Total Transaksi",
    formatNumber(salesReport.summary.totalTransactions),
  ]);
  salesSheet.addRow([]);
  salesSheet.addRow(["DETAIL PER PRODUK DENGAN BREAKDOWN NOZZLE"]);
  salesSheet.addRow([
    "Produk",
    "Station",
    "Nozzle",
    "Totalizer Buka",
    "Totalizer Tutup",
    "Pump Test",
    "Volume (L)",
    "Harga (Rp)",
    "Amount (Rp)",
  ]);

  salesReport.byProduct.forEach((product: ProductSalesData) => {
    salesSheet.addRow([
      product.productName,
      "",
      "",
      "",
      "",
      "",
      product.totalVolume,
      product.price,
      product.totalAmount,
    ]);

    if (product.nozzleBreakdown && product.nozzleBreakdown.length > 0) {
      product.nozzleBreakdown.forEach((nozzle: NozzleBreakdown) => {
        salesSheet.addRow([
          "",
          `${nozzle.stationCode} (${nozzle.stationName})`,
          nozzle.nozzleName || nozzle.nozzleCode,
          nozzle.totalizerOpen,
          nozzle.totalizerClose,
          nozzle.pumpTest,
          nozzle.volume,
          nozzle.price,
          nozzle.amount,
        ]);
      });
    }
  });

  salesSheet.addRow([
    "TOTAL",
    "",
    "",
    "",
    "",
    "",
    salesReport.summary.totalVolume,
    "",
    salesReport.summary.totalAmount,
  ]);

  salesSheet.columns = [
    { width: 20 },
    { width: 20 },
    { width: 15 },
    { width: 15 },
    { width: 15 },
    { width: 12 },
    { width: 15 },
    { width: 15 },
    { width: 18 },
  ];

  // ========== SHEET 2: STOCK REPORT ==========
  const stockSheet = workbook.addWorksheet("Laporan Stock");

  stockSheet.addRow(["LAPORAN STOCK"]);
  stockSheet.addRow([gasStationName]);
  stockSheet.addRow([
    `Periode: ${formatUTCDate(
      dateRange.from,
      "dd MMM yyyy"
    )} s/d ${formatUTCDate(dateRange.to, "dd MMM yyyy")}`,
  ]);
  stockSheet.addRow([]);
  stockSheet.addRow(["RINGKASAN"]);
  stockSheet.addRow([
    "Kapasitas Total",
    formatNumber(stockReport.summary.totalCapacity),
    "Liter",
  ]);
  stockSheet.addRow([
    "Stock Awal",
    formatNumber(stockReport.summary.totalOpeningStock),
    "Liter",
  ]);
  stockSheet.addRow([
    "Total Unload",
    formatNumber(stockReport.summary.totalUnload),
    "Liter",
  ]);
  stockSheet.addRow([
    "Total Penjualan",
    formatNumber(stockReport.summary.totalSales),
    "Liter",
  ]);
  stockSheet.addRow([
    "Stock Akhir",
    formatNumber(stockReport.summary.totalClosingStock),
    "Liter",
  ]);
  stockSheet.addRow([
    "Total Variance",
    formatNumber(stockReport.summary.totalVariance),
    "Liter",
  ]);
  stockSheet.addRow([]);
  stockSheet.addRow(["DETAIL PER TANGKI"]);
  stockSheet.addRow([
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
  ]);

  stockReport.tanks.forEach((tank) => {
    stockSheet.addRow([
      tank.tankName,
      tank.productName,
      tank.capacity,
      tank.openingStock,
      tank.totalUnload,
      tank.totalSales,
      tank.closingStock,
      tank.totalVariance,
      tank.variancePercentage.toFixed(2),
      tank.fillPercentage.toFixed(1),
    ]);
  });

  stockSheet.addRow([
    "TOTAL",
    "",
    stockReport.summary.totalCapacity,
    stockReport.summary.totalOpeningStock,
    stockReport.summary.totalUnload,
    stockReport.summary.totalSales,
    stockReport.summary.totalClosingStock,
    stockReport.summary.totalVariance,
    "",
    "",
  ]);

  stockSheet.columns = [
    { width: 20 },
    { width: 15 },
    { width: 15 },
    { width: 15 },
    { width: 15 },
    { width: 15 },
    { width: 15 },
    { width: 15 },
    { width: 12 },
    { width: 12 },
  ];

  // ========== SHEET 3: CHART DATA (Optional) ==========
  if (chartData.length > 0) {
    const chartSheet = workbook.addWorksheet("Data Grafik");

    const productKeys = new Set<string>();
    chartData.forEach((data) => {
      Object.keys(data).forEach((key) => {
        if (key !== "date") {
          productKeys.add(key);
        }
      });
    });

    const headers = ["Tanggal"];
    const sortedKeys = Array.from(productKeys).sort();
    sortedKeys.forEach((key) => {
      const productName = key.replace("_volume", "").replace("_amount", "");
      if (key.includes("_volume")) {
        headers.push(`${productName} (Volume)`);
      } else if (key.includes("_amount")) {
        headers.push(`${productName} (Nilai)`);
      }
    });
    chartSheet.addRow(headers);

    chartData.forEach((data) => {
      const row: any[] = [formatUTCDate(new Date(data.date), "dd MMM yyyy")];
      sortedKeys.forEach((key) => {
        row.push(data[key] || 0);
      });
      chartSheet.addRow(row);
    });

    chartSheet.columns = [
      { width: 15 },
      ...sortedKeys.map(() => ({ width: 15 })),
    ];
  }

  // Save file
  const buffer = await workbook.xlsx.writeBuffer();
  const filename = `Laporan_Operasional_${gasStationName.replace(
    /\s+/g,
    "_"
  )}_${formatUTCDate(dateRange.from, "yyyyMMdd")}-${formatUTCDate(
    dateRange.to,
    "yyyyMMdd"
  )}.xlsx`;
  downloadExcelFile(buffer, filename);
}
