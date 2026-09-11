# RentCar xavfsizlik holati

2026-09-09 holatidagi dasturiy himoyalar:

- Login paroli bcrypt bilan hash qilinadi; yaratiladigan parol kamida 12 belgi va ko‘pi bilan 72 UTF-8 bayt. API hech qachon hashni mijozga qaytarmaydi.
- Web: HttpOnly cookie, productionda Secure, SameSite=Lax. Production login HTTPS APP_URL talab qiladi.
- Sessiya 30 daqiqa ishlatilmasa rad etiladi. SESSION_IDLE_MINUTES 5–240 oralig‘ida sozlanadi; noto‘g‘ri qiymat 30ga qaytadi. Web sessiyasi umumiy 12 soat, Mini App 4 soat bilan chegaralangan.
- Profil orqali barcha qurilmalardagi sessiyalarni birdan bekor qilish mumkin. Hisob o‘chirilsa, parol/rol/Telegram bog‘lanishi o‘zgarsa sessiyalar bekor qilinadi.
- Telegram initData serverda HMAC bilan tekshiriladi; 5 daqiqalik yaroqlilik, bir martalik kirish va faqat faol verified xodim. Token sahifa xotirasida turadi, localStorage yoki URLga yozilmaydi. Sahifani reload qilish o‘rniga Mini Appni botdan yopib qayta oching.
- API yozish amallari APP_URL origin bilan tekshiriladi. API vakolatni har bir so‘rovda serverda tekshiradi.
- Login bo‘yicha va umumiy kirish urinishlari, xodimning API hamda PDF/hisobot so‘rovlari PostgreSQLda hisoblanib cheklanadi. Bir nechta worker/server uchun umumiy hisob ishlaydi. Bu tashqi DDoS himoyasining o‘rnini bosmaydi.
- JSON/native form oqimi hajmi o‘qish vaqtida cheklanadi; soxta yoki yo‘q Content-Length cheklovni chetlab o‘tmaydi. Buzilgan UTF-8 rad etiladi.
- Har sahifa uchun yangi CSP nonce: productionda script-src unsafe-inline va unsafe-eval ishlatilmaydi. Mini Appdan boshqa sahifalar iframe ichida ochilmaydi; Mini App uchun faqat Telegram Web originlari ruxsat etilgan. UI inline style uchun style-src unsafe-inline saqlangan.
- Avtomobil rasmi serverda dekodlanadi, pixel limiti tekshiriladi, metadata tashlab yuborilib qayta JPEGga kodlanadi. SVG/HTML faylni JPEG deb ko‘rsatish qabul qilinmaydi.
- Passport AES-256-GCM bilan shifrlangan va rollar bilan cheklangan. Avtomobil hisobotlariga passport kiritilmaydi.
- Telegram hisobotini yuborishdan oldin xodim hali faol ekani, Telegram manzili va zarur huquqlari saqlangani qayta tekshiriladi.
- Muhim o‘zgarishlar auditda saqlanadi. Secretlar envda; fontlar va PDF kutubxonasi lokal server ichida ishlaydi.

## Serverga chiqarishda bajariladigan ishlar

HTTPS domen, kuchli alohida production secretlar, Caddy va yopiq PostgreSQL porti talab qilinadi. VPSga SSH key bilan kiring; domen/VPS provayder hisobida 2FA yoqing. DB backupni VPSdan boshqa himoyalangan joyga saqlang va restore sinovini bajaring. Paketlar va OS xavfsizlik yangilanishlarini muntazam o‘rnating. To‘liq yo‘riqnoma: VPS_DEPLOYMENT.md.

Ilovaning o‘zida TOTP/WebAuthn ikki bosqichli login hozir joriy qilinmagan. Internetga joylashdan oldin haqiqiy domen, Telegram mobil/Web klientlar, proxy, backup va ruxsatlar bilan sinov kerak. Kod tekshiruvi mustaqil penetration test, server auditi yoki mutlaq xavfsizlik kafolati emas.

## Git va konfiguratsiya tekshiruvi

`npm run security:check`, `npm run security:check -- --production` va `npm run security:audit` qo‘shildi. `.githooks` ichidagi pre-commit/pre-push staged fayllarni tekshiradi; Git repositoryda `git config core.hooksPath .githooks` bilan yoqiladi. Bu hook butun Git tarixini tekshirmaydi. Backup, eksport va credential fayllar `.gitignore`/`.dockerignore`ga qo‘shildi. `.env` lokal ruxsati 600 qilib qo‘yildi.

Joriy tekshiruvda production paketlarida npm audit 0 zaiflik topdi. Lokal DATA_ENCRYPTION_KEY noto‘g‘ri, Telegram/Google sozlanmagan va Git repository hali yaratilmagan; shuning uchun to‘liq production xavfsizlik tekshiruvi muvaffaqiyatli deb hisoblanmaydi. Batafsil: [Yagona qo‘llanma](TELEGRAM_SERVER_XAVFSIZLIK_QOLLANMASI.md).
