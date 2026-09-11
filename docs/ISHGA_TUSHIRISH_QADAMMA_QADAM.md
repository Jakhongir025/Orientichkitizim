# RentCar: VS Code’dan domen va Telegramgacha

Bu qo‘llanma loyiha papkasi qo‘lingizda bo‘lgan holatdan boshlanadi. VS Code faqat kod muharriri: sayt ishlashi uchun Node.js, PostgreSQL va alohida worker kerak. Serverga ko‘chirilgach shaxsiy kompyuteringiz ochiq turishi shart emas.

**Belgilar:** `VPS_IP` — serveringiz IP manzili; `crm.example.uz` — o‘zingiz boshqaradigan domen/subdomen. Bular misol, tayyor ishlaydigan manzillar emas. Buyruqlarni ko‘rsatilgan kompyuterda bajaring. Mavjud `.env` yoki bazani yangi namuna bilan almashtirmang.

## 1. Loyihani VS Code’da ochish

1. Loyiha ZIP bo‘lsa, avval oddiy papkaga chiqaring.
2. VS Code → File → Open Folder → loyiha papkasini tanlang.
3. Papka ichida `package.json`, `package-lock.json`, `prisma`, `src`, `compose.yaml` borligini tekshiring. Faqat `src`ni ochmang.
4. Terminal → New Terminal oching. Buyruqlar shu loyiha ildizidan bajariladi.
5. Node.js **22.16 yoki undan yangi 22.x**, npm va Docker Desktop o‘rnating. Docker Desktop’ni ishga tushiring. Windows’da Docker Linux containers rejimida ishlasin.

```sh
node --version
npm --version
docker compose version
```

Uchala buyruq versiya qaytarishi kerak. Node o‘rnatilgach topilmasa VS Code’ni qayta oching.

**Hozirgi Mac’dagi tayyor nusxa:** `RentCarni ishga tushirish.command` mavjud lokal runtime va bazani boshlaydi. Bu kompyuterga xos yordamchi; boshqa kompyuterda quyidagi standart o‘rnatishdan foydalaning. `.local/postgres`ni o‘chirmang — unda hozirgi ma’lumotlar bor. Shu Mac’dagi baza porti 55432; quyida yaratiladigan yangi Docker bazasi porti 5432.

## 2. Yangi kompyuterda lokal sozlash

VS Code fayllar ro‘yxatidan `.env.example`ni nusxalab `.env` deb nomlang. Yoki Mac/Linux terminalida:

```sh
cp .env.example .env
```

Windows PowerShell’da: `Copy-Item .env.example .env`.

Kalit yaratish — barcha platformada:

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Chiqqan 64 belgili qiymatni `DATA_ENCRYPTION_KEY`ga yozing. DB paroli uchun buyruqni yana alohida bajaring. `.env`:

```env
POSTGRES_PASSWORD=BU_YERGA_YANGI_DB_PAROL
DATABASE_URL=postgresql://rentcar:BU_YERGA_YANGI_DB_PAROL@localhost:5432/rentcar?schema=public
APP_URL=http://localhost:3000
APP_TIMEZONE=Asia/Tashkent
DATA_ENCRYPTION_KEY=BU_YERGA_64_BELGILI_HEX_KALIT
SEED_ADMIN_PASSWORD=BU_YERGA_OZINGIZ_TANLAGAN_KUCHLI_PAROL
SEED_EMPLOYEE_PASSWORD=BU_YERGA_BOSHQA_KUCHLI_PAROL
SESSION_IDLE_MINUTES=30
```

Yuqoridagi katta harfli matnlarni haqiqiy qiymatlarga almashtiring. Parollar kamida 12 belgi, ko‘pi bilan 72 UTF-8 bayt bo‘lsin. DB parolini hex ko‘rinishida yaratish URL belgilarini kodlash muammosini chetlab o‘tadi. Telegram va Google qiymatlari dastlab bo‘sh turishi mumkin; tegishli tashqi xizmatlar ishlamaydi, asosiy sayt ishlaydi.

Ketma-ket:

```sh
npm ci
docker compose -f compose.yaml -f compose.dev.yaml up -d db
npm run db:generate
npm run db:migrate
```

**Faqat yangi development bazasi** uchun demo ma’lumot kiriting:

```sh
npm run db:seed
npm run dev
```

