# Bosqichlar — bajarilgan ishlar va tekshirish

## Phase 1 — Poydevor, baza, login va rollar

- Yaratildi: Next.js, TypeScript, Tailwind, PostgreSQL/Prisma, bcrypt, HttpOnly database session, permission-based RBAC, login rate limit.
- Fayllar: `package.json`, `prisma/schema.prisma`, `prisma/migrations/202609060001_initial/`, `src/modules/auth/*`, `src/lib/db.ts`, `src/lib/validation.ts`.
- Baza: Role, User, EmployeeProfile, Office, Session, LoginAttempt va asosiy relationlar.
- Tekshirish: `npm run db:migrate`, `npm run db:seed`; login va ruxsatsiz API uchun 401/403 integratsion testlari.

## Phase 2 — Xodimlar, davomat, kunlik hisobot

- Yaratildi: xodim qo‘shish/tahrirlash/nofaol qilish, parol/rol yangilash, check-in/out va daily report.
- Yakuniy talab: vaqt qo‘lda, qurilma IANA timezoneida; 10:00 dan keyin sabab majburiy; yozuv yuborish vaqti alohida.
- Fayllar: `src/modules/employees/`, `src/modules/attendance/`, `src/modules/reports/`, `src/components/attendance-form.tsx`, `src/components/records.tsx`.
- Baza: Attendance, DailyTask; migration `202609060002_manual_attendance_timezone` timezone va recordedAt maydonlarini qo‘shadi. Bir xodimda bir ochiq smena partial unique index bilan himoyalangan.
- Tekshirish: parallel check-in, no-spoof employeeId, manuel vaqtdan LATE hisobi va qayta checkout testlari; brauzerda 09:59, 10:00, 10:01 holatlari.

## Phase 3 — Avtomobillar va servis

- Yaratildi: grid/table, global qidiruv, profil tablari, arxivlash, status tarixi, servis turlari va xizmat yozuvlari.
- Fayllar: `src/modules/cars/`, `src/components/car-profile.tsx`, `src/components/record-form.tsx`.
- Baza: Car, CarService, ServiceType, CarStatusHistory; normalizedPlate UNIQUE, mileage CHECK.
- Tekshirish: raqamning probel/harf normalizatsiyasi, duplicate 409, authenticated employee binding, monotonic mileage.

## Phase 4 — Hujjatlar va notification center

- Yaratildi: hujjat yaratish/yangilash, custom tur, mas’ul/qo‘shimcha recipient, expiry interval va web notification.
- Fayllar: `src/modules/documents/`, `src/modules/notifications/`, `src/components/settings-panel.tsx`.
- Baza: CarDocument, DocumentType, TelegramRecipient, Notification, SystemSetting; expiry >= start CHECK.
- Tekshirish: hujjat yangilanishidagi old/new audit, mas’ulga yo‘naltirish va dedupe.

## Phase 5 — Telegram va rejalashtirilgan ishlar

- Yaratildi: Bot API client, durable outbox, retry, lease/claim, `/start` bir martalik ulanish, attendance/closing hisobotlari.
- Fayllar: `src/modules/telegram/`, `src/worker/`.
- Baza: TelegramLinkToken, ScheduledJob; Notification delivery holatlari.
- Tekshirish: mocked Telegram xatosida FAILED, retryda SENT, qayta scheduler tickda daily key takrorlanmasligi.
- Tashqi shart: haqiqiy bot tokeni va chat ID hali kiritilmagan; jonli yuborish stagingda tekshiriladi.

## Phase 6 — Google Sheets va rental/fine

- Yaratildi: configurable mapping, service account OAuth, transactional upsert/cache, Sync Now, sana/raqam va aniq jarima vaqti qidiruvi.
- Fayllar: `src/modules/google-sheets/`, `src/modules/rentals/`, `src/components/rental-search.tsx`.
- Baza: GoogleSheetsConfig, RentalRecord; source key unique, rental end > start CHECK; passport AES-256-GCM.
- Tekshirish: import upsert, invalid batch rollback, network failure cache retention, passport employee redaction va fine interval.
- Tashqi shart: haqiqiy Sheet va service account credentials hali kiritilmagan.

## Phase 7 — Audit, xavfsizlik, UI va topshirish

- Yaratildi: audit, Origin/CSRF himoyasi, secure session, validation/error mapping, JSON INFO/WARN/ERROR, production Docker va HTTPS proxy konfiguratsiyasi.
- Hydration tuzatildi: server snapshot + bir xil o‘zbekcha sana formatlari; brauzerda yangi issue yo‘q. Login formasi native POST fallbackga ega, credential query stringga tushmaydi.
- Fayllar: `src/lib/audit.ts`, `src/lib/errors.ts`, `src/lib/display-date.ts`, `next.config.ts`, `Dockerfile`, `compose*.yaml`, `deploy/Caddyfile`, `docs/*`.
- Baza: AuditLog; muhim domain yozuvi va audit bitta transactionda.
- Tekshirish: TypeScript, unit/integration testlar, production build, dependency audit. Docker mavjud bo‘lmagani uchun container/HTTPS smoke-test VPSda bajariladi.

## Topshirish hujjatlari

- `FOYDALANISH_QOLLANMASI.md` — xodim va administrator uchun.
- `TAQDIMOT.md` — qaysi link va 7 daqiqalik demo tartibi.
- `VPS_DEPLOYMENT.md` — server, domen, HTTPS, DB migration/backup/restore.
- `API.md` — endpointlar va ruxsatlar.
- `ARCHITECTURE.md` — ER, auth, integrations va scheduler.

## Telegram Mini App qo‘shimchasi

Yaratildi: `/mini` xodim kabineti, Telegram HMAC orqali kirish, xotirada saqlanadigan 4 soatlik sessiya, mavjud APIga bearer kirish, bot menyusini sozlash va ulanish tasdiq xabari.

Asosiy fayllar: `src/components/mini-app.tsx`, `src/app/mini/page.tsx`, `src/modules/telegram/auth.ts`, `src/modules/telegram/validation.ts`, `scripts/setup-telegram.ts`, `docs/TELEGRAM_MINI_APP.md`. Auth service, API dispatcher, umumiy API client va CSP integratsiya qilindi.

Baza: yangi jadval/migratsiya yo‘q; Session, EmployeeProfile, Notification va AuditLog ishlatiladi.

Tekshiruv: production build, 16 unit test va 21 integratsiya test natijasi o‘tdi. Telegram initData testlarda imzolangan fixture, tashqi adapterlarda mock HTTP ishlatiladi. Real Telegram + HTTPS VPS sinovi token va domendan keyin bajariladi.
