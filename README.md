# RentCar Management System

Next.js / TypeScript / PostgreSQL / Prisma asosidagi ichki avtopark boshqaruvi. Login, rollar, xodimlar, davomat, kunlik ishlar, avtomobillar, servis va hujjatlar tarixi, Telegram navbati, Google Sheets importi, rental/fine qidiruvi va audit mavjud.

## Foydalanish, taqdimot va VPS

- [Yagona qo‘llanma: ishga tushirish, GitHub himoyasi, VPS, Telegram va Google Sheets](docs/TELEGRAM_SERVER_XAVFSIZLIK_QOLLANMASI.md)

- [VS Code → VPS → domen → Telegram: ketma-ket o‘rnatish qo‘llanmasi](docs/ISHGA_TUSHIRISH_QADAMMA_QADAM.md)
- [Xavfsizlik himoyalari va cheklovlar](docs/SECURITY.md)
- [Xodim va administrator qo‘llanmasi](docs/FOYDALANISH_QOLLANMASI.md)
- [Taqdimot havolasi va 7 daqiqalik ssenariy](docs/TAQDIMOT.md)
- [VPSga ko‘chirish: domen, HTTPS, baza va backup](docs/VPS_DEPLOYMENT.md)

Ushbu Mac uchun `RentCarni ishga tushirish.command` lokal web, worker va bazani ishga tushiradi. `.local/postgres` lokal ma’lumotlarni saqlaydi; bu papkani o‘chirmang. Runtime va lokal baza Git/Docker kontekstiga kiritilmaydi.

Davomat qo‘lda kiritilgan sana/vaqt + qurilma IANA timezonei bo‘yicha hisoblanadi. 10:00 dan keyingina sabab majburiy. UTC instant, timezone va haqiqiy yuborish timestampi alohida saqlanadi. Scheduler esa kompaniya uchun Asia/Tashkent jadvalini saqlaydi.

## Arxitektura va bosqichlar

- [Arxitektura va ER diagram](docs/ARCHITECTURE.md)
- [Bosqichlar va testlar](docs/PHASES.md)
- [Prisma schema](prisma/schema.prisma)
- [API ro‘yxati](docs/API.md)

Next.js API -> validation/auth -> modular services -> Prisma/PostgreSQL. Worker alohida process. Session, notification, rate limit va scheduler idempotency bazada saqlanadi. Brauzerda biznes ma’lumotlari localStorage orqali saqlanmaydi.

## Talablar

Node.js 22.16+ (22 LTS tavsiya), npm 10+, PostgreSQL 18; Docker Compose production uchun. Telegram/Google kalitlari faqat tegishli integratsiya yoqilganda kerak.

## Lokal o‘rnatish

```sh
cp .env.example .env
npm ci
```

`.env` ichida `POSTGRES_PASSWORD` va `DATABASE_URL`ni moslang. `DATA_ENCRYPTION_KEY` uchun `openssl rand -hex 32`, seed parollari uchun 12+ belgili alohida qiymatlar yarating. Hech qanday parol README ichida hardcode qilinmagan. Shifrlash kalitini yo‘qotish passport ma’lumotlarini ochib bo‘lmasligiga olib keladi; uni DB backupdan alohida xavfsiz saqlang.

Faqat development bazasini Docker orqali boshlash:

```sh
docker compose -f compose.yaml -f compose.dev.yaml up -d db
npm run db:migrate
npm run db:seed
npm run dev
```

Boshqa terminalda:

```sh
npm run worker
```

