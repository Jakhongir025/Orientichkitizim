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

1. Super admin xodim yaratib login/parol beradi va uning Telegram User ID raqamini yozadi.
2. Xodim botda `/start` bosadi, umumiy Mini App tugmasini ochadi.
3. Login/parolni kiritadi. Telegram ID mosligi imzo orqali tekshiriladi va shaxsiy chat tasdiqlanadi. Alohida ulash kodi kerak emas.

## Xodimning kundalik ishlashi

- **Ishga keldim**: sana va haqiqiy kelgan vaqtini qo‘lda kiritadi. Toshkent vaqti ishlatiladi. Aynan 10:00 yoki oldin sabab kerak emas; keyin sabab majburiy.
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

Backend Telegram initData imzosini bot tokeni bilan tekshiradi, 5 daqiqadan eski launchni rad etadi. Faol xodim login/parol va admin oldindan kiritgan Telegram ID bilan kiradi. Mini App sessiyasi 4 soat amal qiladi, faqat xotirada saqlanadi; cookie bloklangan Telegram Web ichida ham API bearer orqali ishlaydi. Sessiya tugasa Mini Appni yopib qayta oching. Oddiy brauzer loginining HttpOnly cookie sessiyasi alohida saqlanadi.

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

## Pastki menyu va avtomobil profili

Mini Appning bo‘limlari ekranning pastida turadi; sahifa mazmuni alohida aylantiriladi. Avtomobillar ro‘yxatidagi model yoki raqamni bosish avtomobil profilini Mini App ichida ochadi. Ro‘yxatga qaytish tugmasi va Telegramning orqaga tugmasi ishlaydi. Profil amallari foydalanuvchi ruxsatlari bilan cheklangan.

Shakl ochilganda pastki menyu berkitiladi; klaviatura balandligiga qarab shaklning aylantiriladigan maydoni moslashadi. Server 45 soniyada javob bermasa, kutish tugaydi va tushunarli xabar chiqadi. Saqlash javobi kechiksa, takror yuborishdan oldin yozuv saqlanganini tekshiring.

## Mini Appga login/parol bilan kirish (2026-09-13)

1. Super admin «Xodimlar» bo‘limida xodimning login/parolini yaratadi va aynan uning raqamli Telegram User ID raqamini kiritadi. Username ID o‘rnini bosmaydi.
2. Xodim botni ochib `/start` bosadi va umumiy Mini App tugmasini ochadi. Har bir xodimga alohida ulash havolasi yoki ulash kodi kerak emas.
3. Mini Appda login va parolni kiritadi. Server parol bilan birga Telegram imzosini va admin biriktirgan ID mosligini tekshiradi. Muvaffaqiyatli kirishda shaxsiy chat biriktiriladi.
4. «Holat» bo‘limidagi «PDFni botga yuborish» faylni Telegram yuborish navbatiga qo‘shadi; Mini App ichida PDF oynasi ochilmaydi. Worker ishlayotgan bo‘lishi kerak. Oddiy brauzerda PDF yuklab olish saqlangan.
5. Pastki menyuda «Ijara / jarima» ham mavjud. Ma’lumotlar foydalanuvchi ruxsatlari bilan cheklanadi. «Ortga» tugmasi va Telegramning ortga tugmasi oldingi ko‘rinishga qaytaradi.
6. Next.js sinov indikatori o‘chirilgan. O‘zgarishlar ko‘rinmasa web serverni qayta ishga tushiring, Mini Appni butunlay yopib qayta oching.

Mini App Telegram ichida ochiladi; login/parol Telegram tomonidan imzolangan kirish ma’lumotini almashtirmaydi. Telegramdan tashqarida odatiy sayt loginidan foydalaning. Bot tokenini xodimlarga bermang.

## Toshkent vaqti va avtomatik PDF hisobotlar

