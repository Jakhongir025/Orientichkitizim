import PDFDocument from "pdfkit";
import path from "node:path";
import { formatDate } from "@/lib/display-date";
export type FleetPdfRow = {
  brand: string;
  model: string;
  plateNumber: string;
  status: string;
  occupiedUntil: Date | null;
};
const labels: Record<string, string> = {
  AVAILABLE: "Bo‘sh",
  RENTED: "Band",
  WITH_OWNER: "Egasida",
  CAR_WASH: "Avtomobil yuvish joyida",
  SERVICE: "Servisda",
  RESERVED: "Band qilingan",
  UNAVAILABLE: "Mavjud emas",
};
export function fleetStatusPdf(
  rows: FleetPdfRow[],
  timezone: string,
  query: string,
  generatedAt = new Date(),
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margin: 40,
      bufferPages: true,
      info: {
        Title: "OrientRentCar - Avtomobillar holati",
        Author: "OrientRentCar",
      },
    });
    const chunks: Buffer[] = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.font(path.join(process.cwd(), "assets/fonts/NotoSans-Regular.ttf"));
    doc
      .fontSize(11)
      .fillColor("#177c68")
      .text("ORIENTRENTCAR / BOSHQARUV TIZIMI");
    doc.fontSize(21).fillColor("#142438").text("Avtomobillar holati");
    doc
      .moveDown(0.4)
      .fontSize(9)
      .fillColor("#526274")
      .text(
        `Tuzilgan: ${formatDate(generatedAt.toISOString(), true, timezone)} | ${timezone}`,
      )
      .text(`Jami: ${rows.length} ta avtomobil`);
    if (query) doc.text(`Qidiruv: ${query}`);
    doc.moveDown();
    const widths = [24, 161, 100, 110, 120],
      xs = [40, 64, 225, 325, 435];
    function header() {
      const y = doc.y;
      doc.rect(40, y, 515, 30).fill("#eaf4f0");
      doc.fillColor("#142438").fontSize(9);
      ["№", "Avtomobil", "Davlat raqami", "Holati", "Bandlik muddati"].forEach(
        (v, i) => doc.text(v, xs[i] + 4, y + 8, { width: widths[i] - 8 }),
      );
      doc.y = y + 30;
    }
    header();
    rows.forEach((row, index) => {
      const values = [
        String(index + 1),
        `${row.brand} ${row.model}`,
        row.plateNumber,
        labels[row.status] || row.status,
        row.status === "RENTED" && row.occupiedUntil
          ? formatDate(row.occupiedUntil.toISOString(), true, timezone)
          : "—",
      ];
      doc.fontSize(9);
      const height = Math.max(
        40,
        ...values.map(
          (v, i) => doc.heightOfString(v, { width: widths[i] - 8 }) + 18,
        ),
      );
      if (doc.y + height > 765) {
        doc.addPage();
        header();
      }
      const y = doc.y;
      if (index % 2 === 1) doc.rect(40, y, 515, height).fill("#f7f9fb");
      doc.fillColor("#142438");
      values.forEach((v, i) =>
        doc.text(v, xs[i] + 4, y + 8, { width: widths[i] - 8 }),
      );
      doc
        .moveTo(40, y + height)
        .lineTo(555, y + height)
        .strokeColor("#e0e6ec")
        .stroke();
      doc.y = y + height;
    });
    if (!rows.length) doc.moveDown().text("Qidiruvga mos avtomobil topilmadi.");
    const pages = doc.bufferedPageRange();
    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(i);
      doc
        .fontSize(8)
        .fillColor("#526274")
        .text(
          `OrientRentCar | Ichki foydalanish uchun | ${i + 1} / ${pages.count}`,
          40,
          795,
          { lineBreak: false },
        );
    }
    doc.end();
  });
}
