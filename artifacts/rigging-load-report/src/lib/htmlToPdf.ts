/**
 * Convert a self-contained HTML document string to a multi-page A4 PDF
 * and trigger a browser download. No popup, no print dialog — the user
 * gets a real .pdf file in their Downloads folder.
 *
 * Implementation notes:
 *  - The HTML is rendered into a hidden, off-screen same-origin iframe
 *    so its <style> blocks (and any A4 sizing) work as written.
 *  - html2canvas rasterises the iframe body to a PNG, which is then
 *    sliced across A4 pages by jsPDF. The text is not selectable in the
 *    resulting PDF (it's image-based), which is the right trade-off for
 *    a build/handoff sheet — the layout is preserved 1:1, including
 *    SVG diagrams and tables, with no font-availability surprises.
 *  - We size the iframe at ~794px wide (≈ A4 at 96 dpi) so the
 *    rendered page width maps cleanly to a 210 mm A4 page.
 */
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

const A4_PORTRAIT_PX = 794; // ≈ 210 mm at 96 dpi

export type Orientation = "portrait" | "landscape";

export async function downloadHtmlAsPdf(
  html: string,
  filename: string,
  options: { orientation?: Orientation } = {},
): Promise<void> {
  const orientation = options.orientation ?? "portrait";
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.cssText = [
    "position:fixed",
    "left:-10000px",
    "top:0",
    `width:${A4_PORTRAIT_PX}px`,
    "height:auto",
    "border:0",
    "pointer-events:none",
    "opacity:0",
  ].join(";");
  document.body.appendChild(iframe);

  try {
    const doc = iframe.contentDocument;
    if (!doc) throw new Error("Could not access iframe document");
    doc.open();
    doc.write(html);
    doc.close();

    // Wait for the iframe document to be parsed and any inline images /
    // fonts to settle. We check the document's `readyState` and also
    // wait for `document.fonts.ready` when supported.
    await new Promise<void>((resolve) => {
      if (doc.readyState === "complete") {
        resolve();
        return;
      }
      iframe.addEventListener("load", () => resolve(), { once: true });
    });
    const fonts = (doc as Document & { fonts?: { ready: Promise<unknown> } })
      .fonts;
    if (fonts?.ready) {
      try {
        await fonts.ready;
      } catch {
        /* font loading errors shouldn't block PDF generation */
      }
    }
    // Wait one frame so layout finishes after late style application.
    await new Promise<void>((r) =>
      requestAnimationFrame(() => requestAnimationFrame(() => r())),
    );

    const renderTarget = doc.body;
    const renderHeight = Math.max(
      renderTarget.scrollHeight,
      renderTarget.offsetHeight,
      doc.documentElement.scrollHeight,
    );

    // Grow the iframe to its natural content height so html2canvas
    // captures the full page in one go.
    iframe.style.height = `${renderHeight}px`;

    const canvas = await html2canvas(renderTarget, {
      backgroundColor: "#ffffff",
      scale: 2,
      useCORS: true,
      logging: false,
      windowWidth: A4_PORTRAIT_PX,
      windowHeight: renderHeight,
    });

    const pdf = new jsPDF({
      unit: "mm",
      format: "a4",
      orientation,
    });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const imgW = pageW;
    const imgH = (canvas.height * imgW) / canvas.width;

    const imgData = canvas.toDataURL("image/png");
    let position = 0;
    pdf.addImage(imgData, "PNG", 0, position, imgW, imgH);
    let remaining = imgH - pageH;
    while (remaining > 0) {
      position -= pageH;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, position, imgW, imgH);
      remaining -= pageH;
    }

    pdf.save(filename);
  } finally {
    iframe.remove();
  }
}

/** Filesystem-safe filename slug. */
export function pdfFilename(parts: Array<string | undefined | null>): string {
  const cleaned = parts
    .map((p) => (p ?? "").trim())
    .filter((p) => p.length > 0)
    .join(" — ")
    .replace(/[\\/:*?"<>|]+/g, "_")
    .replace(/\s+/g, " ")
    .trim();
  return (cleaned || "Export") + ".pdf";
}