- Davomat kiritish, ekrandagi vaqtlar va scheduler `Asia/Tashkent` bo‘yicha ishlaydi. Eski yozuvlarning haqiqiy vaqt nuqtalari qayta yozilmaydi; ular Toshkent vaqtida ko‘rsatiladi.
- Har kuni **10:10** da barcha ofislarning kelish qaydlari, kechikish sabablari, qayd qilmaganlar va dam olish kuni ko‘rsatilgan bitta umumiy PDF tayyorlanadi.
- **22:10** da umumiy yakuniy PDF: kelish/ketish, sabablar, ism-familiya, telefon va belgilangan kelgusi dam olish kunlari.
- Davomat PDFini faqat faol `SUPER_ADMIN` yoki lavozimi `Direktor`, `Director`, `Bosh administrator` bo‘lgan, Telegram hisobi tasdiqlangan foydalanuvchilar oladi. Oddiy ADMIN rolning o‘zi bu hisobot uchun yetarli emas. Lavozim «Xodimlar → Tahrirlash»da yoziladi.
- Hujjat muddati tugashiga 7 kun qolganda, keyingi barcha kunlarda va muddati o‘tganidan keyin ham yangilanguncha har kuni ertalab **08:00** da eslatma navbatga qo‘shiladi. Qabul qiluvchilar: faol `SUPER_ADMIN`, `ADMIN`, `EMPLOYEE` rollari va ulangan shaxsiy Telegram hisoblari. Har bir hujjat uchun matnli izoh va PDF fayl yuboriladi.
- «Hujjatlar» jadvalidagi **Telegramga matn va PDF yuborish** tugmasi shu hujjat ma’lumotini qo‘lda jo‘natadi. Faqat hujjat boshqarish ruxsati bor foydalanuvchi ishlata oladi.
- Xodim avval botda `/start` bosib, Mini Appga login/parol bilan kirishi kerak. Admin kiritgan Telegram ID kirayotgan hisob IDsi bilan mos bo‘lishi shart.
- Worker to‘xtagan bo‘lsa belgilangan soatda xabar ketmaydi; qayta ishga tushganda joriy kunning o‘tgan vazifalari bajariladi. Shu kun bajarilgan vazifa takrorlanmaydi.

Kod yangilangandan keyin eski worker terminalida `Ctrl+C` bosing, so‘ng loyiha papkasida `npm run worker` orqali qayta ishga tushiring. Bitta worker yetarli. Web uchun `npm run dev`; production uchun yangi build va web/worker qayta ishga tushiriladi. Mini Appni to‘liq yopib qayta oching.

### Yangilangan hujjat jadvali

Hujjatlarning avtomatik umumiy PDF hisoboti Toshkent vaqti bilan **10:30 va 21:30** da yuboriladi (oldingi 08:00 jadvali almashtirilgan). «Hujjatlar» tepasidagi **Muddati tugayotganlarni umumiy yuborish** tugmasi 7 kun ichida tugaydigan va muddati o‘tgan barcha hujjatlarni bitta PDFga jamlaydi. Har bir qabul qiluvchiga bitta fayl yuboriladi. Alohida hujjat tugmasi ham saqlangan. Mos hujjatlar bo‘lmasa xabar yuborilmaydi.

Vaqtinchalik Cloudflare tunnel jarayoni to‘xtasa Mini App ochilmaydi; yangi tunnel manzilini APP_URL hamda bot menyusida yangilash kerak. BotFather Main Mini App manzili alohida sozlangan bo‘lsa, uni ham yangilash kerak. Bot chatidagi «Tizimni ochish» menyu tugmasidan foydalaning.

### Mini Appdagi Hujjatlar bo‘limi

Pastki menyuda «Hujjatlar» mavjud. Tor telefonda menyuni yon tomonga surish mumkin. Bo‘lim veb saytdagi umumiy hujjatlar jadvali va formalaridan foydalanadi: qidiruv, hujjat qo‘shish, yangi hujjat turi, tahrirlash/o‘chirish, alohida va umumiy Telegram PDF yuborish. Tahrirlash/o‘chirish faqat SUPER_ADMIN uchun; qolgan amallar ham saytdagi ruxsatlar bilan bir xil. Telegramdagi «Ortga» tugmasi ochilgan formani yopadi.

