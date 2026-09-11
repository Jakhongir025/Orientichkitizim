# RentCar: Telegram Mini App va serverga ulash

## Qaysi serverni tanlash kerak?

Boshlash uchun DigitalOcean Basic, 2 vCPU / 4 GB RAM / 80 GB SSD konfiguratsiyasini tavsiya qilamiz. Rasmiy narx sahifasida regular tarif $24/oy; backup, domen va soliqlar alohida bo‘lishi mumkin. Bu kichik jamoa uchun boshlang‘ich taxmin, yuklama kafolati emas. Build yoki yuklama vaqtida xotira yetmasa 8 GBga kengaytiring.

Narx: https://www.digitalocean.com/pricing/droplets

Ubuntu 24.04 LTS x64 tanlang. Hududni xodimlaringiz internetidan kechikishni tekshirib tanlang. Bir VPS ichida web, worker, PostgreSQL va HTTPS proxy ishlaydi. Kompyuteringiz yoqilgan turishi shart emas.

## To‘liq server o‘rnatish

Ketma-ket buyruqlar, mavjud bazani ko‘chirish va backup/restore: [VPS_DEPLOYMENT.md](VPS_DEPLOYMENT.md).

Qisqa tartib:
1. VPS va domen oling. Domenning A yozuvini VPS IPga yo‘naltiring.
2. Docker Engine va Compose plugin o‘rnating. SSH portini saqlab, 80/443ni oching; 3000/5432ni internetga ochmang.
3. Kodni `/opt/rentcar`ga ko‘chiring. Lokal `.local`, `node_modules` va `.next*`ni ko‘chirmang.
4. `.env.example`dan `.env` yarating. `APP_URL=https://sizning-domeningiz`, `RENTCAR_DOMAIN=sizning-domeningiz`, baza paroli, DATABASE_URL va encryption keyni kiriting. Mavjud bazani ko‘chirsangiz uning encryption keyini saqlang.
5. Yangi, bo‘sh baza uchun:

```sh
cd /opt/rentcar
docker compose -f compose.yaml -f compose.production.yaml up -d --build
docker compose exec web npm run auth:bootstrap
```

Mavjud ma’lumotlar uchun yuqoridagi VPS qo‘llanmasidagi **4B** yo‘lini bajaring. Demo seedni productionda ishlatmang.

## Telegramni yoqish

1. Telegramda rasmiy `@BotFather` orqali `/newbot` yarating yoki mavjud botni tanlang.
2. Bot tokenini **serverdagi `.env` fayliga** kiriting:

```env
TELEGRAM_BOT_TOKEN=BOTFATHER_BERGAN_TOKEN
APP_URL=https://sizning-domeningiz
```

`api_id` va `api_hash` talab qilinmaydi. Bot tokeni yetarli. Uni chat, screenshot yoki repositoryga joylamang.

3. Environmentni yangilang va botning pastki menyusini sozlang:

```sh
docker compose -f compose.yaml -f compose.production.yaml up -d --force-recreate web worker
docker compose exec web npm run telegram:setup
```

Bu botga **RentCarni ochish** menyu tugmasini o‘rnatadi. Tugma `https://sizning-domeningiz/mini`ni ochadi. Faqat buyruqni ishga tushirganda Telegram sozlamasi o‘zgaradi.

4. BotFatherda Main Mini Appni ham yoqing: `/mybots` → bot → Bot Settings → Configure Mini App. Mini App URL: `https://sizning-domeningiz/mini`. Telegram versiyasiga qarab menyu nomlari farqlanishi mumkin.
5. Worker `getUpdates` orqali ishlaydi. Botda oldindan webhook bo‘lsa, uni bekor qilish kerak; bir botni boshqa polling xizmatiga bir vaqtda ulamang.

Rasmiy qo‘llanma: https://core.telegram.org/bots/webapps

## Xodim hisobini ulash

1. Super Admin web panelda xodim yaratadi va login/parol beradi.
2. Xodim web panelga bir marta kiradi, profilidan **Connect Telegram**ni bosadi.
3. Ko‘rsatilgan `/start KOD`ni aynan kompaniya botining shaxsiy chatiga yuboradi. Kod 10 daqiqa amal qiladi.
4. Worker kodni tekshirib, Telegram hisobini xodimga bog‘laydi. Web profilda `telegramVerified` tasdiqlangan bo‘lishi kerak. Admin tomonidan IDni shunchaki yozish kirish uchun yetarli emas.
5. Bot chatidagi **RentCarni ochish** tugmasini bosadi. Endi har safar login/parol yozish talab qilinmaydi.

## Xodimning kundalik ishlashi

