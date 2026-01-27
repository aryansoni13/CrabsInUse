import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export interface PDFGenerationOptions {
  filename?: string;
  orientation?: "portrait" | "landscape";
  format?: "a4" | "a3" | "letter";
  quality?: number;
  scale?: number;
}

export class PDFGenerator {
  private static defaultOptions: PDFGenerationOptions = {
    filename: "document.pdf",
    orientation: "landscape",
    format: "a4",
    quality: 0.98,
    scale: 2,
  };

  /**
   * Helper: Adds a canvas to the PDF, automatically handling multi-page splitting.
   * This is the core logic that fixes the "cut off" issue.
   */
  private static addImageWithAutoPaging(
    pdf: jsPDF,
    canvas: HTMLCanvasElement,
    options: PDFGenerationOptions,
    startOnNewPage: boolean
  ): void {
    const imgData = canvas.toDataURL("image/jpeg", options.quality);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    // Calculate the height of the image in PDF units (mm)
    const imgProps = pdf.getImageProperties(imgData);
    const renderedImgHeight = (imgProps.height * pdfWidth) / imgProps.width;

    // If startOnNewPage is true, we add a page first.
    // EXCEPT if it's the very first page of a fresh document, usually we don't need to add one.
    // However, jsPDF inits with 1 page. We check if that page is empty or used.
    // For simplicity in segmented generation: we assume we manage pages manually.
    if (startOnNewPage) {
      pdf.addPage();
    }

    let heightLeft = renderedImgHeight;
    let position = 0; // Top of the page
    let pageAdded = false;

    // First Page of this content
    pdf.addImage(imgData, "JPEG", 0, position, pdfWidth, renderedImgHeight);
    heightLeft -= pdfHeight;

    // If the content is longer than one page, loop and add more pages
    while (heightLeft > 0) {
      position -= pdfHeight; // Shift the image up (negative Y)
      pdf.addPage();
      pdf.addImage(imgData, "JPEG", 0, position, pdfWidth, renderedImgHeight);
      heightLeft -= pdfHeight;
    }
  }

  /**
   * Generate PDF from a single ID.
   * If the content is long, it will auto-split across pages.
   */
  static async generatePDF(
    elementId: string,
    options: PDFGenerationOptions = {}
  ): Promise<void> {
    const finalOptions = { ...this.defaultOptions, ...options };

    try {
      const element = document.getElementById(elementId);
      if (!element) throw new Error(`Element with ID '${elementId}' not found`);

      this.showLoadingIndicator();

      const originalElement = await this.prepareElementForPDF(element);

      // Capture full height using windowHeight option
      const canvas = await html2canvas(originalElement, {
        scale: finalOptions.scale,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        width: originalElement.scrollWidth,
        height: originalElement.scrollHeight,
        windowWidth: originalElement.scrollWidth,
        windowHeight: originalElement.scrollHeight, // Crucial for full capture
      });

      const pdf = new jsPDF({
        orientation: finalOptions.orientation,
        unit: "mm",
        format: finalOptions.format,
      });

      // Use the smart helper
      this.addImageWithAutoPaging(pdf, canvas, finalOptions, false);

      pdf.save(finalOptions.filename!);
      this.restoreElementAfterPDF(element, originalElement);
      this.hideLoadingIndicator();
    } catch (error) {
      console.error("PDF generation failed:", error);
      this.hideLoadingIndicator();
      throw error;
    }
  }

  /**
   * Generate PDF from multiple IDs.
   * PERFECT FOR YOU: Pass ['abstract-id', 'measurement-id']
   * It puts the first ID on Page 1, and forces the second ID to start on Page 2.
   */
  static async generateSegmentedPDF(
    elementIds: string[],
    options: PDFGenerationOptions = {}
  ): Promise<void> {
    const finalOptions = { ...this.defaultOptions, ...options };

    try {
      this.showLoadingIndicator();

      const pdf = new jsPDF({
        orientation: finalOptions.orientation,
        unit: "mm",
        format: finalOptions.format,
      });

      for (let i = 0; i < elementIds.length; i++) {
        const elementId = elementIds[i];
        const element = document.getElementById(elementId);
        if (!element) continue;

        const originalElement = await this.prepareElementForPDF(element);

        const canvas = await html2canvas(originalElement, {
          scale: finalOptions.scale,
          useCORS: true,
          allowTaint: true,
          backgroundColor: "#ffffff",
          width: originalElement.scrollWidth,
          height: originalElement.scrollHeight,
          windowHeight: originalElement.scrollHeight,
        });

        // If i > 0, it means it's the 2nd (or 3rd) item, so FORCE a new page.
        // The helper handles splitting that item if it's also very long.
        const forceNewPage = i > 0;
        this.addImageWithAutoPaging(pdf, canvas, finalOptions, forceNewPage);

        this.restoreElementAfterPDF(element, originalElement);
      }

      pdf.save(finalOptions.filename!);
      this.hideLoadingIndicator();
    } catch (error) {
      console.error("Segmented PDF generation failed:", error);
      this.hideLoadingIndicator();
      throw error;
    }
  }

