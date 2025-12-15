import jsPDF from "jspdf";
import { format } from "date-fns";
import { PERTAMINA_COLORS } from "@/lib/utils/product-colors";

/**
 * Format UTC date to local date string for display
 * Uses UTC methods to ensure date doesn't shift due to timezone
 * 
 * @param date - Date object (should be in UTC)
 * @param formatStr - Format string (e.g., "dd MMM yyyy", "yyyyMMdd")
 * @returns Formatted date string
 */
function formatUTCDate(date: Date, formatStr: string): string {
  // Use UTC methods to get date components
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();
  
  // Create a new Date object in local timezone with UTC values
  // This ensures format() displays the correct date without timezone shift
  const localDate = new Date(year, month, day);
  
  return format(localDate, formatStr);
}

/**
 * Convert SVG to image data URL using canvas
 */
async function svgToImageDataUrl(
  svgPath: string,
  targetWidth?: number,
  targetHeight?: number
): Promise<string | null> {
  try {
    const response = await fetch(svgPath);
    const svgText = await response.text();

    // Create an image element and load SVG
    return new Promise((resolve, reject) => {
      const img = new Image();
      const svgBlob = new Blob([svgText], {
        type: "image/svg+xml;charset=utf-8",
      });
      const url = URL.createObjectURL(svgBlob);

      img.onload = () => {
        const canvas = document.createElement("canvas");
        // Use target dimensions if provided, otherwise use image natural dimensions
        canvas.width = targetWidth || img.naturalWidth || img.width || 800;
        canvas.height = targetHeight || img.naturalHeight || img.height || 600;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL("image/png");
          URL.revokeObjectURL(url);
          resolve(dataUrl);
        } else {
          URL.revokeObjectURL(url);
          reject(new Error("Failed to get canvas context"));
        }
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Failed to load SVG image"));
      };

      img.src = url;
    });
  } catch (error) {
    console.warn("Failed to convert SVG to image:", error);
    return null;
  }
}

/**
 * Add background logo (NozzlLogomark) to PDF with low opacity
 */
export async function addBackgroundLogo(doc: jsPDF) {
  try {
    const logomarkPath = "/logo/NozzlLogomark.svg";
    // Convert SVG with target size (high resolution for quality)
    const imageDataUrl = await svgToImageDataUrl(logomarkPath, 400, 400);

    if (!imageDataUrl) {
      return; // Skip if failed to load
    }

    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;

    // Add background logo with low opacity (centered, large, semi-transparent)
    doc.setGState(doc.GState({ opacity: 0.05 }));
    doc.addImage(
      imageDataUrl,
      "PNG",
      pageWidth / 2 - 50,
      pageHeight / 2 - 50,
      100,
      100,
      undefined,
      "FAST"
    );
    doc.setGState(doc.GState({ opacity: 1.0 }));
  } catch (error) {
    console.warn("Failed to add background logo:", error);
    // Continue without background if logo fails to load
  }
}

/**
 * Add header with Nozzl logo, tagline, and report title
 */
export async function addPDFHeader(
  doc: jsPDF,
  reportTitle: string,
  gasStationName: string,
  dateRange?: { from: Date; to: Date }
) {
  const pageWidth = doc.internal.pageSize.width;
  const margin = 14;
  const headerTopY = 10;
  let yPosition = headerTopY;

  // Calculate logo size first to align properly
  const isLandscape =
    doc.internal.pageSize.width > doc.internal.pageSize.height;
  const logoWidth = isLandscape ? 40 : 30;
  const logoHeight = (logoWidth * 59.3) / 158.5; // Maintain aspect ratio

  // Left side: Report Title and details
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  // Calculate title baseline - approximately 5mm from top for 18pt font
  const titleBaselineY = headerTopY + 5;
  doc.text(reportTitle, margin, titleBaselineY);
  yPosition = titleBaselineY + 7;

  // Gas Station Name
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(gasStationName, margin, yPosition);
  yPosition += 5;

  // Date Range (if provided)
  if (dateRange) {
    doc.setFontSize(8);
    // Jika from dan to sama, tampilkan sebagai "per tanggal" (untuk balance sheet)
    if (dateRange.from.getTime() === dateRange.to.getTime()) {
      doc.text(
        `Per tanggal: ${formatUTCDate(dateRange.to, "dd MMM yyyy")}`,
        margin,
        yPosition
      );
    } else {
      doc.text(
        `Periode: ${formatUTCDate(dateRange.from, "dd MMM yyyy")} s/d ${formatUTCDate(
          dateRange.to,
          "dd MMM yyyy"
        )}`,
        margin,
        yPosition
      );
    }
    yPosition += 6;
  } else {
    yPosition += 4;
  }

  // Right side: Logo and tagline - aligned with title
  try {
    // Load Nozzl logo SVG
    const logoPath = "/logo/Nozzl.svg";
    const targetWidthPx = Math.round(logoWidth * 3.7795);
    const targetHeightPx = Math.round(logoHeight * 3.7795);
    const imageDataUrl = await svgToImageDataUrl(
      logoPath,
      targetWidthPx,
      targetHeightPx
    );

    if (imageDataUrl) {
      // Logo positioned at top right, aligned with title baseline
      const logoX = pageWidth - logoWidth - margin;
      const titleBaselineY = headerTopY + 5;
      // Center logo vertically with title baseline
      const logoY = titleBaselineY - logoHeight / 2;
      doc.addImage(
        imageDataUrl,
        "PNG",
        logoX,
        logoY,
        logoWidth,
        logoHeight,
        undefined,
        "FAST"
      );

      // Tagline below logo (right aligned)
      doc.setFontSize(8);
      doc.setFont("helvetica", "italic");
      doc.text(
        "Your System Evolve",
        pageWidth - margin,
        logoY + logoHeight + 3,
        { align: "right" }
      );
    } else {
      throw new Error("Failed to load logo");
    }
  } catch (error) {
    console.warn("Failed to load logo:", error);
    // If logo fails, just use text (right aligned)
    const titleBaselineY = headerTopY + 5;
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("NOZZL", pageWidth - margin, titleBaselineY, { align: "right" });
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.text("Your System Evolve", pageWidth - margin, titleBaselineY + 8, {
      align: "right",
    });
  }

  // Add Pertamina stripes as separator below header
  const stripeY = yPosition + 3;
  addPertaminaStripes(doc, stripeY);

  // Return the yPosition for content below header and stripes with more spacing
  return stripeY + 8;
}