Demo hisob: login `superadmin`, parol `.env`ga o‘zingiz yozgan `SEED_ADMIN_PASSWORD`. Demo xodimlar: `aziz`, `sardor`, `madina`; paroli `SEED_EMPLOYEE_PASSWORD`. Mavjud bazadagi login/parollar seed bilan qayta o‘rnatilmaydi.

Ikkinchi VS Code terminalida:

```sh
npm run worker
```

Birinchi terminal saytni, ikkinchisi bot va avtomatik hisobotlarni ishlatadi. `Ctrl+C` tegishli jarayonni to‘xtatadi. Keyingi ishga tushirishlarda bazani yoqing va shu ikki buyruqni bajaring; har safar seed kerak emas.

| Manzil | Nima ochiladi |
| --- | --- |
| http://localhost:3000 | Web tizim va login |
| http://localhost:3000/telegram-preview | Telegram xabari va Mini App’ning interaktiv namunasi; bazaga yozmaydi |
| http://localhost:3000/mini | Haqiqiy Mini App kirish sahifasi; Telegram orqali ochilishi kerak |
| http://localhost:3000/api/health | Server va baza sog‘ligini tekshirish |

`localhost` havolasini boshqa odamga yuborsangiz sizning kompyuteringiz ochilmaydi. Tashqi taqdimot uchun quyidagi HTTPS domen kerak.

## 3. VPS tayyorlash

Ubuntu 24.04 LTS x64, boshlanishiga 2 vCPU / 4 GB RAM / kamida 40 GB SSD — kichik jamoa uchun boshlang‘ich taxmin. Build paytida xotira yetmasa kattaroq resurs kerak. VPS panelida SSH public key qo‘shing, IP manzilni oling.

Mac terminalidan yoki Windows PowerShell’dan:

```sh
ssh root@VPS_IP
```

Bu bosqich yangi Ubuntu server uchun. Mavjud ishlab turgan server konfiguratsiyasini ustidan almashtirmang.

```sh
apt update
apt upgrade -y
adduser deploy
usermod -aG sudo deploy
install -d -m 700 -o deploy -g deploy /home/deploy/.ssh
cp /root/.ssh/authorized_keys /home/deploy/.ssh/authorized_keys
chown deploy:deploy /home/deploy/.ssh/authorized_keys
chmod 600 /home/deploy/.ssh/authorized_keys
```

SSH key root hisobiga o‘rnatilgan bo‘lishi kerak; `authorized_keys` topilmasa VPS panelidan public keyni o‘rnating. Root oynasini yopmasdan yangi lokal terminalda `ssh deploy@VPS_IP` bilan kirishni tekshiring.

Provider firewall’da SSH portini faqat o‘zingizning IP’ingizga, TCP 80 va 443ni internetga oching. Ushbu qo‘llanma SSH uchun standart 22 portni nazarda tutadi. 3000 va 5432ni ochmang. Docker orqali portlar ochilganda faqat UFWga suyanmang; loyiha DB portini productionda umuman ochmaydi, web esa faqat loopback’ga bog‘langan.

## 4. VPS’ga Docker o‘rnatish

Endi `deploy` bilan kirilgan **server terminalida** bajaring. Quyidagi usul yangi Ubuntu uchun Docker’ning rasmiy paket manbasidan foydalanadi. Oldindan boshqa Docker/containerd bo‘lsa rasmiy qo‘llanmadagi moslik bosqichlarini avval tekshiring.

```sh
sudo apt update
sudo apt install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
sudo tee /etc/apt/sources.list.d/docker.sources > /dev/null <<EOF_DOCKER
Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}")
Components: stable
Architectures: $(dpkg --print-architecture)
Signed-By: /etc/apt/keyrings/docker.asc
EOF_DOCKER
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo systemctl enable --now docker
sudo docker run --rm hello-world
sudo docker compose version
```

