import jsPDF from "jspdf";
import { format } from "date-fns";
import { formatCurrency } from "../../format-client";
import type { DateRange } from "@/components/reusable/date-picker";
import {
  addBackgroundLogo,
  addPDFHeader,
  addPDFFooter,
} from "../shared/pdf-helper";

export type ProfitLossReportData = {
  income: {
    byProduct: Array<{
      productId: string;
      productName: string;
      totalSales: number;
      totalVolume: number;
      grossProfit: number;
      varianceValue: number;
    }>;
    totalSales: number;
    totalVarianceValue: number;
  };
  expenses?: {
    byCategory: Array<{
      category: string;
      total: number;
    }>;
    totalExpenses: number;
  };
  stockValues?: {
    totalOpeningValue: number;
    totalPurchaseValue: number;
    totalClosingValue: number;
  };
  otherIncomeExpense?: {
    revenueByCategory?: Array<{
      category: string;
      total: number;
    }>;
    adjustmentExpense?: number;
    total?: number;
  };
};

export async function exportProfitLossBalanceSheetToPDF(
  profitLossReport: ProfitLossReportData,
  balanceSheetReport: any,
  stockReport: any,
  gasStationName: string,
  dateRange: DateRange & { balanceSheetDate?: Date },
  userRole: string,
  userName?: string
) {
  // ========== PAGE 1: PROFIT LOSS REPORT ==========
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;

  // Add background logo
  await addBackgroundLogo(doc);

  // Add header with logo, tagline, and title
  let yPosition = await addPDFHeader(
    doc,
    "LAPORAN LABA RUGI",
    gasStationName,
    dateRange
  );

  // Gunakan stockValues dari financial report - konsisten dengan profit-loss-table.tsx
  // HPP = Stock Awal + Pembelian - Stock Akhir
  const totalOpeningValue = (profitLossReport as any).stockValues?.totalOpeningValue ?? 0;
  const totalPurchaseValue = (profitLossReport as any).stockValues?.totalPurchaseValue ?? 0;
  const totalClosingValue = (profitLossReport as any).stockValues?.totalClosingValue ?? 0;
  const totalCOGS = totalOpeningValue + totalPurchaseValue - totalClosingValue;

  // PENDAPATAN
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("PENDAPATAN", 14, yPosition);
  yPosition += 7;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);

  profitLossReport.income.byProduct.forEach((product: any) => {
    doc.text(`Penjualan ${product.productName}:`, 14, yPosition);
    doc.text(formatCurrency(product.totalSales), 120, yPosition, {
      align: "right",
    });
    yPosition += 6;
  });

  doc.setFont("helvetica", "bold");
  doc.text("Total Pendapatan:", 14, yPosition);
  doc.text(formatCurrency(profitLossReport.income.totalSales), 120, yPosition, {
    align: "right",
  });
  yPosition += 10;

  // HPP - konsisten dengan profit-loss-table.tsx
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("HARGA POKOK PENJUALAN (HPP)", 14, yPosition);
  yPosition += 7;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);

  doc.text("Stock Awal:", 20, yPosition);
  doc.text(formatCurrency(totalOpeningValue), 120, yPosition, {
    align: "right",
  });
  yPosition += 6;

  doc.text("Pembelian:", 20, yPosition);
  doc.text(formatCurrency(totalPurchaseValue), 120, yPosition, {
    align: "right",
  });
  yPosition += 6;

  doc.text("Stock Akhir:", 20, yPosition);
  doc.text(`(${formatCurrency(totalClosingValue)})`, 120, yPosition, {
    align: "right",
  });
  yPosition += 6;

  doc.setFont("helvetica", "bold");
  doc.text("Total HPP:", 14, yPosition);
  doc.text(formatCurrency(totalCOGS), 120, yPosition, { align: "right" });
  yPosition += 10;

  // LABA KOTOR
  const grossProfit = profitLossReport.income.totalSales - totalCOGS;
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("LABA KOTOR:", 14, yPosition);
  doc.text(formatCurrency(grossProfit), 120, yPosition, { align: "right" });
  yPosition += 10;

  // BEBAN OPERASIONAL
  if (profitLossReport.expenses) {
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("BEBAN OPERASIONAL", 14, yPosition);
    yPosition += 7;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);

    profitLossReport.expenses.byCategory.forEach((category) => {
      doc.text(`${category.category}:`, 20, yPosition);
      doc.text(formatCurrency(category.total), 120, yPosition, {
        align: "right",
      });
      yPosition += 6;
    });

    doc.setFont("helvetica", "bold");
    doc.text("Total Beban Operasional:", 14, yPosition);
    doc.text(
      formatCurrency(profitLossReport.expenses.totalExpenses),
      120,
      yPosition,
      {
        align: "right",
      }
    );
    yPosition += 10;
  }

  // LABA OPERASIONAL - konsisten dengan profit-loss-table.tsx
  const operatingProfit = grossProfit - (profitLossReport.expenses?.totalExpenses || 0);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("LABA OPERASIONAL:", 14, yPosition);
  doc.text(formatCurrency(operatingProfit), 120, yPosition, { align: "right" });
  yPosition += 10;

  // PENDAPATAN/BEBAN LAIN - konsisten dengan profit-loss-table.tsx
  const otherIncomeExpense = (profitLossReport as any).otherIncomeExpense;
  if (otherIncomeExpense) {
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("PENDAPATAN/BEBAN LAIN", 14, yPosition);
    yPosition += 7;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);

    // Tampilkan semua pendapatan REVENUE (selain penjualan produk)
    if (otherIncomeExpense.revenueByCategory) {
      otherIncomeExpense.revenueByCategory.forEach((revenue: any) => {
        doc.text(`${revenue.category}:`, 20, yPosition);
        doc.text(formatCurrency(revenue.total), 120, yPosition, {
          align: "right",
        });
        yPosition += 6;
      });
    }

    // Tampilkan beban penyesuaian harga
    if (otherIncomeExpense.adjustmentExpense > 0) {
      doc.text("Beban Penyesuaian Harga:", 20, yPosition);
      doc.text(`(${formatCurrency(otherIncomeExpense.adjustmentExpense)})`, 120, yPosition, {
        align: "right",
      });
      yPosition += 6;
    }

    doc.setFont("helvetica", "bold");
    doc.text("Total Pendapatan/Beban Lain:", 14, yPosition);
    doc.text(formatCurrency(otherIncomeExpense.total || 0), 120, yPosition, {
      align: "right",
    });
    yPosition += 10;
  }

  // LABA BERSIH - konsisten dengan profit-loss-table.tsx
  const netProfit = operatingProfit + (otherIncomeExpense?.total || 0);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("LABA BERSIH:", 14, yPosition);
  doc.text(formatCurrency(netProfit), 120, yPosition, { align: "right" });

  // Footer with user role and datetime
  addPDFFooter(doc, userRole, userName);

  // ========== PAGE 2: BALANCE SHEET ==========
  doc.addPage();
  await addBackgroundLogo(doc);

  // Balance sheet menggunakan balanceSheetDate (endDate) saja, bukan range
  const balanceSheetDate = dateRange.balanceSheetDate || dateRange.to;
  yPosition = await addPDFHeader(
    doc,
    "NERACA",
    gasStationName,
    { from: balanceSheetDate, to: balanceSheetDate } // Hanya endDate untuk balance sheet
  );

  // Transform data dari service format ke PDF format
  const balanceSheet = balanceSheetReport.balanceSheet || {};
  const assetsArray = balanceSheet.assets || [];
  const liabilitiesArray = balanceSheet.liabilities || [];
  const equityArray = balanceSheet.equity || [];
  const netIncome = balanceSheet.netIncome || 0;
  const totalAssets = balanceSheet.totalAssets || 0;
  const totalLiabilities = balanceSheet.totalLiabilities || 0;
  const totalEquity = balanceSheet.totalEquity || 0;
  const totalLiabilitiesEquity = balanceSheet.totalLiabilitiesEquity || 0;

  // Transform assets array to object
  const assets = {
    cash: assetsArray.find((a: any) => a.name === "Kas")?.balance || 0,
    bank: assetsArray
      .filter((a: any) => a.name.startsWith("Bank"))
      .reduce((sum: number, a: any) => sum + a.balance, 0),
    receivables: assetsArray
      .filter((a: any) => a.name.includes("Piutang"))
      .reduce((sum: number, a: any) => sum + a.balance, 0),
    total: totalAssets,
  };

  // Transform liabilities array to object
  const liabilities = {
    payables: liabilitiesArray
      .filter((l: any) => l.name.includes("Utang") || l.name.includes("Hutang"))
      .reduce((sum: number, l: any) => sum + l.balance, 0),
    couponLiability:
      liabilitiesArray.find((l: any) => l.name.includes("Coupon"))?.balance ||
      0,
    total: totalLiabilities,
  };

  // Transform equity array to object
  const equity = {
    realtimeProfitLoss: netIncome,
    otherEquity: equityArray.reduce(
      (sum: number, e: any) => sum + e.balance,
      0
    ),
    total: totalEquity,
  };

  // ASET
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("ASET", 14, yPosition);
  yPosition += 7;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);

  doc.setFont("helvetica", "bold");
  doc.text("Aset Lancar", 20, yPosition);
  yPosition += 6;
  doc.setFont("helvetica", "normal");

  // Display all asset items
  if (assetsArray.length > 0) {
    assetsArray.forEach((asset: any) => {
      doc.text(`${asset.name}:`, 25, yPosition);
      doc.text(formatCurrency(asset.balance), 120, yPosition, {
        align: "right",
      });
      yPosition += 6;
    });
  } else {
    doc.text("Kas:", 25, yPosition);
    doc.text(formatCurrency(assets.cash), 120, yPosition, { align: "right" });
    yPosition += 6;

    doc.text("Bank:", 25, yPosition);
    doc.text(formatCurrency(assets.bank), 120, yPosition, { align: "right" });
    yPosition += 6;

    doc.text("Piutang:", 25, yPosition);
    doc.text(formatCurrency(assets.receivables), 120, yPosition, {
      align: "right",
    });
    yPosition += 6;
  }

  doc.setFont("helvetica", "bold");
  doc.text("Total Aset Lancar:", 20, yPosition);
  const totalCurrentAssets =
    assetsArray.length > 0
      ? assetsArray.reduce((sum: number, a: any) => sum + a.balance, 0)
      : assets.cash + assets.bank + assets.receivables;
  doc.text(formatCurrency(totalCurrentAssets), 120, yPosition, {
    align: "right",
  });
  yPosition += 8;

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("TOTAL ASET:", 14, yPosition);
  doc.text(formatCurrency(assets.total), 120, yPosition, { align: "right" });
  yPosition += 15;

  // KEWAJIBAN & EKUITAS
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("KEWAJIBAN & EKUITAS", 14, yPosition);
  yPosition += 7;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);

  doc.setFont("helvetica", "bold");
  doc.text("Kewajiban Lancar", 20, yPosition);
  yPosition += 6;
  doc.setFont("helvetica", "normal");

  // Display all liability items
  if (liabilitiesArray.length > 0) {
    liabilitiesArray.forEach((liability: any) => {
      doc.text(`${liability.name}:`, 25, yPosition);
      doc.text(formatCurrency(liability.balance), 120, yPosition, {
        align: "right",
      });
      yPosition += 6;
    });
  } else {
    doc.text("Utang Usaha:", 25, yPosition);
    doc.text(formatCurrency(liabilities.payables), 120, yPosition, {
      align: "right",
    });
    yPosition += 6;

    doc.text("Hutang Coupon:", 25, yPosition);
    doc.text(formatCurrency(liabilities.couponLiability), 120, yPosition, {
      align: "right",
    });
    yPosition += 6;
  }

  doc.setFont("helvetica", "bold");
  doc.text("Total Kewajiban:", 20, yPosition);
  const totalCurrentLiabilities =
    liabilitiesArray.length > 0
      ? liabilitiesArray.reduce((sum: number, l: any) => sum + l.balance, 0)
      : liabilities.payables + liabilities.couponLiability;
  doc.text(formatCurrency(totalCurrentLiabilities), 120, yPosition, {
    align: "right",
  });
  yPosition += 8;

  doc.setFont("helvetica", "bold");
  doc.text("Ekuitas", 20, yPosition);
  yPosition += 6;
  doc.setFont("helvetica", "normal");

  // Realtime Profit/Loss sebagai net income
  doc.text("Realtime Profit/Loss:", 25, yPosition);
  doc.text(formatCurrency(equity.realtimeProfitLoss), 120, yPosition, {
    align: "right",
  });
  yPosition += 6;

  // Display all equity items (Modal Awal, Laba Ditahan, dll)
  if (equityArray.length > 0) {
    equityArray.forEach((eq: any) => {
      doc.text(`${eq.name}:`, 25, yPosition);
      doc.text(formatCurrency(eq.balance), 120, yPosition, { align: "right" });
      yPosition += 6;
    });
  }

  doc.setFont("helvetica", "bold");
  doc.text("Total Ekuitas:", 20, yPosition);
  doc.text(formatCurrency(equity.total), 120, yPosition, { align: "right" });
  yPosition += 8;

  doc.setFontSize(11);
  doc.text("TOTAL KEWAJIBAN & EKUITAS:", 14, yPosition);
  doc.text(formatCurrency(totalLiabilitiesEquity), 120, yPosition, {
    align: "right",
  });

  // Footer with user role and datetime
  addPDFFooter(doc, userRole, userName);

  // Format UTC date for filename
  const formatUTCDate = (date: Date, formatStr: string): string => {
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth();
    const day = date.getUTCDate();
    const localDate = new Date(year, month, day);
    return format(localDate, formatStr);
  };

  // Save
  // Profit Loss: range, Balance Sheet: endDate saja
  const filename = `Laporan_Laba_Rugi_${formatUTCDate(
    dateRange.from,
    "yyyyMMdd"
  )}-${formatUTCDate(dateRange.to, "yyyyMMdd")}_Neraca_${formatUTCDate(
    dateRange.to,
    "yyyyMMdd"
  )}_${gasStationName.replace(/\s+/g, "_")}.pdf`;
  doc.save(filename);
}
