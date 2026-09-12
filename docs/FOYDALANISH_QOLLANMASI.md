# RentCar — foydalanish qo‘llanmasi

## 1. Tizimni qayerdan ochaman?

**Hozir ushbu kompyuterda:** [http://localhost:3000](http://localhost:3000). Login sahifasi: [http://localhost:3000/login](http://localhost:3000/login).

`localhost` — aynan saytni ochayotgan kompyuter. Bu havolani boshqa kishiga yuborsangiz, u sizning kompyuteringizdagi tizimni ochmaydi. Ofisdagi proyektor yoki screen sharing orqali taqdimotda hozirgi havola yetarli. Mustaqil tashqi kirish uchun VPS va domen kerak. VPS sozlangach havola `https://SIZNING-DOMENINGIZ` bo‘ladi; hozir bunday public manzil yaratilmagan.

Tizim ishlashi uchun web server va PostgreSQL, avtomatik xabarlar uchun esa worker ham ishlab turishi kerak. Kompyuter o‘chsa, lokal tizim ishlamaydi. Ushbu Mac uchun baza loyiha ichidagi `.local/postgres` papkasida saqlanadi; `.local`ni o‘chirmang. `RentCarni ishga tushirish.command` fayli lokal serverni boshlaydi. Kompaniya uchun doimiy internet xizmati sifatida VPSdan foydalaning.

## 2. Birinchi kirish

1. Login sahifasini oching.
2. Administrator loginini kiriting: `superadmin`.
3. Sizga chatda berilgan parolni yozing. U mahalliy `.env`da `SEED_ADMIN_PASSWORD` sifatida saqlangan. Qo‘llanmaga parol kiritilmadi, shuning uchun qo‘llanmani boshqalarga ko‘rsatish mumkin.
4. **Tizimga kirish** tugmasini bosing.

Oddiy email bilan o‘z-o‘zidan ro‘yxatdan o‘tish yo‘q. Har bir hisobni Super Admin yaratadi. Parol unutilsa, Super Admin uni yangilaydi. 15 daqiqada ortiqcha kirish urinishlari vaqtincha cheklanadi.

## 3. Rollar

| Rol         | Kim uchun              | Asosiy huquqlar                                                                              |
| ----------- | ---------------------- | -------------------------------------------------------------------------------------------- |
| SUPER_ADMIN | Direktor / tizim egasi | Xodim, rol, parol, Telegram, barcha modullar, audit va integratsiyalar                       |
| ADMIN       | Operatsion menejer     | Avtomobil, servis, hujjat, umumiy davomat/hisobot, rental va passport                        |
| EMPLOYEE    | Xodim                  | O‘z davomat/hisoboti, servis qo‘shish, avtomobilni ko‘rish va rental qidiruv; passport yopiq |

Sidebar faqat ruxsat berilgan bo‘limlarni ko‘rsatadi. Havolani qo‘lda yozish qo‘shimcha huquq bermaydi.

## 4. Dashboard

Dashboardda jami avtomobillar, faol xodimlar, bugun kelganlar, kechikkanlar, servisdagi avtomobillar va hujjat muddatlari ko‘rinadi. Pastda servis faoliyati va shaxsiy bildirishnomalar bor.

Yuqoridagi global qidiruvga davlat raqami, model, brend yoki VIN kiriting. Masalan, `038`, `01A038AA` va `01 A 038 AA` mos avtomobilni topadi. Natijani bosib profilga o‘ting.

O‘ng yuqoridagi ism bosh harflarini bosib **Mening profilim**ni oching. Telefon, lavozim, rol va Telegram holati shu yerda.

## 5. Xodim yaratish va boshqarish

1. **Xodimlar → Xodim qo‘shish**.
2. Ism, familiya, telefon, lavozim, login, 12 belgidan kam bo‘lmagan parol, rol va ofisni tanlang.
3. **Saqlash**.
4. Login/parolni xodimning o‘ziga yetkazing.

**Tahrirlash** orqali rol, kontakt, Telegram ID va status o‘zgaradi. Yangi parol maydoni bo‘sh qolsa, eski parol saqlanadi. **O‘chirish** xodimni nofaol qiladi; uning ish tarixi o‘chmaydi. Nofaol xodimni tahrirlab qayta faollashtirish mumkin. Parol/rol o‘zgarsa yoki hisob nofaol qilinsa, mavjud kirish sessiyalari bekor bo‘ladi.

## 6. Har kungi xodim tartibi

### Ishga kelganda

1. Dashboard → **Ishga keldim**.
2. Sana va haqiqiy kelgan vaqtingizni qo‘lda kiriting.
3. Ekrandagi **Qurilma vaqt zonasi**ni tekshiring; u telefon/kompyuter sozlamasidan avtomatik olinadi.
4. Kiritilgan vaqt 10:00 dan keyin bo‘lsa, sababni yozing.
5. **Vaqtni saqlash**.

Kelish vaqti siz kiritgan mahalliy vaqt bo‘yicha olinadi. **09:59 va 10:00 — ON_TIME**, sabab kerak emas; **10:01 va undan keyin — LATE**, sabab majburiy. Masalan, Kuala-Lumpurda 09:54ni kiritsangiz shu joyning timezonei qo‘llanadi. Vaqtni keyinroq tizimga kiritishingiz kechikish statusini o‘zgartirmaydi. Alohida yozuv yuborilgan haqiqiy server vaqti audit uchun saqlanadi. Telefon/kompyuteringiz timezonei to‘g‘ri sozlangan bo‘lsin; tizim GPS bilan joylashuvni tekshirmaydi. Bir kun uchun takror check-in yaratilmaydi.

### Kun davomida

**Kunlik hisobotlar → Hisobot yozish**: sana, bajarilgan ish, kerak bo‘lsa avtomobil. Xodimning ismi avtomatik olinadi.

### Ketishda

Dashboard → **Ishdan ketdim** → sana va haqiqiy ketgan vaqtingizni qo‘lda kiriting → **Vaqtni saqlash**. Checkout vaqti va timezone saqlanadi, Office closed xabari navbatga yoziladi. Oldingi kundan ochiq qolgan smenani ham yakunlash mumkin. Ketish vaqti kelishdan oldin, kelish/ketish esa kelajakda bo‘lishi mumkin emas. Checkout qilish barcha xodimlar ketganini yoki ofis fizik yopilganini avtomatik anglatmaydi.

## 7. Davomat va hisobotlar

**Davomat**da kelish, ketish, status va kechikish sababi ko‘rinadi. Sana va xodim bo‘yicha filtrlang. **Kunlik hisobotlar**da xodim, sana, avtomobil va matn orqali qidiring. Employee faqat o‘z hisobot/davomatini, Admin esa umumiy ro‘yxatni ko‘radi.

## 8. Avtomobillar

1. **Avtomobillar → Avtomobil qo‘shish**.
2. Brend, model, raqam, yil, rang, dvigatel, masofa, status va joylashuvni kiriting.
3. **Saqlash**.

Raqam noyob: probel yoki katta-kichik harf bilan boshqa avtomobil sifatida saqlanmaydi. Kartalar/jadval tugmalari ko‘rinishni almashtiradi. Statuslar: **Bo‘sh**, **Ijarada**, **Servisda**, **Band qilingan**, **Mavjud emas**.

Avtomobil profilida:

- **Overview** — asosiy ma’lumotlar;
- **Documents** — hujjatlar, muddat va mas’ul;
- **Service History** — servis, sana, masofa va bajaruvchi;
- **Rental History** — mahalliy cachega olingan ijara tarixi;
- **Activity Log** — Super Admin uchun o‘zgarishlar/status tarixi.

Avtomobil modeli yoki raqami yangilanganda relation orqali boshqa sahifalarda ham yangi ma’lumot ko‘rinadi. Arxivlash faol ro‘yxatdan olib tashlaydi, tarixni saqlaydi.

## 9. Servis yozish

**Servis tarixi → Servis qo‘shish**: avtomobil, servis turi, sana, masofa va izoh. Masalan: Engine Oil Change / 52 800 km / Mobil 1 5W-30.

Bajaruvchi xodim tizimga kirgan hisobdan olinadi. Avtomobilning umumiy mileage qiymati katta yangi qiymat kiritilganda ortadi; eski servisni kiritish uni kamaytirmaydi. Admin **Yangi tur** orqali servis turini qo‘sha oladi.

## 10. Hujjatlar

**Hujjatlar → Hujjat qo‘shish**: avtomobil, tur, raqam, kompaniya, boshlanish/tugash sanasi, mas’ul xodim. Ixtiyoriy HTTPS fayl havolasi va qo‘shimcha notification oluvchilarni belgilang.

**Yangilash** orqali yangi expiry sanasini saqlang. Auditda eski/yangi qiymat qoladi. Standart ogohlantirishlar: **7, 3, 1 kun oldin va tugash kuni**. Muddati tugagan hujjat uchun ham ogohlantirish yaratiladi. Muddatlar Sozlamalarda o‘zgartiriladi.

Telegram xabari mas’ul va shu hujjatga biriktirilgan xodimlarga yuboriladi. Hamma xodimga avtomatik tarqatilmaydi.

## 11. Telegram ulash

Shaxsiy hisob: profil → **Connect Telegram** → ko‘rsatilgan `/start TOKEN`ni kompaniya botiga yuboring. Token 10 daqiqa amal qiladi. Bot orqali tasdiqlangach Telegram ID bog‘lanadi. Profilni yangilab natijani ko‘ring.

Super Admin xodim tahririda Telegram IDlarni qo‘lda ham kiritishi mumkin. Guruh hisoboti uchun **Sozlamalar → Ofis → Telegram group/chat ID**ni to‘ldiring. Bot tokeni server `.env`ida bo‘lishi kerak; UIga yozilmaydi.

## 12. Ijara / Jarima qidiruvi

1. Avtomobil raqamini kiriting.
2. Oxirgi 1, 3, 6 yoki 12 oyni tanlang.
3. Kerak bo‘lsa jarimaning aniq sana-vaqtini kiriting. Bu vaqt **Toshkent vaqti**.
4. **Qidirish**.

Natijada mijoz, telefon, ijara oralig‘i, shartnoma va topshirgan/qabul qilgan xodim ko‘rinadi. Passport va izoh faqat ruxsatli rolda ochiladi. Aniq jarima vaqti kiritilsa, tanlangan oylar o‘rniga aynan shu vaqt tekshiriladi. Bir nechta mos yozuv bo‘lsa, qaror chiqarishdan oldin ularning barchasini tekshiring.

## 13. Google Sheets

Super Admin **Sozlamalar → Google Sheets**da spreadsheet ID, range va ustun mappingni saqlaydi. Mapping 0 dan boshlanadi, `sourceId` noyob bo‘ladi, sanalar timezone bilan ISO formatda yoziladi. Texnik konfiguratsiya READMEda.

**Sync Now**dan keyin oxirgi sync vaqti, status va import soni ko‘rinadi. Qidiruv Sheetsga har safar so‘rov yubormaydi. Import xatosi eski rental tarixini o‘chirmaydi. Google kalitlari hali kiritilmagan bo‘lsa, live sync ishlamaydi.

## 14. Bildirishnomalar va audit

**Bildirishnomalar**: o‘qildi belgilash; Super Admin muvaffaqiyatsiz Telegram xabarini qayta yuborish imkoniga ega.

| Status       | Ma’nosi                             |
| ------------ | ----------------------------------- |
| Navbatda     | Yuborish kutilmoqda                 |
| Yuborilmoqda | Worker ishlayapti                   |
| Yuborildi    | Telegram tasdiqlagan                |
| Xatolik      | Qayta urinish kerak yoki kutilmoqda |
| Faqat web    | Telegram chat biriktirilmagan       |

**Audit tarixi → O‘zgarishni ko‘rish** orqali kim, qachon, nimani o‘zgartirgani hamda oldingi/yangi qiymatlar ko‘riladi.

## 15. Odatdagi muammolar

| Muammo                            | Amal                                                                       |
| --------------------------------- | -------------------------------------------------------------------------- |
| Login/parol noto‘g‘ri             | Super Admin yaratgan loginni ishlating; oddiy email yetarli emas           |
| Sahifa ochilmayapti               | Web server va PostgreSQL ishlayotganini tekshiring                         |
| Telegram kelmayapti               | Worker, bot tokeni, chat ID va foydalanuvchi botni boshlaganini tekshiring |
| Sheets vaqtincha mavjud emas      | Service account, Viewer ruxsati, sheet ID, range va mappingni tekshiring   |
| Avtomobil topilmadi               | Raqamni tekshiring, mashina arxivlangan bo‘lishi mumkin                    |
| Rental bo‘sh                      | Importni bajaring, davrni kengaytiring, Sheetdagi raqamni tekshiring       |
| Hydration issue eski oynada qoldi | Sahifani yangilang; sana formatidagi sabab tuzatildi                       |

## 16. Taqdimotdan oldin

Dashboard → Avtomobillar → bitta profil → Servis tarixi → Hujjatlar → Davomat → Rental qidiruv tartibida ko‘rsating. Google/Telegram ulanmagan bo‘lsa, ularni "ulanishga tayyor, live hisob bilan hali sozlanmagan" deb tushuntiring. Ishlamagan integratsiyani muvaffaqiyatli jonli demo sifatida ko‘rsatmang.

## Egasi hisobi va xodimlarni boshqarish

Egasi: Jaxongir Abdurazoqov. Lavozim: Community Manager. Tizim ruxsati: SUPER_ADMIN (to‘liq boshqaruv). Lavozim — erkin matn: Direktor, Menejer yoki boshqa lavozimni Xodimlar → Qo‘shish/Tahrirlash orqali yozing. Tizim ruxsat rolini alohida tanlang.

Yangi xodim uchun ism-familiyadan login taklif qilinadi; uni o‘zingiz o‘zgartirishingiz mumkin. Parolni o‘zingiz belgilang (kamida 12 belgi). Xodim shu login va parol bilan kiradi. Parolni keyin Tahrirlash → Yangi parol orqali yangilash mumkin; eski parol ochiq ko‘rsatilmaydi.

O‘chirish xodimni faol ro‘yxatdan olib tashlaydi va sessiyalarini bekor qiladi. Uning servis, davomat va audit tarixi saqlanadi. Eski login bo‘shatiladi; shu login bilan yangi xodim qo‘shish mumkin. Yangi hisobga eski shaxsning tarixi yoki Telegram ulanishi berilmaydi.

## Ofislar va rahbarga davomat ogohlantirishi

Sozlamalar → Yangi ofis qo‘shish orqali ofis nomini kiriting. Yunusobod, Oybek va Qushbegi lokal bazaga qo‘shilgan. Mavjud Toshkent ofisi va unga bog‘langan tarix saqlanadi. Xodimlar → Tahrirlash → Ofis orqali xodimlarni tegishli filialga biriktiring.

Har bir ofis kartasida rahbarning Telegram Chat IDsi yoki rahbarlar guruhining IDsi kiritiladi. Bo‘sh bo‘lsa `.env`dagi TELEGRAM_ADMIN_CHAT_ID ishlatiladi. Telegram bot tokeni va worker ishlashi kerak. Rahbar botni shaxsiy chatda /start orqali boshlashi, guruh uchun bot guruhga qo‘shilgan bo‘lishi kerak.

Har kuni Toshkent vaqti bilan 10:10 da faol xodimlardan davomat qaydi yo‘qlar uchun ofis va ism-familiya bilan ogohlantirish yaratiladi. Bu ofis yopiq ekanining tasdig‘i emas, qayd yo‘qligi haqidagi signal. Har xodim/ofis/sana uchun bitta ogohlantirish; davomat umumiy hisoboti ham saqlanadi. Xodim kech kelishni qayd qilsa, odatdagi kechikish xabari va sababi ishlaydi.

Telegram jo‘natishda xato bo‘lsa FAILED holat va retry ishlaydi. Qabul qiluvchi chat belgilanmasa faqat web bildirishnomasi saqlanadi. Bugungi 10:10 tekshiruvi allaqachon bajarilgan bo‘lsa yangi qoida keyingi kundan ishlaydi. Xizmat 10:10 dan keyin ishga tushsa shu kunning bajarilmagan tekshiruvini bajaradi.

Yangi VPSda boshlang‘ich uch ofisni qo‘shish: `docker compose exec web npm run offices:setup`. Buyruq mavjud ofislarni qayta yaratmaydi.

## Davomatni tuzatish va avtomobil rasmi

SUPER_ADMIN: Davomat → kerakli qayd → Tahrirlash. Kelish/ketish sanasi, vaqti va IANA vaqt zonasini belgilang. Kelish 10:00 dan keyin bo‘lsa kechikish sababi majburiy. Tahrirlash sababi ham kiritiladi. Kelajak va kelishdan oldingi ketish vaqti rad etiladi. Eski/yangi qiymatlar Audit Logda saqlanadi; dastlab kiritilgan vaqt tamg‘alari o‘zgarmaydi. Tarixiy tuzatish yangi kelish yoki ketish Telegram xabarini jo‘natmaydi.

Avtomobillar → Qo‘shish yoki Tahrirlash → Avtomobil rasmi yoki brend logotipi. JPG, PNG yoki WebP fayl tanlang (5 MBgacha). Rasm avtomatik kichrayib JPEG sifatida bazaga saqlanadi; shaffof logo oq fonda chiqadi. Saqlashdan keyin karta va profilda ko‘rinadi. Rasmni olib tashlash tugmasi ham mavjud. VPSga bazani ko‘chirsangiz rasmlar ham birga ko‘chadi; alohida upload papkasi talab qilinmaydi.

## Ketish sababi va avtomobil hisobotlari

Ishdan ketdim tugmasida vaqt qo‘lda kiritiladi. Mahalliy vaqt 22:00 dan oldin bo‘lsa sabab majburiy; aynan 22:00 yoki undan keyin shart emas. Super Admin tahririda ham shu qoida ishlaydi.

Web: Avtomobillar → avtomobil → Hisobotlar. Mini App: Hisobotlar → avtomobil raqami. Kunlik, haftalik yoki oylik davr va shu davr ichidagi sanani tanlang. Hafta dushanbadan boshlanadi, hisobot chegaralari Asia/Tashkentda. Tezkor ko‘rish, Telegramga yuborish va PDF yuklash mumkin. Telegramga xodimning o‘z tasdiqlangan hisobiga yuboriladi.

Matn yoki PDF formatini tanlab Oylik formatni saqlash tugmasini bosing. Standart — matn. Keyingi oyning 1-kuni 08:00 dan keyin oldingi to‘liq oy uchun har bir avtomobil hisoboti yuboriladi. Xizmat o‘chiq bo‘lsa, ishlagan kuni oldingi oyning bajarilmagan hisobotlarini yuborish navbatiga qo‘yadi. Har xodim/avtomobil/oyga bir marta; tezkor hisobot bu jadvalni bekor qilmaydi. Kunlik hisobot so‘rov bo‘yicha yuboriladi.

Avtomatik hisobot oluvchilar faol, avtomobil ko‘rish huquqiga ega, Telegrami verified va Chat IDsi mavjud xodimlardir. Hisobot servis, avtomobilga bog‘langan kunlik qaydlar, holat o‘zgarishlari va ruxsatga qarab hujjat/ijara bo‘limlarini qamraydi. Passportlar yuborilmaydi. Hujjatlar joriy qiymatlar, ijara oxirgi Google Sheets cache holati bilan olinadi.

Uzun matn bo‘laklarga ajratiladi; PDF Telegramga fayl sifatida yuboriladi. FAILED bo‘lsa retry ishlaydi. Telegram xabarni qabul qilib javobini yo‘qotsa, retry nusxa jo‘natishi mumkin.

Ko‘rinish namunasi: /telegram-preview. U bazaga ma’lumot yozmaydi va xabar yubormaydi. Ishchi Mini App: /mini.

## Sessiyalar

30 daqiqa faoliyat bo‘lmasa qayta kirish talab qilinadi. Mening profilim → Barcha qurilmalardan chiqish barcha sessiyalarni yopadi. Mini Appni bot orqali qayta oching. Batafsil xavfsizlik holati: SECURITY.md.

## OrientRentCar dizayni va xarajatlar

- Bosh sahifadagi davomat kartasida **Ishga keldim** va **Ishdan ketdim** doim yonma-yon ko‘rinadi. Ikkala tugma har doim vaqt kiritish oynasini ochadi. Takroriy kelish qaydi va kelishsiz ketishni saqlash serverda tekshiriladi.
- Kunlik hisobotda avtomobil tanlashdan keyin **Xarajat** bo‘limi bor. Summani so‘mda, ko‘pi bilan 2 kasr xona bilan kiriting; xarajat bo‘lmasa 0 qoldiring. Nima uchun sarflanganini xarajat izohiga yozing. Bajarilgan ish tavsifi alohida saqlanadi.
- Xarajatlar kunlik ro‘yxat, avtomobilning kunlik/haftalik/oylik matn va PDF hisobotlarida chiqadi. Hisobotda tanlangan davr xarajatlari yig‘indisi ham bor.
- Avtomobil profilida **Tahrirlash** avtomobil maydonlarini ochadi. **Documents** ichida **Hujjat qo‘shish**, har hujjat qatorida **Tahrirlash** bor. Hujjat turi, raqami, kompaniya, sanalar, mas’ul, havola va qo‘shimcha oluvchilar tahrirlanadi. Bu amallar server ruxsatlariga bog‘langan.
- Pastki o‘ngdagi **Dark / Light** tugmasi barcha sahifalar va Mini App uchun rang rejimini almashtiradi. Brauzer cookie’ga ruxsat bersa tanlov keyingi ochishda saqlanadi.
- Orient logotipi asl fayl holida saqlangan; shakli va rangi tahrirlanmagan. Bosh sahifa va kirish sahifasida xira fon belgisi sifatida ham ishlatiladi.

Yangilashda `202609110006_daily_expenses` migratsiyasi kerak: odatiy `npm run db:migrate` yoki Docker deploy migratsiyani qo‘llaydi. Eski hisobotlarning xarajati 0 bo‘ladi.

## Bo‘limlardagi tahrirlash va o‘chirish

Tahrirlash/o‘chirish faqat SUPER_ADMIN roli uchun: xodimlar, avtomobillar, davomat, kunlik hisobotlar, servislar, hujjatlar, ijara qidiruv natijalari, bildirishnomalar, audit yozuvlari va sozlamalardagi servis/hujjat turlari. Ofislar va Google Sheets ulanishlarida ham o‘chirish tugmasi bor; foydalanilayotgan ofis/tur/ulanish o‘chirilmaydi, avval bog‘langan yozuvlarni boshqa yozuvga o‘tkazish kerak.

O‘chirish tasdiqlash oynasidan keyin bajariladi. Xodimlar va avtomobillar oldingi kabi faol ro‘yxatdan chiqariladi, ularning tarixi saqlanadi. Boshqa o‘chirishlar auditda oldingi qiymatni saqlaydi. Audit yozuvini tahrirlash yoki o‘chirish ham alohida yangi audit yozuvini yaratadi; tizim tarixni yashirincha yo‘qotmaydi. Audit tahrirlashda amal va obyekt turi o‘zgartiriladi, bajaruvchi va vaqt saqlanadi.

Ijara natijasida mijoz, telefon, shartnoma va topshirgan/qabul qilgan ma’lumotlari tahrirlanadi. Google Sheets keyingi sinxronlashda lokal tahrirni yangilashi yoki o‘chirilgan yozuvni qayta import qilishi mumkin: doimiy tuzatishni manba jadvalda ham bajaring. Hozir yuborilayotgan Telegram xabarini o‘zgartirish/o‘chirish yuborish tugaguncha rad etiladi.

## Avtomobillar holatini boshqarish va PDF

Web menyudan **Avtomobillar holati** (`/car-status`), Telegram Mini App ichida **Holat** bo‘limini oching.

- Model yoki davlat raqami bilan qidiring.
- ADMIN va SUPER_ADMIN **Bo‘sh**, **Band**, **Egasida**, **Avtomobil yuvish joyida**, **Servisda** tugmalaridan holatni tanlaydi. Xodim holatni ko‘radi, o‘zgartira olmaydi.
- **Band** uchun kelajakdagi tugash sanasi va vaqtini kiritib **Saqlash**ni bosing. Qurilmangizning mahalliy vaqti ishlatiladi.
- Holat avtomobilning o‘zida saqlanadi: Avtomobillar bo‘limi va profil ham shu ma’lumotdan foydalanadi. Oldin ochilgan sahifani yangilang. O‘zgarish tarixi va kim o‘zgartirgani auditda saqlanadi.
- Bandlik muddati yetganda avtomobil avtomatik **Bo‘sh** holatiga o‘tadi. Worker har aylanishda (odatda 30 soniya, boshqa ishlar davomiyligiga qarab) tekshiradi; ro‘yxat, dashboard yoki PDF so‘rovida ham muddati o‘tgan holatlar yangilanadi. Ochiq Holat oynasi har 15 soniyada yangilanadi. Avtomatik o‘zgarish auditda **Tizim (avtomatik)** sifatida yoziladi. Boshqa holat tanlansa bandlik muddati tozalanadi.
- **PDF yuklab olish** tugmasi qidiruvga mos barcha sahifalardagi avtomobillarni bitta PDFga oladi. Qidiruv bo‘sh bo‘lsa barcha faol avtomobillar kiritiladi. Jadvalda model, raqam, holat va bandlik muddati, yuqorida yaratilgan vaqt va timezone ko‘rsatiladi. Arxivlangan avtomobillar kiritilmaydi.
- Bir admin tahrirlash paytida boshqasi avtomobilni yangilasa, **Yangilash** tugmasini bosib qayta tanlang.

Yangilangan kodni serverga qo‘yishda `npm ci`, `npm run db:migrate`, `npm run build` bajarilib web jarayoni qayta ishga tushiriladi. Docker deploymentda ham web va worker yangi kod bilan qayta yaratilishi kerak. Yangi migratsiyalar: `202609120007_car_status` va `202609120008_automatic_car_release`.

## Davomat va qo‘ng‘iroqcha bo‘limlari

**Davomat** oynasida ikkita alohida bo‘lim bor: **Ishga kelish / ketish** va **Xodimlarning servis ishlari**. Birinchisi kelish-ketish va sabablarni, ikkinchisi avtomobilga qaysi xodim qanday servis bajarganini ko‘rsatadi.

Profil yonidagi **qo‘ng‘iroqcha** Bildirishnomalar oynasini ochadi. Xabarlar **Ishga kelish / ketish**, **Servis ishlari**, **Hujjatlar**, **Hisobotlar**, **Boshqa** bo‘limlariga ajratilgan. Mini Appning Xabarlar oynasida ham shu bo‘limlar bor. Yangi servis yozuvi web bildirishnomasi yaratadi; bu yangi tur uchun Telegramga alohida servis xabari yuborish yoqilmagan. Mavjud davomat Telegram xabarlari o‘z tartibida ishlaydi.

Yangilashda `202609120009_notification_categories` migratsiyasi ham qo‘llanadi.

## Bildirishnomalarni sana bo‘yicha ko‘rish va PDF olish

Bildirishnomalar oynasidan alohida bo‘limni tanlang: kelish-ketish, servis, hujjatlar, hisobotlar yoki boshqa. **Barcha bo‘limlar** umumiy kunlik ro‘yxatni ko‘rsatadi.

**Sana (Toshkent vaqti)** filtri xabarning tizimga qayd etilgan sanasini tanlaydi. Avvaldan **Bugun** tanlangan; yangi kun boshlansa sana avtomatik yangilanadi. Tarixiy sanani qo‘lda tanlaganingizda u o‘zgarmaydi; bugungi kunga qaytish uchun **Bugun**ni bosing. Avval bajarilgan ish keyinroq kiritilsa, uning bildirishnomasi kiritilgan kunda chiqadi; bajarilgan sana xabar matnida saqlanadi.

**PDF yuklab olish** tanlangan sana, bo‘lim va qidiruvga mos barcha sahifalardagi xabarlarni oladi. **PDFni Telegramga yuborish** PDFni hisobingizga ulangan shaxsiy bot chatiga yuborish navbatiga qo‘yadi. Bo‘sh kunda PDFda yozuvlar yo‘qligi ko‘rsatiladi.

Botning shaxsiy chatida quyidagicha so‘rov yuboring:

```text
/hisobot 2026-09-12
/hisobot 2026-09-12 davomat
/hisobot 2026-09-12 servis
/hisobot 2026-09-12 hujjatlar
/hisobot 2026-09-12 hisobotlar
/hisobot 2026-09-12 boshqa
```

Bo‘lim yozilmasa, barcha bo‘limlar olinadi. `/pdf` ham shu buyruqning muqobili. Sana Toshkent vaqti bo‘yicha. Bot faqat administrator kiritgan, tasdiqlangan va faol Telegram IDdan shaxsiy chatdagi so‘rovni qabul qiladi. Xodim faqat o‘ziga tegishli xabarlarni oladi; tizim sozlamalarini boshqarishga ruxsatli rahbar umumiy xabarlarni oladi. PDFni yuborishdan oldin ham ruxsat qayta tekshiriladi.

Haqiqiy Telegram javobi uchun `TELEGRAM_BOT_TOKEN` va worker ishlashi kerak. Kodni serverga yangilagach web va worker jarayonlarini qayta ishga tushiring. Bu bosqichda haqiqiy Telegramga xabar yuborilmadi; bot so‘rovlari yuborilmaydigan sinovlarda tekshirildi.

Oldingi bildirishnomalar foydalanuvchi talabiga ko‘ra tozalandi. Davomat, servis va avtomobil tarixi o‘chirilmagan. Ushbu yangi PDF bildirishnomalar ro‘yxatidan tuziladi; tozalangan eski bildirishnomalar PDFga qayta qo‘shilmaydi.

## Dam olish kunini belgilash

Bosh sahifa yoki Davomat oynasidagi **Dam olish kunlarim** bo‘limida sana tanlab **Dam olish kunim** tugmasini bosing. Telegram Mini Appning **Bugun** oynasida ham shu bo‘lim bor. Dastlab ertangi sana taklif qilinadi. Sana Toshkent taqvimi bo‘yicha; o‘tgan sanani belgilash mumkin emas. Izoh ixtiyoriy. Adashib belgilansa **Bekor qilish** tugmasidan foydalaning.

Kechki 22:10 hisobotida ism-familiya, telefon raqami va kelgusi dam olish sanasi ko‘rsatiladi. Masalan:

```text
Aziz Karimov | Telefon: +998 XX XXX XX XX — ish kuni yakuni
2026-09-14 — Dam olish kuni
```

Kechki hisobot allaqachon tayyorlanganidan keyin belgilangan dam olish kuni alohida qo‘shimcha xabar sifatida navbatga qo‘yiladi. Haqiqiy Telegram xabarlari uchun bot va worker sozlangan bo‘lishi kerak.

Dam olish sanasida xodimdan kelish-ketish qaydi talab qilinmaydi. Ertalabgi hisobotda **Dam olish kuni** yoziladi, kelmagani yoki ofisni ochmagani haqida avtomatik ogohlantirish yaratilmaydi. Keyingi ish kunida oddiy davomat nazorati davom etadi. Kelish-ketish tugmalari saqlanadi: zarurat bo‘lsa xodim dam olish kunida ham ishlagan vaqtini qayd etishi mumkin.

Yangi jadval: `DayOff`; migratsiya: `202609130010_day_off`. Serverni yangilashda migratsiyani qo‘llab web va worker jarayonlarini qayta ishga tushiring.