  // --- Utility Methods (No changes needed, but ensuring height is auto) ---

  static async generateMultiPagePDF(
    elementId: string,
    options: PDFGenerationOptions = {}
  ): Promise<void> {
    // Redirect to main function which now handles multipage automatically
    return this.generatePDF(elementId, options);
  }

  static async generateSegmentedMultiPagePDF(
    elementIds: string[],
    options: PDFGenerationOptions = {}
  ): Promise<void> {
    return this.generateSegmentedPDF(elementIds, options);
  }

  private static async prepareElementForPDF(
    element: HTMLElement
  ): Promise<HTMLElement> {
    const clonedElement = element.cloneNode(true) as HTMLElement;

    // Force styles to ensure full capture
    clonedElement.style.width = "1122px"; // A4 Landscape width approx
    clonedElement.style.minWidth = "1122px";

    // CRITICAL: Ensure height is not restricted
    clonedElement.style.height = "auto";
    clonedElement.style.minHeight = "auto";
    clonedElement.style.maxHeight = "none";
    clonedElement.style.overflow = "visible";

    clonedElement.style.position = "absolute";
    clonedElement.style.left = "-9999px";
    clonedElement.style.top = "0";
    clonedElement.style.zIndex = "-1";
    clonedElement.style.backgroundColor = "white";

    // Fix Tables
    const tables = clonedElement.querySelectorAll("table");
    tables.forEach((table) => {
      (table as HTMLElement).style.width = "100%";
      (table as HTMLElement).style.tableLayout = "fixed";
    });

    // Hide UI elements
    const elementsToHide = clonedElement.querySelectorAll(
      '.print\\:hidden, [class*="print:hidden"], .no-print, button'
    );
    elementsToHide.forEach(
      (el) => ((el as HTMLElement).style.display = "none")
    );

    document.body.appendChild(clonedElement);
    await this.waitForContent(clonedElement);
    return clonedElement;
  }

  private static restoreElementAfterPDF(
    originalElement: HTMLElement,
    clonedElement: HTMLElement
  ): void {
    if (clonedElement.parentNode) {
      clonedElement.parentNode.removeChild(clonedElement);
    }
  }

  private static async waitForContent(element: HTMLElement): Promise<void> {
    const images = Array.from(element.querySelectorAll("img"));
    await Promise.all(
      images.map((img) => {
        if (img.complete) return Promise.resolve();
        return new Promise((resolve) => {
          img.onload = resolve;
          img.onerror = resolve;
        });
      })
    );
    // Give fonts a moment to settle
    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  private static showLoadingIndicator(): void {
    const existing = document.getElementById("pdf-loading-indicator");
    if (existing) return;
    const div = document.createElement("div");
    div.id = "pdf-loading-indicator";
    div.innerHTML = `<div style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);display:flex;justify-content:center;align-items:center;z-index:9999;color:white;font-family:sans-serif;">Processing PDF...</div>`;
    document.body.appendChild(div);
  }

  private static hideLoadingIndicator(): void {
    const el = document.getElementById("pdf-loading-indicator");
    if (el) el.remove();
  }
}

// Exports
export const generateBillPDF = async (
  elementId: string,
  filename: string = "bill.pdf"
) => {
  await PDFGenerator.generatePDF(elementId, {
    filename,
    orientation: "landscape",
  });
};

export const generateMultiPageBillPDF = async (
  elementId: string,
  filename: string = "bill.pdf"
) => {
  await PDFGenerator.generatePDF(elementId, {
    filename,
    orientation: "landscape",
  });
};

// USE THIS ONE for forced page breaks
export const generateSegmentedBillPDF = async (
  elementIds: string[],
  filename: string = "bill.pdf"
) => {
  await PDFGenerator.generateSegmentedPDF(elementIds, {
    filename,
    orientation: "landscape",
  });
};

export const generateSegmentedMultiPageBillPDF = async (
  elementIds: string[],
  filename: string = "bill.pdf"
) => {
  await PDFGenerator.generateSegmentedPDF(elementIds, {
    filename,
    orientation: "landscape",
  });
};
