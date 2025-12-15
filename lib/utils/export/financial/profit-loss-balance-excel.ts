import ExcelJS from "exceljs";
import { format } from "date-fns";
import type { DateRange } from "@/components/reusable/date-picker";
import type { ProfitLossReportData } from "./profit-loss-balance-pdf";
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

export async function exportProfitLossBalanceSheetToExcel(
  profitLossReport: ProfitLossReportData,
  balanceSheetReport: any,
  stockReport: any,
  gasStationName: string,
  dateRange: DateRange & { balanceSheetDate?: Date }
) {
  const workbook = new ExcelJS.Workbook();

  // ========== SHEET 1: PROFIT LOSS REPORT ==========
  const profitLossSheet = workbook.addWorksheet("Laporan Laba Rugi");

  profitLossSheet.addRow(["LAPORAN LABA RUGI"]);
  profitLossSheet.addRow([gasStationName]);
  profitLossSheet.addRow([
    `Periode: ${formatUTCDate(dateRange.from, "dd MMM yyyy")} s/d ${formatUTCDate(
      dateRange.to,
      "dd MMM yyyy"
    )}`,
  ]);
  profitLossSheet.addRow([]);

  // Gunakan stockValues dari financial report - konsisten dengan profit-loss-table.tsx
  // HPP = Stock Awal + Pembelian - Stock Akhir
  const totalOpeningValue = (profitLossReport as any).stockValues?.totalOpeningValue ?? 0;
  const totalPurchaseValue = (profitLossReport as any).stockValues?.totalPurchaseValue ?? 0;
  const totalClosingValue = (profitLossReport as any).stockValues?.totalClosingValue ?? 0;
  const totalCOGS = totalOpeningValue + totalPurchaseValue - totalClosingValue;

  // PENDAPATAN
  profitLossSheet.addRow(["PENDAPATAN"]);
  profitLossReport.income.byProduct.forEach((product: any) => {
    profitLossSheet.addRow([
      "Penjualan " + product.productName,
      product.totalSales,
    ]);
  });
  profitLossSheet.addRow([
    "Total Pendapatan",
    profitLossReport.income.totalSales,
  ]);
  profitLossSheet.addRow([]);

  // HPP - konsisten dengan profit-loss-table.tsx
  profitLossSheet.addRow(["HARGA POKOK PENJUALAN (HPP)"]);
  profitLossSheet.addRow(["Stock Awal", totalOpeningValue]);
  profitLossSheet.addRow(["Pembelian", totalPurchaseValue]);
  profitLossSheet.addRow(["Stock Akhir", -totalClosingValue]);
  profitLossSheet.addRow(["Total HPP", totalCOGS]);
  profitLossSheet.addRow([]);

  // LABA KOTOR
  const grossProfit = profitLossReport.income.totalSales - totalCOGS;
  profitLossSheet.addRow([
    "LABA KOTOR",
    grossProfit,
  ]);
  profitLossSheet.addRow([]);

  // BEBAN OPERASIONAL
  if (profitLossReport.expenses) {
    profitLossSheet.addRow(["BEBAN OPERASIONAL"]);
    profitLossReport.expenses.byCategory.forEach(
      (category: { category: string; total: number }) => {
        profitLossSheet.addRow([category.category, category.total]);
      }
    );
    profitLossSheet.addRow([
      "Total Beban Operasional",
      profitLossReport.expenses.totalExpenses,
    ]);
    profitLossSheet.addRow([]);
  }

  // LABA OPERASIONAL - konsisten dengan profit-loss-table.tsx
  const operatingProfit = grossProfit - (profitLossReport.expenses?.totalExpenses || 0);
  profitLossSheet.addRow([
    "LABA OPERASIONAL",
    operatingProfit,
  ]);
  profitLossSheet.addRow([]);

  // PENDAPATAN/BEBAN LAIN - konsisten dengan profit-loss-table.tsx
  const otherIncomeExpense = (profitLossReport as any).otherIncomeExpense;
  if (otherIncomeExpense) {
    profitLossSheet.addRow(["PENDAPATAN/BEBAN LAIN"]);
    
    // Tampilkan semua pendapatan REVENUE (selain penjualan produk)
    if (otherIncomeExpense.revenueByCategory) {
      otherIncomeExpense.revenueByCategory.forEach((revenue: any) => {
        profitLossSheet.addRow([revenue.category, revenue.total]);
      });
    }
    
    // Tampilkan beban penyesuaian harga
    if (otherIncomeExpense.adjustmentExpense > 0) {
      profitLossSheet.addRow([
        "Beban Penyesuaian Harga",
        -otherIncomeExpense.adjustmentExpense,
      ]);
    }
    
    profitLossSheet.addRow([
      "Total Pendapatan/Beban Lain",
      otherIncomeExpense.total || 0,
    ]);
    profitLossSheet.addRow([]);
  }

  // LABA BERSIH - konsisten dengan profit-loss-table.tsx
  const netProfit = operatingProfit + (otherIncomeExpense?.total || 0);
  profitLossSheet.addRow(["LABA BERSIH", netProfit]);

  profitLossSheet.columns = [{ width: 40 }, { width: 20 }];

  // ========== SHEET 2: BALANCE SHEET ==========
  const balanceSheet = workbook.addWorksheet("Neraca");

  balanceSheet.addRow(["NERACA"]);
  balanceSheet.addRow([gasStationName]);
  // Balance sheet menggunakan balanceSheetDate (endDate) saja, bukan range
  const balanceSheetDate = dateRange.balanceSheetDate || dateRange.to;
  balanceSheet.addRow([
    `Per tanggal: ${format(balanceSheetDate, "dd MMM yyyy")}`,
  ]);
  balanceSheet.addRow([]);

  const balanceSheetData = balanceSheetReport.balanceSheet || {};
  const assetsArray = balanceSheetData.assets || [];
  const liabilitiesArray = balanceSheetData.liabilities || [];
  const equityArray = balanceSheetData.equity || [];
  const netIncome = balanceSheetData.netIncome || 0;
  const totalAssets = balanceSheetData.totalAssets || 0;
  const totalLiabilities = balanceSheetData.totalLiabilities || 0;
  const totalEquity = balanceSheetData.totalEquity || 0;
  const totalLiabilitiesEquity = balanceSheetData.totalLiabilitiesEquity || 0;

  // ASET
  balanceSheet.addRow(["ASET"]);
  balanceSheet.addRow(["Aset Lancar"]);
  if (assetsArray.length > 0) {
    assetsArray.forEach((asset: any) => {
      balanceSheet.addRow([asset.name, asset.balance]);
    });
  } else {
    balanceSheet.addRow(["Kas", 0]);
    balanceSheet.addRow(["Bank", 0]);
    balanceSheet.addRow(["Piutang", 0]);
  }
  const totalCurrentAssets =
    assetsArray.length > 0
      ? assetsArray.reduce((sum: number, a: any) => sum + a.balance, 0)
      : 0;
  balanceSheet.addRow(["Total Aset Lancar", totalCurrentAssets]);
  balanceSheet.addRow(["TOTAL ASET", totalAssets]);
  balanceSheet.addRow([]);

  // KEWAJIBAN & EKUITAS
  balanceSheet.addRow(["KEWAJIBAN & EKUITAS"]);
  balanceSheet.addRow(["Kewajiban Lancar"]);
  if (liabilitiesArray.length > 0) {
    liabilitiesArray.forEach((liability: any) => {
      balanceSheet.addRow([liability.name, liability.balance]);
    });
  } else {
    balanceSheet.addRow(["Utang Usaha", 0]);
    balanceSheet.addRow(["Hutang Coupon", 0]);
  }
  balanceSheet.addRow(["Total Kewajiban", totalLiabilities]);
  balanceSheet.addRow([]);
  balanceSheet.addRow(["Ekuitas"]);
  // Realtime Profit/Loss sebagai net income
  balanceSheet.addRow(["Laba/Rugi Realtime", netIncome]);
  // Equity lainnya
  if (equityArray.length > 0) {
    equityArray.forEach((eq: any) => {
      if (eq.name !== "Realtime Profit/Loss") {
        balanceSheet.addRow([eq.name, eq.balance]);
      }
    });
  }
  balanceSheet.addRow(["Total Ekuitas", totalEquity]);
  balanceSheet.addRow([]);
  balanceSheet.addRow(["TOTAL KEWAJIBAN & EKUITAS", totalLiabilitiesEquity]);

  balanceSheet.columns = [{ width: 40 }, { width: 20 }];

  // Save file
  const buffer = await workbook.xlsx.writeBuffer();
  const filename = `Laporan_Laba_Rugi_Neraca_${gasStationName.replace(
    /\s+/g,
    "_"
  )}_${format(dateRange.from, "yyyyMMdd")}-${format(
    dateRange.to,
    "yyyyMMdd"
  )}.xlsx`;
  downloadExcelFile(buffer, filename);
}