/**
 * Add Pertamina stripes (blue, red, green) as a separator
 */
function addPertaminaStripes(doc: jsPDF, yPosition: number) {
  const pageWidth = doc.internal.pageSize.width;
  const margin = 14;
  const stripeHeight = 1; // Thinner stripe height in mm
  const stripeWidth = pageWidth - margin * 2;
  const xStart = margin;

  // Blue stripe (50% width)
  doc.setFillColor(0, 115, 178); // #0073B2
  doc.rect(xStart, yPosition, stripeWidth * 0.5, stripeHeight, "F");

  // Red stripe (25% width)
  doc.setFillColor(253, 0, 23); // #FD0017
  doc.rect(
    xStart + stripeWidth * 0.5,
    yPosition,
    stripeWidth * 0.25,
    stripeHeight,
    "F"
  );

  // Green stripe (25% width)
  doc.setFillColor(159, 228, 0); // #9FE400
  doc.rect(
    xStart + stripeWidth * 0.75,
    yPosition,
    stripeWidth * 0.25,
    stripeHeight,
    "F"
  );
}

/**
 * Add stat cards similar to the app UI
 */
export function addStatCards(
  doc: jsPDF,
  stats: Array<{
    label: string;
    value: string;
    bgColor: [number, number, number]; // RGB values
    borderColor: [number, number, number];
    textColor: [number, number, number];
  }>,
  yPosition: number
): number {
  const pageWidth = doc.internal.pageSize.width;
  const margin = 14;
  const gap = 4;
  const cardWidth =
    (pageWidth - margin * 2 - (stats.length - 1) * gap) / stats.length;
  const cardHeight = 20;
  const cardPadding = 3;

  stats.forEach((stat, index) => {
    const xPos = margin + index * (cardWidth + gap);

    // Draw card background with border
    doc.setFillColor(...stat.bgColor);
    doc.setDrawColor(...stat.borderColor);
    doc.setLineWidth(0.5);
    doc.roundedRect(xPos, yPosition, cardWidth, cardHeight, 2, 2, "FD");

    // Label
    doc.setFontSize(8);
    doc.setTextColor(...stat.textColor);
    doc.setFont("helvetica", "normal");
    const labelY = yPosition + cardPadding + 3;
    // Truncate label if too long
    const maxLabelWidth = cardWidth - cardPadding * 2;
    const labelText =
      doc.getTextWidth(stat.label) > maxLabelWidth
        ? doc.splitTextToSize(stat.label, maxLabelWidth)[0] + "..."
        : stat.label;
    doc.text(labelText, xPos + cardPadding, labelY);

    // Value
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    const valueY = yPosition + cardHeight - cardPadding - 2;
    // Truncate value if too long
    const maxValueWidth = cardWidth - cardPadding * 2;
    const valueText =
      doc.getTextWidth(stat.value) > maxValueWidth
        ? doc.splitTextToSize(stat.value, maxValueWidth)[0]
        : stat.value;
    doc.text(valueText, xPos + cardPadding, valueY);
  });

  // Reset text color to black
  doc.setTextColor(0, 0, 0);

  return yPosition + cardHeight + 5;
}

/**
 * Add footer with user role and generation datetime
 */
export function addPDFFooter(doc: jsPDF, userRole: string, userName?: string) {
  const pageCount = doc.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");

    // Left: Page number
    doc.text(`Halaman ${i} dari ${pageCount}`, 14, pageHeight - 10);

    // Center: Generation info
    const generatedBy = userName
      ? `Digenerate oleh: ${userRole} (${userName})`
      : `Digenerate oleh: ${userRole}`;
    doc.text(generatedBy, pageWidth / 2, pageHeight - 10, { align: "center" });

    // Right: DateTime (use local time for generation timestamp)
    doc.text(
      format(new Date(), "dd MMM yyyy HH:mm"),
      pageWidth - 14,
      pageHeight - 10,
      { align: "right" }
    );
  }
}