### Hujjat hisobotini kimga yuborishni tanlash

Sayt va Mini Appda alohida/umumiy hujjat yuborish tugmasi avval qabul qiluvchini so‘raydi. ADMIN: «Faqat o‘zimga» yoki «O‘zimga va xodimlarga». SUPER_ADMIN va lavozimi Direktor/Director: qo‘shimcha «Hammaga». Hammaga tanlansa barcha rollardagi faol, Telegram hisobi tasdiqlangan foydalanuvchilarga yuboriladi. Oddiy xodim bu ommaviy yuborishni boshlay olmaydi. Avtomatik 10:30/21:30 jadvali oldingi qabul qiluvchilar bilan saqlanadi.

### Davomat PDFini istalgan vaqtda olish

Bosh administrator va lavozimi Direktor/Director bo‘lgan foydalanuvchi sayt Dashboard/Davomat bo‘limida yoki Mini App «Bugun» bo‘limida «Kunlik davomat PDF hisoboti» kartasidan sanani tanlab «Davomat PDFini so‘rash»ni bosadi. Barcha ofislar bo‘yicha tanlangan sana hisoboti faqat so‘ragan foydalanuvchining ulangan Telegram hisobiga yuboriladi. Kelajak sanasi rad etiladi. Joriy kun hisobotida so‘rov paytigacha kiritilgan ma’lumotlar bo‘ladi. Avtomatik hisobot jadvali o‘zgarmaydi.

### 22:10 dagi yakuniy umumiy PDF

Toshkent vaqti bilan 22:10 da bosh administrator va direktorning Telegram hisobiga bitta umumiy PDF yuboriladi:
- Davomat: kelish/ketish vaqti, sabablar, dam olish kunlari. Kelish qaydi bor, ketish qaydi yo‘q bo‘lsa «Hali ofisda — ketish qayd etilmagan». Ikkalasi ham yo‘q bo‘lsa bu alohida yoziladi; tizim jismoniy joylashuvni tekshirmaydi.
- Avtomobil ishlari: shu sanaga kiritilgan servis va kunlik avtomobil hisobotlari, bajargan xodim, izoh, kilometr va xarajatlar.
- Kun davomida «Holat»dan kiritilgan bandliklar: model/raqam, bandlikni kiritgan xodim, qayd vaqti va saqlangan ijara tugash sanasi. Muddat tugab avtomobil bo‘shagan bo‘lsa ham o‘sha kun qaydi chiqadi.
- Hisobot vaqtida ijaradagi avtomobillar va bandlik muddatlari.

«Ijaraga bergan» bandlikni tizimga kiritgan hisobdan olinadi. Eski yozuvda xodim yoki muddat saqlanmagan bo‘lsa «Qayd etilmagan» chiqadi. 10:10 ertalabki va qo‘lda so‘raladigan davomat hisobotlari avvalgi tartibda ishlaydi.

### 4 xonali PIN bilan kirish

Faqat Telegram Mini Appda birinchi kirishda login/parol va 4 xonali yangi PIN (takrori bilan) kiritiladi. Keyingi ochilishda shu Telegram hisobi uchun faqat PIN so‘raladi. «PINni unutdim — login/parol bilan kirish» yangi PIN o‘rnatishga imkon beradi. Oddiy veb sayt login/parol bilan ishlashda davom etadi.

PIN bcrypt xeshi alohida MiniAppPin jadvalida saqlanadi; API foydalanuvchi profilida chiqarilmaydi. Telegram imzosi, faollik, admin biriktirgan ID va parol o‘zgarmaganligi tekshiriladi. PIN kirish urinishlari Telegram ID bo‘yicha 15 daqiqada 5 tagacha; bloklanganda kutish yoki login/parol bilan kirish mumkin. Parol/Telegram ID almashtirilganda PIN qayta o‘rnatiladi. Serverga yangilashda 202609140011_mini_app_pin migratsiyasini qo‘llash kerak.