Manba: [Docker Engine — Ubuntu](https://docs.docker.com/engine/install/ubuntu/). Quyida serverdagi Docker buyruqlarida `sudo` ishlatiladi; Docker guruhiga qo‘shish shart emas.

## 5. Domenni IP’ga ulash

Domen sotib olingan xizmat yoki DNS boshqaruv panelida quyidagini kiriting:

| Type | Name / Host | Value / Target |
| --- | --- | --- |
| A | crm | VPS_IP |

Natija `crm.example.uz` bo‘ladi. Agar asosiy `example.uz` domenini ishlatsangiz Name maydoni odatda `@`. Asosiy domen boshqa sayt uchun ishlatilayotgan bo‘lsa `crm` subdomenini tanlang. Cloudflare ishlatilsa dastlab DNS only rejimini tanlang. Ishlamaydigan IPv6 manzilga yo‘nalgan AAAA yozuvini qoldirmang.

DNS tarqalishi vaqt olishi mumkin. Lokal terminalda:

```sh
nslookup crm.example.uz
```

Javobda VPS IP chiqsin. `.env`dagi domen ham aynan shu bo‘ladi. HTTPS sertifikatini keyingi bosqichda Caddy avtomatik oladi; DNS va ochiq 80/443 portlari kerak. [Caddy Automatic HTTPS](https://caddyserver.com/docs/automatic-https).

## 6. Kodni serverga yuborish

Server terminalida:

```sh
sudo mkdir -p /opt/rentcar
sudo chown deploy:deploy /opt/rentcar
```

**O‘z kompyuteringizdagi loyiha terminalida**, Mac/Linux uchun:

```sh
rsync -av --exclude=node_modules --exclude=.next --exclude=.next-production --exclude=.git --exclude=.env --exclude='.env.*' --exclude=.local --exclude=output --exclude=tmp --exclude='*.dump' ./ deploy@VPS_IP:/opt/rentcar/
scp .env.example deploy@VPS_IP:/opt/rentcar/.env.example
```

Windows’da WinSCP orqali SFTP bilan `deploy@VPS_IP`ga kiring va loyiha fayllarini `/opt/rentcar`ga ko‘chiring. `node_modules`, `.next`, `.next-production`, `.local`, `.git`, `.env`, `tmp`, `output`, backup fayllarni tashlamang. `.env.example`, `package-lock.json`, `assets/fonts`, `prisma/migrations`, `deploy` va barcha kod fayllari kerak.

Mini App alohida loyiha emas: sayt bilan birga shu serverga joylanadi va `/mini`da ishlaydi. Ikkalasi bitta baza va ruxsat tizimidan foydalanadi.

## 7. Serverdagi maxfiy sozlamalar

Server terminalida:

```sh
cd /opt/rentcar
cp .env.example .env
chmod 600 .env
openssl rand -hex 24
openssl rand -hex 32
nano .env
```

Birinchi tasodifiy qiymat DB paroli uchun, ikkinchisi yangi bazaning shifrlash kaliti uchun. `.env`ni quyidagicha to‘ldiring:

```env
POSTGRES_PASSWORD=YANGI_DB_PAROL
DATABASE_URL=postgresql://rentcar:YANGI_DB_PAROL@db:5432/rentcar?schema=public
APP_URL=https://crm.example.uz
RENTCAR_DOMAIN=crm.example.uz
APP_TIMEZONE=Asia/Tashkent
DATA_ENCRYPTION_KEY=64_HEX_KALIT
SEED_ADMIN_PASSWORD=OZINGIZ_TANLAGAN_KUCHLI_PAROL
SESSION_IDLE_MINUTES=30
TELEGRAM_BOT_TOKEN=
TELEGRAM_ADMIN_CHAT_ID=
```

`nano`da Ctrl+O, Enter bilan saqlang, Ctrl+X bilan chiqing. Docker ichidagi DB host **db**, lokal Node uchun **localhost**. `APP_URL`da HTTPS bor, `RENTCAR_DOMAIN`da yo‘q. Serverdagi `NODE_ENV=production` Dockerfile orqali beriladi.

**Mavjud ma’lumotlarni olib o‘tsangiz:** aynan eski `DATA_ENCRYPTION_KEY`ni saqlang va [VPS qo‘llanmasining 4B bo‘limi](VPS_DEPLOYMENT.md#4b-lokal-malumotlarni-ham-kochirish) orqali dump/restore qiling. Kod nusxasi bazani ko‘chirmaydi. O‘sha hujjatdagi Docker buyruqlariga serverda `sudo` qo‘shing. Restore tugagach quyidagi bootstrapni bajarmang — mavjud foydalanuvchilar saqlanadi.

## 8. Saytni ishga tushirish

**Yangi bo‘sh production bazasi uchun**, serverda:

```sh
cd /opt/rentcar
sudo docker compose -f compose.yaml -f compose.production.yaml up -d --build
sudo docker compose exec web npm run auth:bootstrap
sudo docker compose -f compose.yaml -f compose.production.yaml ps
curl -f https://crm.example.uz/api/health
```

Build bir necha daqiqa davom etishi mumkin. `migrate`ning muvaffaqiyatli `Exited (0)` bo‘lishi normal; web, worker, db, proxy ishlashi kerak.

Brauzerda `https://crm.example.uz`ni oching. Yangi bootstrap hisobining logini **superadmin**, paroli siz kiritgan `SEED_ADMIN_PASSWORD`. Profil Jaxongir Abdurazoqov, lavozim Community Manager, ruxsati SUPER_ADMIN bo‘ladi. Xodimlar bo‘limida login va lavozimlarni boshqaring. Ofislar sozlamasida Yunusobod, Oybek va Qushbegini qo‘shing hamda xodimlarni tegishli ofisga biriktiring.

Productionda demo `db:seed`ni bajarmang. Kirish ishlagach `.env`dagi `SEED_ADMIN_PASSWORD`ni bo‘shating va qayta yarating:

```sh
sudo docker compose -f compose.yaml -f compose.production.yaml up -d --force-recreate web worker
```

Parol bazada hash holatida qoladi. VPS qayta yoqilganda Docker va `restart: unless-stopped` xizmatlarni tiklaydi. Sayt ishlashi uchun VS Code ochiq turishi kerak emas.

## 9. Telegram bot va Mini App’ni ulash

1. Telegram’dagi rasmiy **@BotFather**ga kiring, `/newbot` yuboring, nom va `bot` bilan tugaydigan username tanlang. Mavjud bot bo‘lsa yangisini yaratish shart emas.
2. Berilgan tokenni server `.env`idagi `TELEGRAM_BOT_TOKEN`ga yozing. `api_id` va `api_hash` kerak emas. Tokenni chatga yoki Git’ga yubormang.
3. Serverda yangi sozlamalarni qo‘llang:

```sh
cd /opt/rentcar
sudo docker compose -f compose.yaml -f compose.production.yaml up -d --force-recreate web worker
sudo docker compose exec web npm run telegram:setup
```

4. Botning shaxsiy chatida **RentCarni ochish** tugmasi paydo bo‘ladi; u `https://crm.example.uz/mini`ni ochadi.
5. BotFather → `/mybots` → bot → Bot Settings → Configure Mini App orqali Main Mini App’ni yoqing. URL sifatida aynan `https://crm.example.uz/mini` kiriting. Telegram versiyasiga qarab menyu nomi farqlanishi mumkin.
6. Bot `getUpdates` polling orqali ishlaydi. Oldingi webhook yoki boshqa polling jarayoni bo‘lmasin. Ko‘chirgach shu bot bilan ishlayotgan lokal workerni to‘xtating.

Manba: [Telegram Mini Apps](https://core.telegram.org/bots/webapps). Hozirgi kod imzoni serverda tekshiradi; shunchaki `/mini`ni oddiy brauzerda ochish Telegram hisobiga kiritmaydi.

**Har bir xodimni bog‘lash:**

1. Super Admin xodimning ism/familiyasi, logini, paroli, ofisi va ruxsatini yaratadi.
2. Xodim web saytga login/parol bilan kirib, profil/sozlamadan **Connect Telegram**ni bosadi.
3. Berilgan `/start KOD`ni kompaniya botining shaxsiy chatiga yuboradi. Kod 10 daqiqalik va bir martalik.
4. Hisob tasdiqlangach bot menyusidagi **RentCarni ochish**ni bosadi.
5. Sessiya eskirsa Mini App’ni yopib qayta ochadi. Faolsizlik chegarasi odatda 30 daqiqa.

Rahbar shaxsiy xabar olishi uchun botga `/start` yuborsin; guruh bo‘lsa botni guruhga qo‘shing. Ofis sozlamasiga tegishli chat ID’ni kiriting. Chat ID username yoki telefon raqami emas. Chat ID aniqlanmagan bo‘lsa uni taxminan yozmang; botning yangilanish ma’lumotidan yoki tashkilotingiz ishonchli administratoridan oling.

Xodim hisobot formatini Matn/PDF qilib tanlaydi. Avtomobil hisobotlarida kun, hafta yoki oy tanlanadi. Tezkor yuborish oylik avtomatik hisobotni bekor qilmaydi. Oylik hisobot worker orqali oldingi to‘liq oy uchun yuboriladi.

## 10. Ishlatishdan oldingi tekshiruv

- Domen HTTPS bilan, sertifikat ogohlantirishisiz ochilsin; login ishlasin.
- Bitta sinov xodimi yaratib uning ruxsatlari va Telegram ulanishini tekshiring.
- Mini App’ni telefon Telegram’ida oching, yozilgan sinov hisobotini web paneldan ko‘ring.
- Kelishda 10:00 dan keyin sabab; ketishda 22:00 dan oldin sabab talab qilinishini tekshiring. Qurilma timezone’i to‘g‘ri bo‘lsin.
- Bitta avtomobil uchun matnli va PDF hisobotni sinov chatiga yuboring.
- Ofis chatlari, mas’ul xodimlar, hujjat muddatlari va worker loglarini tekshiring.

```sh
sudo docker compose logs --tail=100 web worker migrate
sudo docker compose -f compose.yaml -f compose.production.yaml logs --tail=100 proxy
```

Bu qo‘llanma tayyorlanganida haqiqiy VPS, domen va Telegram tokeni bilan yakuniy sinov bajarilmagan. Docker container ishga tushishi ham serverda tekshiriladi. Kodning lokal testlari tashqi xizmatlar tekshiruvini almashtirmaydi.

## 11. Backup, yangilash va nosozliklar

Serverda backup oling; fayl tarkibida maxfiy ma’lumot bor:

```sh
cd /opt/rentcar
umask 077
mkdir -p backups
sudo docker compose exec -T db pg_dump -U rentcar -d rentcar --format=custom --no-owner --no-acl > "backups/rentcar-$(date +%Y%m%d-%H%M%S).dump"
```

Nusxani boshqa himoyalangan joyga saqlang, encryption keyni alohida saqlang. VPS backup jadvali va saqlash muddatini yoqing. Bo‘sh test bazada tiklashni mashq qiling. `docker compose down -v` ma’lumotlar volume’ini o‘chiradi; oddiy qayta ishga tushirish uchun ishlatmang.

Yangilash: backup → 6-bosqich bilan yangi kod → quyidagi buyruq → health/login/Mini App sinovi:

```sh
sudo docker compose -f compose.yaml -f compose.production.yaml up -d --build
```

| Muammo | Tekshirish / yechim |
| --- | --- |
| `npm` topilmadi | Node 22 o‘rnating, VS Code’ni qayta oching |
| Baza bilan aloqa yo‘q | DB ishlayaptimi, port va `.env` host/paroli mosmi? |
| DB parolini `.env`da o‘zgartirdim, kira olmayapti | Mavjud volume paroli avtomatik o‘zgarmaydi; eski parolni qaytaring yoki DB ichida boshqariladigan parol almashtirishni bajaring |
| Port 3000/5432 band | Oldingi jarayonni aniqlang; mavjud bazani o‘chirmang. Lokal portni o‘zgartirsangiz URL ham mos bo‘lsin |
| Domen ochilmaydi | DNS A/AAAA, VPS IP, firewall, proxy loglarini tekshiring |
| 502 Bad Gateway | `web`, `migrate` loglari va DB health’ini tekshiring |
| Login productionda ishlamaydi | HTTPS va `APP_URL` brauzer domeniga aynan mos bo‘lsin |
| Mini App hisobni topmadi | Xodim active, Telegram Connect tasdiqlangan va to‘g‘ri bot ekanini tekshiring |
| Telegram 409 / polling conflict | Bitta bot uchun faqat bitta worker qolsin; avvalgi webhookni bekor qiling |
| Hisobot kelmayapti | Worker, chat ID, botga `/start`, notification statusi va foydalanuvchi ruxsatlarini tekshiring |
| Build xotira xatosi bilan to‘xtadi | VPS RAMni kengaytiring va buildni qaytaring |

Xavfsizlik bo‘yicha amalga oshirilgan himoyalar va qolgan infratuzilma vazifalari: [SECURITY.md](SECURITY.md). MFA hali qo‘shilmagan; mutlaq xavfsizlik kafolati yo‘q.

## Yakuniy havolalar

- Web sayt: `https://crm.example.uz`
- Mini App manzili (BotFather uchun): `https://crm.example.uz/mini`
- Telegram’da xodimlarga yuboriladigan havola: `https://t.me/SIZNING_BOT_USERNAME?startapp` — Main Mini App yoqilgach.
- Namunaviy taqdimot: `https://crm.example.uz/telegram-preview` — haqiqiy ma’lumot yubormaydigan ko‘rgazma.

Hamma misollardagi domen va bot username’ni o‘zingizniki bilan almashtiring.
