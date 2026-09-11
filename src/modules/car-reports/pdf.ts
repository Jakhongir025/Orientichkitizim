import PDFDocument from "pdfkit";
import path from "node:path";
import type { CarReport } from "./service";
export async function reportPdf(report: CarReport): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margin: 48,
      bufferPages: true,
      info: {
        Title: `OrientRentCar - ${report.plate}`,
        Author: "OrientRentCar",
      },
    });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.font(path.join(process.cwd(), "assets/fonts/NotoSans-Regular.ttf"));
    doc.fillColor("#177c68").fontSize(12).text("RENTCAR / AVTOMOBIL HISOBOTI");
    doc.moveDown();
    doc.fillColor("#142438").fontSize(22).text(report.title);
    doc.fontSize(16).text(report.plate);
    doc.moveDown();
    doc
      .fillColor("#526274")
      .fontSize(10)
      .text(`Davr: ${report.period}`)
      .text(`Tuzilgan: ${report.generatedAt}`);
    doc.moveDown();
    doc.fillColor("#142438").fontSize(10);
    for (const line of report.lines) {
      if (doc.y > 735) doc.addPage();
      doc.text(line || " ", { lineGap: 3 });
      doc.moveDown(0.3);
    }
    const pages = doc.bufferedPageRange();
    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(i);
      doc
        .fontSize(8)
        .fillColor("#526274")
        .text(
          `OrientRentCar | ${report.plate} | ${i + 1} / ${pages.count}`,
          48,
          800,
          { lineBreak: false },
        );
    }
    doc.end();
  });
}
