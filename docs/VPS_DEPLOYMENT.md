# RentCar — localhostdan VPSga ko‘chirish

## Natijadagi havola

Hozir: `http://localhost:3000` — faqat shu kompyuterda. VPSga joylangach: `https://SIZNING-DOMENINGIZ` — internet orqali ochiladi, ichki ma’lumotlar login bilan himoyalanadi. Masalan, `crm.kompaniyangiz.uz` siz sotib olgan yoki boshqaradigan domenning subdomeni bo‘lishi mumkin. Bu misol; hozir public manzil mavjud emas.

## Kerak bo‘ladigan narsalar

- SSH kirishi bor Ubuntu VPS. Boshlash uchun 2 vCPU, 4 GB RAM va 40 GB SSD — yuklama o‘lchovi emas, kichik jamoa uchun boshlang‘ich konfiguratsiya taxmini. Next.js build vaqtida RAM talabi yuqoriroq bo‘lishi mumkin.
- Domen/subdomen va uning DNS sozlamasini o‘zgartirish huquqi.
- Docker Engine + Docker Compose plugin.
- Kod, PostgreSQL ma’lumotlari va maxfiy environment qiymatlari.
- Tashqi integratsiyalar uchun Google service account va Telegram bot tokeni.

Docker o‘rnatish buyruqlarining joriy manbasi: [Docker Ubuntu qo‘llanmasi](https://docs.docker.com/engine/install/ubuntu/) va [Compose plugin](https://docs.docker.com/compose/install/linux/).

## 1. DNS va server

Domen DNSda A recordni VPS IPv4ga yo‘naltiring. IPv6 ishlatmasangiz, noto‘g‘ri AAAA record qoldirmang. DNS yangilanishini kuting.

SSH portingizni saqlagan holda firewall orqali TCP 80/443ni oching. 5432 va 3000ni internetga ochmang. Agar serverda allaqachon Nginx/Caddy bo‘lsa, 80/443ni band qilib turgan xizmatni o‘chirmasdan mavjud proxy konfiguratsiyasiga ushbu loyihani qo‘shing.

Quyidagi buyruqlarda `deploy@VPS_IP` va `SIZNING-DOMENINGIZ`ni o‘zingizning qiymatlaringizga almashtiring. Buyruqlar foydalanuvchi ko‘rsatmasi uchun; agent ularni tashqi serverda bajarmagan.

## 2. Kodni ko‘chirish

VPSda:

```sh
ssh deploy@VPS_IP
sudo mkdir -p /opt/rentcar
sudo chown deploy:deploy /opt/rentcar
```

Macdagi loyiha papkasidan:

```sh
rsync -av \
  --exclude=node_modules --exclude=.next --exclude=.next-production \
  --exclude=.git --exclude=.env --exclude=.local \
  ./ deploy@VPS_IP:/opt/rentcar/
```

Yoki private Git repository ishlating. `.env`, bazaning xom katalogi va `node_modules`ni Gitga yubormang. Linux server paketlarini Docker ichida o‘zi o‘rnatadi.

## 3. Production `.env`

VPSda:

```sh
cd /opt/rentcar
cp .env.example .env
chmod 600 .env
nano .env
```

Kamida:

```env
POSTGRES_PASSWORD=YANGI_KUCHLI_DB_PAROL
DATABASE_URL=postgresql://rentcar:YANGI_KUCHLI_DB_PAROL@db:5432/rentcar?schema=public
APP_URL=https://SIZNING-DOMENINGIZ
RENTCAR_DOMAIN=SIZNING-DOMENINGIZ
APP_TIMEZONE=Asia/Tashkent
DATA_ENCRYPTION_KEY=64_HEX_BELGI
SEED_ADMIN_PASSWORD=FAQAT_BIRINCHI_ADMIN_UCHUN_KUCHLI_PAROL
```

DB paroli URL ichida ishlatilgani uchun URL-safe tasodifiy qiymat tanlang (masalan `openssl rand -hex 24`) yoki maxsus belgilarni URL-encode qiling. `APP_URL`da `https://`, `RENTCAR_DOMAIN`da esa faqat host bo‘lsin.

**Mavjud bazani ko‘chirsangiz, DATA_ENCRYPTION_KEYni aynan saqlang.** Yangi kalit mavjud passport ciphertextni ocholmaydi. Kalit va DB backupni alohida himoyalangan joyda saqlang. DB parolini almashtirish mumkin; encryption keyni ko‘chirish paytida tasodifan almashtirmang.

## 4A. Toza production bazadan boshlash

Demo ma’lumotlar kerak bo‘lmasa:

```sh
docker compose -f compose.yaml -f compose.production.yaml up -d --build
docker compose exec web npm run auth:bootstrap
```

Bu bo‘sh bazada bitta `superadmin`, rollar va ofisni yaratadi. Hisobga kirib profilni yangilang, servis/hujjat turlarini va xodimlarni qo‘shing. Bootstrap parolini `.env`dan olib tashlang va web/worker containerlarini qayta yarating. Productionda `db:seed` ishlatmang.

Caddy proxy uchun konfiguratsiya tayyor: `deploy/Caddyfile`. Domen va 80/443 ochiq bo‘lsa sertifikatni avtomatik oladi. [Caddy Automatic HTTPS](https://caddyserver.com/docs/automatic-https), [reverse proxy](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy).

## 4B. Lokal ma’lumotlarni ham ko‘chirish

Bu yo‘lni 4A o‘rniga bajaring. Migratsiyadan oldin xodimlarga lokal tizimga yangi ma’lumot kiritishni to‘xtatishni ayting va worker/webni to‘xtating; baza dump olish uchun ishlab tursin.

### Lokal bazadan dump

`pg_dump` PostgreSQL 18 client utilitasi kerak. Hozir ushbu loyiha lokal bazasi 55432 portda. Oddiy Docker development bazasi esa 5432 bo‘lishi mumkin; haqiqiy DATABASE_URLga qarang.

```sh
pg_dump -h 127.0.0.1 -p 55432 -U rentcar -d rentcar \
  --format=custom --no-owner --no-acl \
  --exclude-table-data='public."Session"' \
  --exclude-table-data='public."LoginAttempt"' \
  --exclude-table-data='public."TelegramLinkToken"' \
  --file=rentcar-backup.dump
```

Dumpdagi faol sessiyalarni olib o‘tish kerak emas. Backup maxfiy fayl: unda xodimlar, password hashlar va rental yozuvlari mavjud. Faqat o‘z VPSingizga himoyalangan SSH orqali yuboring.

`pg_dump` serverning major versiyasidan eski bo‘lmasin; eski serverga restore qilishni oddiy ko‘chirish deb qabul qilmang. Compose PostgreSQL 18 bilan tayyorlangan. [PostgreSQL pg_dump hujjati](https://www.postgresql.org/docs/current/app-pgdump.html).

```sh
scp rentcar-backup.dump deploy@VPS_IP:/opt/rentcar/
```

### VPSda bo‘sh bazaga restore

```sh
cd /opt/rentcar
docker compose up -d db
docker compose exec -T db pg_restore \
  -U rentcar -d rentcar --no-owner --no-acl --exit-on-error \
  < rentcar-backup.dump
docker compose -f compose.yaml -f compose.production.yaml up -d --build
```

Restore faqat **bo‘sh bazaga** qilinadi. Avval ishlatilgan production bazasiga ustidan qo‘llamang. Dump migration tarixini ham saqlaydi, keyingi `migrate` yangi migrationlarni qo‘llaydi. Mavjud xodimlar kelgan bo‘lsa `auth:bootstrap` kerak emas.

Mahalliy worker va VPS workerni bir bot bilan parallel yuritmang. Ko‘chirish tekshirilgach lokal worker to‘xtagan bo‘lsin. Google credentials va Telegram tokenlarini yangi serverga alohida xavfsiz ko‘chiring.

## 5. Ishga tushganini tekshirish

```sh
docker compose -f compose.yaml -f compose.production.yaml ps
docker compose logs --tail=100 web worker migrate
curl -f https://SIZNING-DOMENINGIZ/api/health
```

- HTTPS login ishlasin.
- Avtomobillar soni va bir nechta hujjat/servis tarixini solishtiring.
- Xodim rolida passport ochilmasligini tekshiring.
- Qo‘lda check-in va checkoutni sinov xodimida tekshiring.
- Telegram yuborish va Google `Sync Now`ni haqiqiy kalitlar bilan stagingda sinang.
- Xatolik bo‘lsa logsni ko‘ring; maxfiy `.env`ni chat/guruhga tashlamang.

Docker/HTTPS containerlari ushbu kompyuterda Docker bo‘lmagani sababli lokalda bajarib tekshirilmagan. Build, Prisma migratsiya va APIlar lokal Node + PostgreSQL bilan tekshiriladi; VPSda yuqoridagi smoke-test majburiy yakuniy tekshiruvdir.

## 6. Keyingi yangilanishlar

Avval backup oling. Keyin kodni yangilang va:

```sh
docker compose -f compose.yaml -f compose.production.yaml up -d --build
```

Migration xato bo‘lsa web/workerning yangilanishiga o‘tmaydi. Faqat eski imagega qaytish DB schema o‘zgarishini bekor qilmasligini inobatga oling; qaytish rejasi migrationga mos bo‘lsin.

## 7. Backup va tiklash

```sh
docker compose exec -T db pg_dump \
  -U rentcar -d rentcar --format=custom --no-owner --no-acl \
  > rentcar-backup.dump
```

Serverdan boshqa himoyalangan joyga nusxa saqlang. Backup jadvali va retentionni VPS monitoring/backup tizimida sozlang. Restore mashqini alohida bo‘sh test bazada bajaring. `docker compose down -v` DB volumeini o‘chiradi — oddiy yangilash uchun ishlatmang.

## Nega IP bilan oddiy HTTP emas?

Production cookie `Secure`; tizim HTTPS uchun qurilgan. Taqdimot va ish uchun domen + HTTPSdan foydalaning. `http://VPS_IP:3000`ni public ochish bu konfiguratsiyaning ishga tushirish yo‘li emas.