- **Ishga keldim**: sana va haqiqiy kelgan vaqtini qo‘lda kiritadi. Qurilma timezone’i avtomatik olinadi. Aynan 10:00 yoki oldin sabab kerak emas; keyin sabab majburiy.
- **Ishdan ketdim**: ketgan sana/vaqtini kiritadi. Kelishdan oldingi vaqt qabul qilinmaydi.
- **Kunlik hisobot**: qilgan ishini yozadi, kerak bo‘lsa avtomobilni tanlaydi.
- **Servis ishi**: avtomobil, xizmat turi, sana, kilometr va izohni kiritadi. Xodim nomi hisobdan avtomatik olinadi.
- **Avtomobillar**: davlat raqami yoki model bo‘yicha izlaydi.
- **Xabarlar**: o‘ziga tegishli bildirishnomalarni ko‘radi.

Bir xil server va PostgreSQL ishlatiladi: Telegramdan kiritilgan ma’lumot web panelda ham ko‘rinadi. Webdagi xodim boshqaruvi va keng admin funksiyalari saqlanadi. Ofis scheduler vaqti Asia/Tashkent; xodim davomatining timezone’i uning qurilmasidan olinadi.

## Taqdimot havolalari

- Hozir web: `http://localhost:3000` — shu kompyuterda.
- Hozir Mini App kirish sahifasi: `http://localhost:3000/mini`. Oddiy brauzerda Telegramdan ochish ko‘rsatmasi chiqadi; bu qalbaki Telegram login bermaydi.
- Serverga o‘rnatilgach web: `https://sizning-domeningiz`.
- BotFather Main Mini App yoqilgach Telegram: `https://t.me/SIZNING_BOT_USERNAME?startapp` yoki bot menyusidagi tugma.

Bu domen va bot username qiymatlari misol. Hozir real public server yoki bot havolasi yaratilmagan.

## Kirish xavfsizligi va cheklovlar

Backend Telegram initData imzosini bot tokeni bilan tekshiradi, 5 daqiqadan eski launchni rad etadi. Faqat faol, oldindan bog‘langan va tasdiqlangan xodim kiradi. Mini App sessiyasi 4 soat amal qiladi, faqat xotirada saqlanadi; cookie bloklangan Telegram Web ichida ham API bearer orqali ishlaydi. Sessiya tugasa Mini Appni yopib qayta oching. Oddiy brauzer loginining HttpOnly cookie sessiyasi alohida saqlanadi.

Barcha o‘zgarishlarda mavjud server ruxsatlari, validation va audit ishlaydi. Mini App sahifasinigina Telegram Web iframe ichida ochishga ruxsat berilgan. Bazaga yangi migratsiya kerak emas — mavjud Session, EmployeeProfile va AuditLog modellari ishlatiladi.

## Ishga tushirgandan keyingi tekshiruv

- Web login va xodim yaratish ishlashini tekshiring.
- Bir sinov xodimini Telegramga ulang; Android/iOS va Telegram Webda Mini Appni oching.
- 09:59, 10:00 va 10:01 uchun sabab maydonini tekshiring.
- Haqiqiy sinov davomat, hisobot va servis qaydini yuboring, web panelda ko‘ring.
- Hisobni deactivate qiling: Mini Appning keyingi API so‘rovi rad etilishi kerak.
- Web/worker loglarini va bildirishnoma yuborilishini tekshiring.
- Backupni alohida joyga avtomatik nusxalang va restore sinovini bajaring.

Docker/VPS va haqiqiy Telegram muhiti bu lokal ish jarayonida ishga tushirilmagan. Ular server, domen va token bilan yakuniy sinovni talab qiladi.

## Yangilangan imkoniyatlar

To‘liq boshlang‘ich o‘rnatish: [VS Code → VPS → domen → Telegram](ISHGA_TUSHIRISH_QADAMMA_QADAM.md).

Mini App sayt bilan bir xil brend, rang va kartalardan foydalanadi. Checkout 22:00 dan oldin bo‘lsa sabab majburiy, 22:00 yoki keyin ixtiyoriy. Avtomobil hisobotlari kunlik, haftalik va oylik, matn yoki PDF formatida mavjud. `/telegram-preview` interaktiv namuna, haqiqiy Telegram yuborishi emas.

Yuqoridagi eski sessiya tavsifiga qo‘shimcha: sessiya 4 soatlik mutlaq muddatdan tashqari odatda 30 daqiqalik faolsizlik chegarasiga ega (`SESSION_IDLE_MINUTES`). Telegram launch ma’lumoti bir martalik; qayta kirish uchun Mini App’ni yopib oching. Yangi migratsiyalar `earlyLeaveReason`, hisobot formati, PDF notification ma’lumotlari, `Session.lastSeenAt` va notification ruxsatlarini saqlaydi; yangilashda `db:migrate` kerak. [Xavfsizlik tafsilotlari](SECURITY.md).
