import { writeFile } from "node:fs/promises";
import { reportPdf } from "../src/modules/car-reports/pdf";
async function main() {
  await writeFile(
    "output/pdf/rentcar-kunlik-hisobot-namuna.pdf",
    await reportPdf({
      title: "Mercedes-Benz GLS 450",
      plate: "01 A 038 AA",
      period: "2026-09-08 - 2026-09-09 (oxirgi sana kirmaydi, Asia/Tashkent)",
      generatedAt: "2026-09-09 08:00",
      lines: [
        "NAMUNA - haqiqiy ish qaydlari emas",
        "Servis ishlari: 2",
        "Avtomobilga bog‘langan kunlik qaydlar: 1",
        "Holat o‘zgarishlari: 1",
        "",
        "SERVIS TARIXI",
        "2026-09-08 | Moy almashtirish | 52 800 km | Namuna xodim",
        "Mobil 1 5W-30, moy filtri almashtirildi.",
        "2026-09-08 | Avtomobil yuvish | 52 810 km | Namuna xodim",
        "Salon va tashqi qism tozalandi.",
        "",
        "KUNLIK ISHLAR",
        "2026-09-08 | Namuna xodim",
        "Avtomobil mijozga topshirish uchun tayyorlandi.",
        "",
        "HOLAT TARIXI",
        "2026-09-08 15:30 | SERVICE -> AVAILABLE",
        "",
        "IJARA DAVRLARI: 0",
        "Passport ma’lumotlari hisobotga kiritilmaydi.",
      ],
    }),
  );
}
void main();
