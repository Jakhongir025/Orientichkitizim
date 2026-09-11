# RentCar — 7 daqiqalik taqdimot rejasi

## Qaysi havola?

**Hozir:** [http://localhost:3000](http://localhost:3000). Shu kompyuterdan proyektor yoki ekran ulashish orqali ko‘rsating. Login: `superadmin`; parolni chatdagi ma’lumotdan oling, slaydga chiqarmang.

**Boshqalar mustaqil ochishi uchun:** VPS+domen sozlangach `https://SIZNING-DOMENINGIZ`. Hozir internetdan ochiladigan public havola yo‘q. Lokal linkni yuborish boshqa odamlarga tizimni ochmaydi.

## Taqdimot oldidan

1. Tizimni ishga tushiring. Ushbu Macda `RentCarni ishga tushirish.command` faylini ochish mumkin.
2. Administrator sifatida kiring.
3. Avtomobillar, hujjatlar va servislar ochilishini tekshiring.
4. Haqiqiy mijoz passportlarini ekranga chiqarmang; demo ma’lumotlardan foydalaning.
5. Google/Telegram kalitlari sozlanmagan bo‘lsa, jonli integratsiya o‘rniga arxitektura va xato/cache holatini tushuntiring.

## 0:00–1:00 — Dashboard

"Bu tizim avtopark, xodimlar, hujjatlar va kundalik ishlarni bitta joyda boshqaradi. Dashboardda mashinalar, davomat, servis va yaqin hujjat muddatlari ko‘rinadi."

Jami avtomobillar va yaqinlashayotgan hujjat muddatlarini ko‘rsating.

## 1:00–2:00 — Avtomobil va tarix

Global qidiruvga `038` yozing. Mercedes-Benz GLS 450 profiliga o‘ting. Overview, Documents va Service History tablarini oching.

"Mashina bir marta saqlanadi. Bajarilgan servis uning tarixiga xodim va sana bilan bog‘lanadi."

## 2:00–3:00 — Davomat

Dashboard → Ishga keldim. Sana, qo‘lda vaqt kiritish va qurilma timezonesini ko‘rsating. 09:59 → sabab yo‘q; 10:01 → sabab majburiy. **Demo uchun o‘z hisobingizda haqiqiy bo‘lmagan davomatni saqlamang; modalni bekor qiling.**

"Kelgan va ketgan vaqt qo‘lda kiritiladi, joylashuvning qurilma timezoneida hisoblanadi. Yozuv yuborilgan haqiqiy vaqt ham audit uchun saqlanadi."

## 3:00–4:00 — Kunlik ish va servis

Kunlik hisobotlar va Servis tarixi bo‘limlarini oching. Yangi servis formasi orqali xodimning ismi qo‘lda so‘ralmasligini ko‘rsating. Test yozuv yaratadigan bo‘lsangiz, aniq demo avtomobil/xodimdan foydalaning.

## 4:00–5:00 — Hujjat va notification

Hujjatlar bo‘limida expiry va mas’ulni ko‘rsating. Bildirishnomalarda yuborish statuslarini tushuntiring.

"Tizim 7, 3, 1 kun oldin va tugash kuni mas’ullarga xabar tayyorlaydi. Telegram uzilib qolsa, xabar bazada qoladi va qayta yuboriladi."

## 5:00–6:00 — Jarima bo‘yicha kimda bo‘lganini topish

Ijara / Jarima qidiruvi: raqam, davr va aniq jarima vaqtini ko‘rsating. Import hali yo‘q bo‘lsa, bo‘sh natijani to‘g‘ri tushuntiring.

"Qidiruv har safar Googlega so‘rov yubormaydi: ma’lumot avval mahalliy bazaga sinxronlanadi. Passport faqat ruxsatli rollarda ochiladi."

## 6:00–7:00 — Nazorat va keyingi ishga tushirish

Xodimlar, rollar va Audit tarixini ko‘rsating. Yakunda tushuntiring: kod, migration, Docker va worker tayyor; haqiqiy domen, Google va Telegram credentials orqali production ishga tushirish yakunlanadi.

## Savollarga qisqa javoblar

- **Telefon orqali ishlaydimi?** Moslashuvchan UI bor; barcha joydan ochilishi uchun VPS kerak.
- **Vaqt avtomatikmi?** Qurilma timezonei avtomatik; kelish/ketish vaqtini xodim qo‘lda kiritadi.
- **Internet uzilsa?** Brauzerdan yangi yozuv yuborish uchun serverga ulanish kerak. Tashqi Telegram/Google uzilishi mavjud asosiy yozuvlarni o‘chirmaydi.
- **Xodim o‘chirilsa tarixchi?** Xodim nofaol qilinadi, tarix saqlanadi.
- **Keyin kengaytirish mumkinmi?** API va modul servislari bor; booking, to‘lov, GPS va mobile alohida qo‘shilishi mumkin.
