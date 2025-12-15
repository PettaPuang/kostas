import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { formatNumber, formatCurrency } from "../../format-client";
import type { DateRange } from "@/components/reusable/date-picker";
import {
  addBackgroundLogo,
  addPDFHeader,
  addPDFFooter,
} from "../shared/pdf-helper";

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

export type FinancialReportData = {
  income: {
    byProduct: Array<{
      productId: string;
      productName: string;
      totalVolume: number;
      totalSales: number;
      purchasePrice: number;
      totalCost: number;
      grossProfit: number;
      totalVariance: number;
      variancePercentage?: number;
    }>;
    totalSales: number;
    totalCost: number;
    totalGrossProfit: number;
    totalVariance: number;
  };
  stockValues?: {
    byProduct?: Array<{
      productId: string;
      pumpTestValue?: number;
      pumpTestVolume?: number;
      shrinkageValue?: number;
      shrinkageVolume?: number;
    }>;
    totalPumpTestValue?: number;
    totalShrinkageValue?: number;
  };
};

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

export async function exportIncomeExpenseToPDF(
  incomeReport: FinancialReportData,
  expenseReport: ExpenseReportData | null,
  gasStationName: string,
  dateRange: DateRange,
  userRole: string,
  userName?: string,
  incomeData?: any // Data dari Income API untuk mendapatkan sellingPrice yang benar
) {
  const doc = new jsPDF("landscape", "mm", "a4");
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;

  // Add background logo
  await addBackgroundLogo(doc);

  // ========== PAGE 1: INCOME REPORT ==========
  let yPosition = await addPDFHeader(
    doc,
    "RINCIAN PEMASUKAN",
    gasStationName,
    dateRange
  );

  // Table
  const financialIncomeData = incomeReport.income || {};
  const byProduct = financialIncomeData.byProduct || [];

  // Gunakan stockValues dari financial report untuk konsistensi
  const stockValuesMap = new Map<string, { 
    pumpTestValue: number; 
    shrinkageValue: number;
    pumpTestVolume: number;
    shrinkageVolume: number;
  }>();
  
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
  const incomeProductMap = new Map<string, {
    sellingPrice: number;
    purchasePrice: number;
    volume: number;
    hasBreakdown: boolean;
    breakdowns?: Array<{
      volume: number;
      sellingPrice: number;
      purchasePrice: number;
    }>;
  }>();
  
  if (incomeData?.byProduct) {
    incomeData.byProduct.forEach((p: any) => {
      const vol = p.volumeWithPriceChange > 0 
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

  const tableData = byProduct.map((product: any) => {
    // Ambil data dari incomeData jika tersedia
    const incomeProduct = incomeProductMap.get(product.productId);
    
    // Gunakan sellingPrice dan purchasePrice dari incomeData (konsisten dengan income-table)
    const sellingPrice = incomeProduct?.sellingPrice || 
      (product.totalVolume > 0 ? product.totalSales / product.totalVolume : 0);
    const purchasePrice = incomeProduct?.purchasePrice || product.purchasePrice;
    
    // Margin = sellingPrice - purchasePrice (konsisten dengan income-table)
    const margin = sellingPrice && purchasePrice && purchasePrice > 0
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
      shrinkageVolume: 0
    };
    
    // Total Modal = purchasePrice * volume (konsisten dengan income-table)
    // Jika ada breakdown, hitung dari breakdowns
    let totalModal = 0;
    if (incomeProduct?.hasBreakdown && incomeProduct.breakdowns) {
      totalModal = incomeProduct.breakdowns.reduce((sum: number, b: any) => {
        return sum + (b.purchasePrice && b.purchasePrice > 0 && b.volume > 0
          ? b.volume * b.purchasePrice
          : 0);
      }, 0);
    } else {
      totalModal = purchasePrice && purchasePrice > 0 && volume > 0
        ? volume * purchasePrice
        : 0;
    }
    
    const pumpTestValue = stockValue.pumpTestValue;
    const shrinkageValue = stockValue.shrinkageValue;
    
    // Total HPP = Modal + Pump Test + Susut (konsisten dengan income-table)
    const totalHPP = totalModal + pumpTestValue + shrinkageValue;
    
    // Laba Kotor = Total Sales - Total HPP
    const labaKotor = product.totalSales - totalHPP;

    return [
      product.productName || "",
      formatNumber(volume),
      formatCurrency(margin),
      formatCurrency(pendapatan),
      formatCurrency(product.totalSales || 0),
      formatCurrency(totalModal),
      formatCurrency(pumpTestValue),
      formatCurrency(shrinkageValue),
      formatCurrency(totalHPP),
      formatCurrency(labaKotor),
    ];
  });

  // Calculate totals - gunakan stockValues total
  const totalPumpTestValue = incomeReport.stockValues?.totalPumpTestValue || 0;
  const totalShrinkageValue = incomeReport.stockValues?.totalShrinkageValue || 0;
  
  // Hitung total modal dari incomeData (konsisten dengan income-table)
  let totalModal = 0;
  let totalVolume = 0;
  let totalPendapatan = 0;
  
  if (incomeData?.byProduct) {
    incomeData.byProduct.forEach((p: any) => {
      const vol = p.volumeWithPriceChange > 0 
        ? p.volumeWithPriceChange 
        : p.volumeWithoutPriceChange;
      totalVolume += vol;
      
      // Hitung modal dari breakdowns atau langsung
      if (p.hasBreakdown && p.breakdowns) {
        const modal = p.breakdowns.reduce((sum: number, b: any) => {
          return sum + (b.purchasePrice && b.purchasePrice > 0 && b.volume > 0
            ? b.volume * b.purchasePrice
            : 0);
        }, 0);
        totalModal += modal;
        
        // Hitung pendapatan dari breakdowns
        const pendapatan = p.breakdowns.reduce((sum: number, b: any) => {
          const margin = (b.sellingPrice && b.purchasePrice)
            ? b.sellingPrice - b.purchasePrice
            : 0;
          return sum + (b.volume > 0 ? b.volume * margin : 0);
        }, 0);
        totalPendapatan += pendapatan;
      } else {
        const sellingPrice = p.sellingPrice || 0;
        const purchasePrice = p.purchasePrice || 0;
        const margin = sellingPrice && purchasePrice && purchasePrice > 0
          ? sellingPrice - purchasePrice
          : 0;
        totalModal += purchasePrice && purchasePrice > 0 && vol > 0
          ? vol * purchasePrice
          : 0;
        totalPendapatan += vol * margin;
      }
    });
  } else {
    // Fallback jika incomeData tidak tersedia
    byProduct.forEach((p: any) => {
      totalVolume += p.totalVolume || 0;
      const sellingPrice = p.totalVolume > 0 ? p.totalSales / p.totalVolume : 0;
      const margin = sellingPrice && p.purchasePrice && p.purchasePrice > 0
        ? sellingPrice - p.purchasePrice
        : 0;
      totalModal += p.purchasePrice && p.purchasePrice > 0 && p.totalVolume > 0
        ? p.totalVolume * p.purchasePrice
        : 0;
      totalPendapatan += (p.totalVolume || 0) * margin;
    });
  }
  
  const totalHPP = totalModal + totalPumpTestValue + totalShrinkageValue;
  const totalLabaKotor = financialIncomeData.totalSales - totalHPP;

  // Add total row
  tableData.push([
    "TOTAL",
    formatNumber(totalVolume),
    "",
    formatCurrency(totalPendapatan),
    formatCurrency(financialIncomeData.totalSales || 0),
    formatCurrency(totalModal),
    formatCurrency(totalPumpTestValue),
    formatCurrency(totalShrinkageValue),
    formatCurrency(totalHPP),
    formatCurrency(totalLabaKotor),
  ]);

  autoTable(doc, {
    startY: yPosition,
    head: [
      [
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
      ],
    ],
    body: tableData,
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
      1: { halign: "right" },
      2: { halign: "right" },
      3: { halign: "right" },
      4: { halign: "right" },
      5: { halign: "right" },
      6: { halign: "right" },
      7: { halign: "right" },
      8: { halign: "right" },
      9: { halign: "right" },
      10: { halign: "right" },
    },
    margin: { left: 14, right: 14 },
  });

  // Footer for income report page
  addPDFFooter(doc, userRole, userName);

  // ========== PAGE 2: EXPENSE REPORT ==========
  if (expenseReport && expenseReport.byCategory.length > 0) {
    doc.addPage("landscape");
    await addBackgroundLogo(doc);

    yPosition = await addPDFHeader(
      doc,
      "RINCIAN PENGELUARAN",
      gasStationName,
      dateRange
    );

    // Build expense table data - format sesuai dengan expense-table.tsx
    const expenseTableData: any[] = [];

    expenseReport.byCategory.forEach((categoryData) => {
      // Category header row
      expenseTableData.push([
        categoryData.category,
        "",
        formatCurrency(categoryData.total),
      ]);

      // Category items - kolom pertama adalah tanggal, bukan kategori
      categoryData.items.forEach((item) => {
        expenseTableData.push([
          formatUTCDate(new Date(item.date), "dd MMM yyyy"),
          item.transactionDescription,
          formatCurrency(item.amount),
        ]);
      });
    });

    // Add total row - format sesuai dengan expense-table.tsx
    expenseTableData.push([
      "",
      "TOTAL PENGELUARAN:",
      formatCurrency(expenseReport.totalExpenses),
    ]);

    autoTable(doc, {
      startY: yPosition,
      head: [["Kategori", "Deskripsi", "Jumlah (Rp)"]],
      body: expenseTableData,
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
        0: { fontStyle: "bold" }, // Kategori/Tanggal
        2: { halign: "right" }, // Jumlah
      },
      margin: { left: 14, right: 14 },
    });

    // Footer for expense report page
    addPDFFooter(doc, userRole, userName);
  }

  // Save
  const filename = `Rincian_Pemasukan_Pengeluaran_${gasStationName.replace(
    /\s+/g,
    "_"
  )}_${formatUTCDate(dateRange.from, "yyyyMMdd")}-${formatUTCDate(
    dateRange.to,
    "yyyyMMdd"
  )}.pdf`;
  doc.save(filename);
}