[http://localhost:3000](http://localhost:3000) manzilini oching. Development seed: `superadmin` va `aziz`, `sardor`, `madina`. Parollar `.env`dagi `SEED_ADMIN_PASSWORD` va `SEED_EMPLOYEE_PASSWORD`. Seed 5 avtomobil, servis/hujjatlar, 2 attendance va daily report yaratadi. Takroriy seed mavjud parollarni almashtirmaydi. Demo passport yoki real mijozlar kiritilmaydi.

`npm run db:dev -- --name change_name` — schema o‘zgarganda yangi migration. Productionda faqat `db:migrate` ishlating. Boshlang‘ich migratsiyada SQL CHECK va ochiq ish kuni uchun partial unique index bor; Prisma schema ularning barchasini ifodalamaydi, migratsiyani saqlang.

## Environment

| Kalit                        | Vazifa                                                                          |
| ---------------------------- | ------------------------------------------------------------------------------- |
| DATABASE_URL                 | PostgreSQL ulanishi. Docker ichida host `db`, lokalda `localhost`               |
| POSTGRES_PASSWORD            | Compose PostgreSQL paroli; URL bilan mos bo‘lsin                                |
| APP_URL                      | To‘liq trusted origin; productionda `https://crm.example.uz`                    |
| APP_TIMEZONE                 | Hozirgi business timezone `Asia/Tashkent`; boshqa qiymat qo‘llab-quvvatlanmaydi |
| DATA_ENCRYPTION_KEY          | 64 hex belgi; AES-256-GCM passport encryption                                   |
| SEED_ADMIN_PASSWORD          | Development seed va bir martalik production bootstrap paroli                    |
| SEED_EMPLOYEE_PASSWORD       | Faqat development employee seed paroli                                          |
| TELEGRAM_BOT_TOKEN           | BotFather bergan token                                                          |
| TELEGRAM_ADMIN_CHAT_ID       | Ofisda chat berilmagan bo‘lsa fallback group/chat                               |
| GOOGLE_SHEET_ID              | Ixtiyoriy dastlabki spreadsheet ID; Settings orqali saqlanadi                   |
| GOOGLE_SERVICE_ACCOUNT_EMAIL | Google service account email                                                    |
| GOOGLE_PRIVATE_KEY           | PEM key; `\n` escape qilingan newline ham qabul qilinadi                        |

JWT ishlatilmaydi: xavfsiz opaque database session tanlangan. Shuning uchun `JWT_SECRET`/`NEXTAUTH_SECRET` talab qilinmaydi. `.env` Git va Docker build kontekstidan chiqarilgan; Compose qiymatlarni runtime orqali beradi.

## Telegram konfiguratsiyasi

1. BotFather orqali bot yarating va tokenni `.env`ga yozing.
2. Botni tegishli guruhga qo‘shing. Sozlamalar -> Ofisda group chat ID kiriting. Foydalanuvchi botga shaxsiy `/start` yuborgan bo‘lishi kerak.
3. Super Admin Xodimlar -> Tahrirlash orqali Telegram User ID/Chat IDni biriktiradi. Qo‘lda bog‘lash `telegramVerified=false` bo‘ladi.
4. Sozlamalar -> Connect Telegram bir martalik 10 daqiqalik token beradi. `/start TOKEN` yuborish hisobni tasdiqlaydi. `POST /api/telegram/connect` har bir authenticated user uchun ochiq.
5. Worker `getUpdates` orqali polling qiladi; webhook yoqilgan bo‘lsa uni Telegramda olib tashlang. Bitta botga boshqa polling consumer ulamang.

Notification web bazaga yoziladi. Chat yo‘q bo‘lsa `SKIPPED` (web-only), yuborish xatosi bo‘lsa `FAILED`. Worker 6 urinishgacha exponential retry qiladi; Super Admin markazda qayta yuborishi mumkin. Telegram uzilib qolsa asosiy CRUD davom etadi. At-least-once delivery: Telegram javobi yo‘qolgan holatda takroriy xabar ehtimoli bor.

## Google Sheets konfiguratsiyasi

1. Google Cloud loyihasida Sheets API ni yoqing va service account yarating.
2. Jadvalni service account emailiga Viewer sifatida share qiling. Credentialsni faqat `.env`ga kiriting.
3. Sozlamalar -> Google Sheets -> Ulanish qo‘shish: spreadsheet ID, range va column mapping kiriting.
4. Range sarlavhani tashlab ketsin: `Rentals!A2:L`. Indexlar 0 dan boshlanadi. Misol:

```json
{
  "sourceId": 0,
  "plate": 1,
  "customerName": 2,
  "phone": 3,
  "passport": 4,
  "passportDetails": 5,
  "rentalStart": 6,
  "rentalEnd": 7,
  "contractNumber": 8,
  "issuedBy": 9,
  "acceptedBy": 10,
  "notes": 11
}
```

`sourceId` unique, o‘zgarmas yozuv ID bo‘lishi kerak, qator raqami emas. Sanalar aniq timezone bilan ISO-8601: `2026-09-06T10:00:00+05:00`. Avtomobil avval Cars modulida mavjud bo‘lsin. Import bitta noto‘g‘ri qator, takror sourceId yoki noma’lum avtomobilni topsa butun batchni bekor qiladi va eski cache saqlanadi. 20 000 qator/batch limiti bor; kattaroq jadvallarni alohida range/configlarga ajrating.

`Sync Now` hamda kunlik worker sync bir xil service ishlatadi. Upsert mavjud IDlarni yangilaydi; Sheetdan o‘chirilgan qatorlar rental historydan avtomatik o‘chirilmaydi. Bu tarixni tasodifan yo‘qotishdan saqlaydi; source deletionni biznes tekshiruvidan keyin alohida amalga oshiring. Import qaytargan xodim nomlari external tarix maydonlari, ichki User bilan avtomatik taxminiy bog‘lanmaydi.

Rental qidiruv faqat local cachega murojaat qiladi. Fine timestamp uchun `[rentalStart, rentalEnd)` ishlatiladi; bir nechta mos yozuv bo‘lsa barchasi ko‘rsatiladi. Passport raqami, passport tafsilotlari va erkin rental notes faqat `rentals.sensitive` permissionga ega rollarga beriladi.

## Scheduler

Alohida worker, har 30 soniyada tick:

| Vaqt (Asia/Tashkent) | Ish                                         |
| -------------------- | ------------------------------------------- |
| 06:00 dan keyin      | Kunlik Sheets sync                          |
| 08:00 dan keyin      | Hujjatlarni tekshirish (7,3,1,0; sozlanadi) |
| 10:10 dan keyin      | Ofis attendance hisoboti                    |
| 22:10 dan keyin      | Yetishmayotgan checkout hisoboti            |

Kun davomida kech ishga tushsa shu kunning bajarilmagan ishlarini bajaradi; o‘tgan kunlarni qayta yubormaydi. Transaction advisory lock va ScheduledJob keylar takror daily eventlarni cheklaydi. Hujjat muddati tugagach bir marta xabar; yangi expiry sana yangi notification sikli. Xodim checkout qilganda Office closed xabari darhol navbatga yoziladi (bu butun ofisning fizik yopilganini avtomatik isbotlamaydi).

## Production deployment

1. Ishlaydigan PostgreSQL va HTTPS domain/reverse proxy tayyorlang.
2. Production `.env`: `DATABASE_URL=postgresql://rentcar:<password>@db:5432/rentcar?schema=public`, kuchli parol va encryption key, haqiqiy HTTPS `APP_URL`.
3. `docker compose up -d --build`. `migrate` tugagach web va worker boshlanadi. DB tashqariga ochilmagan; web faqat localhost:3000 ga bind qilingan.
4. Bo‘sh production bazada `docker compose exec web npm run auth:bootstrap`. Bu faqat ilk Super Admin va ofis/rollarni yaratadi. Keyin bootstrap parolini environmentdan olib tashlang; seedni productionda ishlatmang.
5. Caddy/Nginx bilan TLS terminate qiling, 64 KB request body limit va login uchun edge IP rate limit qo‘ying. Web API o‘zi ham per-login DB rate limitga ega.
6. Database avtomatik backup, restore mashqi, worker process monitoring va log aggregationni infratuzilmada yoqing. `GET /api/health` DB holatini tekshiradi.

Production cookie `Secure`, `HttpOnly`, `SameSite=Lax`. To‘g‘ridan-to‘g‘ri oddiy HTTP production login uchun mos emas. Sessions 12 soat. Role o‘zgarishi, password reset yoki deactivate sessiyalarni bekor qiladi. Password reset, role, Telegram assignment faqat Super Admin. Xodim/avtomobil o‘chirish tarixni saqlagan holda inactive/archive qiladi.

## Testlar

```sh
npm run typecheck
npm test
npm run build
npm audit
```

Haqiqiy DB/API regression testlari alohida test yoki development bazada, seed va `npm run dev`dan keyin:

```sh
RUN_INTEGRATION=1 npm run test:integration
```

Test faqat o‘zi yaratgan xodim/avtomobil yozuvlarini olib tashlaydi; expiration tekshiruvi mavjud development hujjatlari uchun ham notification yaratishi mumkin. Production bazada ishlatmang. Telegram va Google uchun haqiqiy tarmoq integratsiyasi tegishli kalitlar bilan alohida stagingda tekshiriladi.

## Kengaytirish nuqtalari va chegaralar

Role.permissions yangi rollarga yo‘l ochadi; yangi login provider umumiy session servicega ulanadi. Office entity mavjud, joriy scheduler barcha ofislar uchun Asia/Tashkent 10:00–22:00 qoidalariga asoslangan. File optional hozir HTTPS hujjat havolasi; yopiq fayl upload/object storage alohida qo‘shiladi. GPS, to‘lovlar, booking, SMS va mobil API keyingi modullar uchun mo‘ljallangan, bu versiyada amalga oshirilmagan.

Tizim real Google/Telegram credentials va tashqi production serverga avtomatik joylanmagan. Docker konfiguratsiyasi bor; ushbu kompyuterda Docker yo‘q bo‘lsa konteyner smoke-testini deploy muhitida bajarish kerak. Runtime dependency overrides xavfsizlik patchlarini qo‘llaydi; yangilashda `npm audit`, Prisma generation, build va integratsiya testlarini birga bajaring.

## Telegram Mini App

`/mini` mobil xodim kabineti: Telegram orqali tasdiqlangan kirish, davomat, hisobot, servis, avtomobil qidirish va xabarlar. [Telegram va serverga o‘rnatish qo‘llanmasi](docs/TELEGRAM_MINI_APP.md). HTTPS domen va `.env`dagi bot tokenidan keyin `npm run telegram:setup` bot menyusini sozlaydi.
