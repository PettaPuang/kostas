import ExcelJS from "exceljs";
import { format } from "date-fns";
import type { DateRange } from "@/components/reusable/date-picker";
import type { FinancialReportData } from "./income-expense-pdf";
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

type ExpenseReportData = {
  byCategory: Array<{
    category: string;
    total: number;
    items: Array<{
      id: string;
      category: string;
      transactionDescription: string;
      entryDescription: string | null;
      amount: number;
      date: Date;
    }>;
  }>;
  totalExpenses: number;
};

export async function exportIncomeExpenseToExcel(
  incomeReport: FinancialReportData,
  expenseReport: ExpenseReportData | null,
  gasStationName: string,
  dateRange: DateRange,
  incomeData?: any // Data dari Income API untuk mendapatkan sellingPrice yang benar
) {
  const workbook = new ExcelJS.Workbook();

  // ========== SHEET 1: INCOME REPORT ==========
  const incomeSheet = workbook.addWorksheet("Rincian Pemasukan");

  incomeSheet.addRow(["RINCIAN PEMASUKAN"]);
  incomeSheet.addRow([gasStationName]);
  incomeSheet.addRow([
    `Periode: ${formatUTCDate(
      dateRange.from,
      "dd MMM yyyy"
    )} s/d ${formatUTCDate(dateRange.to, "dd MMM yyyy")}`,
  ]);
  incomeSheet.addRow([]);
  incomeSheet.addRow([
    "Produk",
    "Sales (L)",
    "Margin (Rp)",
    "Pendapatan (Rp)",
    "Total Sales (Rp)",
    "Total Modal (Rp)",
    "Pump Test (Rp)",
    "Susut (Rp)",
    "Total HPP (Rp)",
    "Laba Kotor (Rp)",
  ]);

  // Gunakan stockValues dari financial report untuk konsistensi
  const stockValuesMap = new Map<
    string,
    {
      pumpTestValue: number;
      shrinkageValue: number;
      pumpTestVolume: number;
      shrinkageVolume: number;
    }
  >();

  if (incomeReport.stockValues?.byProduct) {
    incomeReport.stockValues.byProduct.forEach((sv: any) => {
      stockValuesMap.set(sv.productId, {
        pumpTestValue: sv.pumpTestValue || 0,
        shrinkageValue: sv.shrinkageValue || 0,
        pumpTestVolume: sv.pumpTestVolume || 0,
        shrinkageVolume: sv.shrinkageVolume || 0,
      });
    });
  }

  // Map sellingPrice dan purchasePrice dari incomeData untuk konsistensi dengan income-table
  const incomeProductMap = new Map<
    string,
    {
      sellingPrice: number;
      purchasePrice: number;
      volume: number;
      hasBreakdown: boolean;
      breakdowns?: Array<{
        volume: number;
        sellingPrice: number;
        purchasePrice: number;
      }>;
    }
  >();

  if (incomeData?.byProduct) {
    incomeData.byProduct.forEach((p: any) => {
      const vol =
        p.volumeWithPriceChange > 0
          ? p.volumeWithPriceChange
          : p.volumeWithoutPriceChange;

      incomeProductMap.set(p.productId, {
        sellingPrice: p.sellingPrice || 0,
        purchasePrice: p.purchasePrice || 0,
        volume: vol,
        hasBreakdown: p.hasBreakdown || false,
        breakdowns: p.breakdowns || [],
      });
    });
  }

  incomeReport.income.byProduct.forEach(
    (product: {
      productId: string;
      productName: string;
      totalVolume: number;
      totalSales: number;
      purchasePrice: number;
      totalCost: number;
      grossProfit: number;
      totalVariance: number;
    }) => {
      // Ambil data dari incomeData jika tersedia
      const incomeProduct = incomeProductMap.get(product.productId);

      // Gunakan sellingPrice dan purchasePrice dari incomeData (konsisten dengan income-table)
      const sellingPrice =
        incomeProduct?.sellingPrice ||
        (product.totalVolume > 0
          ? product.totalSales / product.totalVolume
          : 0);
      const purchasePrice =
        incomeProduct?.purchasePrice || product.purchasePrice;

      // Margin = sellingPrice - purchasePrice (konsisten dengan income-table)
      const margin =
        sellingPrice && purchasePrice && purchasePrice > 0
          ? sellingPrice - purchasePrice
          : 0;

      // Volume dari incomeData jika tersedia
      const volume = incomeProduct?.volume || product.totalVolume;
      const pendapatan = volume * margin;

      // Ambil pump test dan shrinkage dari stockValues
      const stockValue = stockValuesMap.get(product.productId) || {
        pumpTestValue: 0,
        shrinkageValue: 0,
        pumpTestVolume: 0,
        shrinkageVolume: 0,
      };

      // Total Modal = purchasePrice * volume (konsisten dengan income-table)
      // Jika ada breakdown, hitung dari breakdowns
      let totalModal = 0;
      if (incomeProduct?.hasBreakdown && incomeProduct.breakdowns) {
        totalModal = incomeProduct.breakdowns.reduce((sum: number, b: any) => {
          return (
            sum +
            (b.purchasePrice && b.purchasePrice > 0 && b.volume > 0
              ? b.volume * b.purchasePrice
              : 0)
          );
        }, 0);
      } else {
        totalModal =
          purchasePrice && purchasePrice > 0 && volume > 0
            ? volume * purchasePrice
            : 0;
      }

      const pumpTestValue = stockValue.pumpTestValue;
      const shrinkageValue = stockValue.shrinkageValue;

      // Total HPP = Modal + Pump Test + Susut (konsisten dengan income-table)
      const totalHPP = totalModal + pumpTestValue + shrinkageValue;

      // Laba Kotor = Total Sales - Total HPP
      const labaKotor = product.totalSales - totalHPP;

      incomeSheet.addRow([
        product.productName,
        volume,
        margin,
        pendapatan,
        product.totalSales,
        totalModal,
        pumpTestValue,
        shrinkageValue,
        totalHPP,
        labaKotor,
      ]);
    }
  );

  // Calculate totals - gunakan stockValues total
  const totalPumpTestValue = incomeReport.stockValues?.totalPumpTestValue || 0;
  const totalShrinkageValue =
    incomeReport.stockValues?.totalShrinkageValue || 0;

  // Hitung total modal dari incomeData (konsisten dengan income-table)
  let totalModal = 0;
  let totalVolume = 0;
  let totalPendapatan = 0;

  if (incomeData?.byProduct) {
    incomeData.byProduct.forEach((p: any) => {
      const vol =
        p.volumeWithPriceChange > 0
          ? p.volumeWithPriceChange
          : p.volumeWithoutPriceChange;
      totalVolume += vol;

      // Hitung modal dari breakdowns atau langsung
      if (p.hasBreakdown && p.breakdowns) {
        const modal = p.breakdowns.reduce((sum: number, b: any) => {
          return (
            sum +
            (b.purchasePrice && b.purchasePrice > 0 && b.volume > 0
              ? b.volume * b.purchasePrice
              : 0)
          );
        }, 0);
        totalModal += modal;

        // Hitung pendapatan dari breakdowns
        const pendapatan = p.breakdowns.reduce((sum: number, b: any) => {
          const margin =
            b.sellingPrice && b.purchasePrice
              ? b.sellingPrice - b.purchasePrice
              : 0;
          return sum + (b.volume > 0 ? b.volume * margin : 0);
        }, 0);
        totalPendapatan += pendapatan;
      } else {
        const sellingPrice = p.sellingPrice || 0;
        const purchasePrice = p.purchasePrice || 0;
        const margin =
          sellingPrice && purchasePrice && purchasePrice > 0
            ? sellingPrice - purchasePrice
            : 0;
        totalModal +=
          purchasePrice && purchasePrice > 0 && vol > 0
            ? vol * purchasePrice
            : 0;
        totalPendapatan += vol * margin;
      }
    });
  } else {
    // Fallback jika incomeData tidak tersedia
    incomeReport.income.byProduct.forEach((p: any) => {
      totalVolume += p.totalVolume;
      const sellingPrice = p.totalVolume > 0 ? p.totalSales / p.totalVolume : 0;
      const margin =
        sellingPrice && p.purchasePrice && p.purchasePrice > 0
          ? sellingPrice - p.purchasePrice
          : 0;
      totalModal +=
        p.purchasePrice && p.purchasePrice > 0 && p.totalVolume > 0
          ? p.totalVolume * p.purchasePrice
          : 0;
      totalPendapatan += p.totalVolume * margin;
    });
  }

  const totalHPP = totalModal + totalPumpTestValue + totalShrinkageValue;
  const totalLabaKotor = incomeReport.income.totalSales - totalHPP;

  incomeSheet.addRow([
    "TOTAL",
    totalVolume,
    "",
    totalPendapatan,
    incomeReport.income.totalSales,
    totalModal,
    totalPumpTestValue,
    totalShrinkageValue,
    totalHPP,
    totalLabaKotor,
  ]);

  incomeSheet.columns = [
    { width: 20 },
    { width: 15 },
    { width: 18 },
    { width: 18 },
    { width: 18 },
    { width: 18 },
    { width: 18 },
    { width: 18 },
    { width: 18 },
    { width: 18 },
  ];

  // ========== SHEET 2: EXPENSE REPORT ==========
  if (expenseReport && expenseReport.byCategory.length > 0) {
    const expenseSheet = workbook.addWorksheet("Rincian Pengeluaran");

    expenseSheet.addRow(["RINCIAN PENGELUARAN"]);
    expenseSheet.addRow([gasStationName]);
    expenseSheet.addRow([
      `Periode: ${formatUTCDate(
        dateRange.from,
        "dd MMM yyyy"
      )} s/d ${formatUTCDate(dateRange.to, "dd MMM yyyy")}`,
    ]);
    expenseSheet.addRow([]);
    expenseSheet.addRow(["Kategori", "Deskripsi", "Jumlah (Rp)"]);

    expenseReport.byCategory.forEach((categoryData) => {
      // Category header row
      expenseSheet.addRow([categoryData.category, "", categoryData.total]);

      // Category items - kolom pertama adalah tanggal, bukan kategori
      categoryData.items.forEach((item) => {
        expenseSheet.addRow([
          formatUTCDate(new Date(item.date), "dd MMM yyyy"),
          item.transactionDescription,
          item.amount,
        ]);
      });
    });

    // Add total row - format sesuai dengan expense-table.tsx
    expenseSheet.addRow([
      "",
      "TOTAL PENGELUARAN:",
      expenseReport.totalExpenses,
    ]);

    expenseSheet.columns = [{ width: 20 }, { width: 40 }, { width: 18 }];
  }

  // Save file
  const buffer = await workbook.xlsx.writeBuffer();
  const filename = `Rincian_Pemasukan_Pengeluaran_${gasStationName.replace(
    /\s+/g,
    "_"
  )}_${formatUTCDate(dateRange.from, "yyyyMMdd")}-${formatUTCDate(
    dateRange.to,
    "yyyyMMdd"
  )}.xlsx`;
  downloadExcelFile(buffer, filename);
}
