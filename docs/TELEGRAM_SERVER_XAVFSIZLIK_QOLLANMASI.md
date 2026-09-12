# OrientRentCar: ishga tushirish, GitHub himoyasi, VPS va Telegram

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

## 2A. GitHub’ga secretlarni chiqarmasdan kodni joylash

Avval VS Code’da `.gitignore`ni tekshiring: `.env`, `.env.*` (faqat `.env.example` istisno), `.local`, backup, `secrets`, `credentials`, `.pem`, `.key`, eksport va loglar chetlatilgan. `.dockerignore` ham ularni Docker image ichiga nusxalamaydi. Haqiqiy token/parollar faqat lokal va server `.env`ida turadi; `.env.example`da faqat bo‘sh qiymat yoki namuna bo‘lsin.

**Bu papka hozir Git repository emas. Yangi repository uchun**, loyiha terminalida:

```sh
git init
git branch -M main
git config core.hooksPath .githooks
```

Oldindan Git mavjud bo‘lsa `git init` va branch yaratishni takrorlamang. Mavjud maxsus hooklaringiz bo‘lsa ularni almashtirmasdan yangi tekshiruv bilan birlashtiring. Hook sozlamasi har yangi kompyuter/clone’da alohida bajariladi.

GitHub’da **Private** repository yarating. Private repo ichida ham token saqlamang. Birinchi commit uchun kerakli fayllarni aniq tanlang:

```sh
git add .gitignore .dockerignore .env.example .githooks src prisma public assets scripts tests docs deploy package.json package-lock.json Dockerfile compose.yaml compose.dev.yaml compose.production.yaml next.config.ts postcss.config.mjs tsconfig.json next-env.d.ts README.md
npm run security:secrets
git status --short
git ls-files .env
git diff --cached --stat
```

`git ls-files .env` hech narsa chiqarmasligi kerak. `security:secrets` staged/index fayllarda token, private key va `.env`dagi ma’lum maxfiy qiymatlarni izlaydi, qiymatning o‘zini chiqarmaydi. Xato bo‘lsa push qilmang. `git diff --cached`ni **o‘z kompyuteringizda** ko‘rib chiqing; secret chiqsa uni chatga yubormang.

```sh
git commit -m "OrientRentCar management system"
git remote add origin git@github.com:SIZNING_USERNAME/SIZNING_REPOSITORY.git
git push -u origin main
```

`origin` allaqachon mavjud bo‘lsa qayta qo‘shmang. GitHub SSH key o‘rnatilgan bo‘lishi kerak; alternativ HTTPS ulanishida GitHub’ning credential manager’idan foydalaning, tokenni remote URL ichiga yozmang.

**Qo‘shilgan himoyalar:** `pre-commit` va `pre-push` hooklari indeksdagi fayllarni tekshiradi. Bu to‘liq Git tarixi skaneri emas va hookni chetlab o‘tish mumkin; shu sabab GitHub repository Settings → Security / Code security bo‘limida mavjud bo‘lsa **Secret scanning** va **Push protection**ni ham yoqing. Mavjudlik repository turi va tarifga bog‘liq. GitHub hisobida 2FA yoqing. CI orqali keyin deploy qilinsa tokenlarni GitHub Actions Secrets’ga kiriting; workflow matniga yozmang.

Agar `.env` oldin tracking’ga tushgan bo‘lsa:

```sh
git rm --cached -- .env
```

Bu lokal faylni saqlab, keyingi commitdan olib tashlaydi; oldingi tarixni tozalamaydi. **Token GitHub’ga chiqqan bo‘lsa avval uni bekor qilib yangisini oling.** Bot tokenini BotFather’dan, Google private keyni Cloud Console’dan almashtiring. Keyin tarixni jamoa bilan kelishib tozalang. Shifrlash kalitini yangilash mavjud passportlarni qayta shifrlashni talab qiladi — tasodifiy yangi kalit yozmang. [GitHub’ning rasmiy secretni olib tashlash qo‘llanmasi](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository).

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

## 9A. Google Sheets’ni ulash va himoyalash

1. Google Cloud Console’da loyiha tanlang, **Google Sheets API**ni yoqing.
2. Service Account yarating. Ushbu ish uchun unga butun Cloud loyihasi Owner/Editor rolini berish shart emas; jadvalga kirish Share orqali beriladi.
3. Shu service account uchun JSON private key yarating va yuklab oling. Uni loyiha kodiga qo‘ymang, GitHub yoki Telegram orqali yubormang.
4. Google Sheets → **Share** → service account emailini **Viewer** sifatida qo‘shing. **General access: Restricted** bo‘lsin. “Anyone with the link”ni yoqmang.
5. Jadval manzili `https://docs.google.com/spreadsheets/d/SHEET_ID/edit` ko‘rinishida bo‘ladi. `/d/` va `/edit` orasidagi qism — Sheet ID. IDning o‘zi parol emas; asosiy himoya Restricted sharing va private keydir. IDni ham kodga hardcode qilmaymiz.
6. Serverdagi `.env`ni `nano .env` bilan ochib, quyidagilarni kiriting:

```env
GOOGLE_SHEET_ID=OZINGIZNING_SHEET_ID
GOOGLE_SERVICE_ACCOUNT_EMAIL=SERVICE_ACCOUNT_EMAIL
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nKEY_CONTENT\n-----END PRIVATE KEY-----\n"
```

Bu faqat format namunasi. Private key ichidagi newline’lar `\n` ko‘rinishida yozilishi mumkin. `NEXT_PUBLIC_GOOGLE_PRIVATE_KEY` yoki `NEXT_PUBLIC_TELEGRAM_BOT_TOKEN` kabi nomlar ishlatmang — ular brauzerga chiqishi mumkin.

7. Web va workerni yangi environment bilan qayta yarating:

```sh
sudo docker compose -f compose.yaml -f compose.production.yaml up -d --force-recreate web worker
```

8. SUPER_ADMIN → Sozlamalar → Google Sheets ulanishi: nom, Sheet ID, range va ustunlar mapping’ini kiriting. Mapping indekslari 0’dan boshlanadi. `sourceId` har bir rental uchun o‘zgarmas noyob ID bo‘lsin. Sana ISO formatda timezone bilan beriladi, masalan `2026-09-11T10:00:00+05:00`.
9. **Sync Now**ni bosing. Oxirgi sync holati va import sonini tekshiring. Car plate oldindan avtomobillar bazasida bo‘lsin.

Sheet ID panelda faqat ruxsatli administrator ko‘radi. Private key serverdan brauzerga uzatilmaydi. Runtime ulanish sozlamalari PostgreSQL’da, private key `.env`da saqlanadi; ular GitHub’ga kod bilan chiqmaydi. Database backup ham maxfiy hisoblanadi.

## 9B. Barcha xodimlarning Telegram hisoblarini ulash

Telegram xabari telefon operatori yuboradigan SMS emas. Hozirgi tizim Telegram bot xabarlarini yuboradi; oddiy telefon SMS integratsiyasi mavjud emas.

Quyidagi tartibni **har bir xodim uchun alohida** bajaring:

1. SUPER_ADMIN xodimni yaratsin: ism, familiya, login, parol, lavozim, rol, ofis va active holati.
2. Xodim `https://crm.example.uz`ga o‘z login/paroli bilan kirsin.
3. Profil yoki sozlamadagi **Connect Telegram** tugmasidan kod olsin.
4. Xodim aynan o‘z Telegram hisobida kompaniya botini ochib `/start KOD` yuborsin.
5. Worker kodni tekshiradi va `telegramUserId`, `telegramChatId`, username hamda `telegramVerified`ni bog‘laydi. Kod 10 daqiqa amal qiladi va bir martalik.
6. SUPER_ADMIN Xodimlar ro‘yxatida **Tasdiqlangan** ekanini ko‘rsin. Faqat ID’ni qo‘lda yozish Mini App loginini tasdiqlamaydi.
7. Xodim botdagi **RentCarni ochish** tugmasini bosib Mini App’ga kirsin.
8. Avtomobil hisobotidan bitta sinov matn/PDF xabarini o‘ziga yuborib ko‘rsin. Botni block qilmagan va bildirishnomalarni yoqqan bo‘lsin.

Telefon raqamini bilish orqali boshqa odamning Telegram hisobini uning ishtirokisiz avtomatik tasdiqlab bo‘lmaydi. Ulanish kodlarini guruhga umumiy tarqatmang. Xodimlar boshqa odam kodidan foydalanmasin.

**Kimga qanday xabar keladi:**

| Xabar | Qabul qiluvchi / sozlama |
| --- | --- |
| Kechikish va 10:10 dagi kelmaganlar hisoboti | Xodim ofisining rahbar chat ID’si; bo‘sh bo‘lsa TELEGRAM_ADMIN_CHAT_ID |
| Ish kuni yopilishi | Tegishli ofis chat ID’si / umumiy rahbar chat ID |
| Hujjat muddati yaqinlashishi | Hujjatda mas’ul va qo‘shimcha oluvchi qilib belgilangan xodimlar |
| Tezkor avtomobil hisoboti | Uni so‘ragan, Telegram’i tasdiqlangan foydalanuvchining shaxsiy chati |
| Avtomobilning oylik hisoboti | Faol, tasdiqlangan va avtomobilni ko‘rish huquqi bor foydalanuvchilar; tanlangan Matn/PDF formatida |

Rahbarni ham shu tartibda ulang, so‘ng profilidagi Chat ID’ni tegishli ofis sozlamasiga qo‘ying. Guruhga yuborish uchun bot guruh a’zosi bo‘lsin, xabar yozish huquqi bo‘lsin va **guruhning** Chat ID’sini kiriting. Shaxsiy Chat ID bilan guruh Chat ID bir xil emas. Tizim barcha xabarlarni barcha xodimlarga tarqatmaydi: yuqoridagi mas’ullik qoidalari ishlaydi.

**Bot ichidagi kundalik ish:** Mini App → Bugun → Ishga keldim / Ishdan ketdim → vaqtni kiriting → saqlang. Kunlik hisobotda ish, avtomobil va xarajat yoziladi. Servis qaydi avtomobil tarixiga bog‘lanadi. Hisobotlar bo‘limida kun/hafta/oy hamda Matn/PDF tanlanadi. Web va Mini App’dagi yozuvlar bitta bazada ko‘rinadi. Bot chatining o‘zida barcha buyruqlar mavjud emas; kundalik amallar **Mini App interfeysi** orqali bajariladi.

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

## 10A. Cybersecurity tekshiruvini ishga tushirish

Himoyalar alohida “antivirusni yoqish” tugmasi emas: login, role validation, HttpOnly sessiyalar, rate limiting, CSP va audit ilova ishlashi bilan birga ishlaydi. HTTPS/Secure cookie esa production server va domen bilan ishlaydi.

Lokal loyiha terminalida:

```sh
chmod 600 .env
npm run security:check
npm run security:audit
npm run typecheck
node --import tsx --test tests/*.test.ts
npm run build
```

- `security:check` qiymatlarni ko‘rsatmasdan `.env` konfiguratsiyasi, kalit formati, sessiya chegarasi va mavjud bo‘lsa Git indeksini tekshiradi.
- `security:audit` o‘rnatilgan production paketlarining ma’lum zaifliklarini npm registry orqali tekshiradi. Tarmoqqa ulanish kerak. `npm audit fix --force`ni tekshirmasdan bajarmang.
- `security:secrets` faqat Git indeksini tekshiradi; Git bo‘lmasa xato beradi.

Server Docker ichida:

```sh
sudo docker compose exec web npm run security:check -- --production
sudo docker compose exec web npm run security:audit
curl -I https://crm.example.uz/login
curl -f https://crm.example.uz/api/health
```

Production tekshiruvi haqiqiy HTTPS domen, kuchli DB paroli va kalitlarni talab qiladi. Docker ichida `.env` fayli ko‘chirilmagan — Compose environmentni beradi; `.env` yo‘qligi xabari bu holatda kutiladi. Git ham runtime image’da bo‘lmasligi mumkin: Git secret tekshiruvi **pushdan oldin lokal repositoryda** bajariladi.

SSH key, provider firewall, domen/VPS/GitHub hisobida 2FA, muntazam yangilanish va boshqa joydagi backup ham kerak. 3000/5432 portlarini public ochmang; faqat Caddy HTTPS’ni tashqariga ochadi. Ilovaning o‘zida MFA/TOTP hali yo‘q.

**Hozirgi lokal tekshiruv natijasi:** DATA_ENCRYPTION_KEY noto‘g‘ri; Telegram va Google konfiguratsiyasi kiritilmagan; papka Git repository emas. Eski bazadan foydalanayotgan bo‘lsangiz **avvalgi shifrlash kalitini** `.env`ga qaytaring. Yangi, bo‘sh baza uchungina yangi tasodifiy kalit yarating. So‘ng `npm run security:check`ni qayta bajaring. Bu muammolar hal bo‘lmaguncha “production tayyor” deb hisoblamang.

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

## Ushbu ishda nima bajarildi va nima tashqi sozlashni kutmoqda

Fon logotipi faqat login sahifasida qoldirildi. Secretlar uchun ignore qoidalari, Git hooklari va tekshiruv buyruqlari kodga qo‘shildi; `.env` ruxsati 600 qilindi. Haqiqiy GitHub push, VPS deploy, domen ulash yoki Telegramga xabar yuborish bu qo‘llanmani yaratishda bajarilmadi. Ular o‘zingizning domen, server va kalitlaringiz bilan yuqoridagi bosqichlarda ishga tushiriladi.

## Administrator bilan bog‘lanish

Login sahifasidagi **Administratorga yozish** tugmasi [Jaxongirning Telegram profilini](https://t.me/jakhongir_ps) ochadi. Bu yordam uchun shaxsiy profil, kompaniya botining tokeni yoki Mini App kirish manzili emas. Login/parol tiklashda administratorga yozing; bot tokenlari va shifrlash kalitlarini oddiy chat orqali yubormang.

## VPNsiz xodimlar uchun yopiq kirish: Telegram ID ruxsat ro‘yxati

HTTPS manzilni bilishning o‘zi tizimga kiritmaydi. Ommaviy ro‘yxatdan o‘tish mavjud emas; web login uchun administrator yaratgan faol hisob talab qilinadi.

1. Super Admin xodim hisobini yaratadi va uning **raqamli Telegram User ID**sini profilga kiritadi. `@username` o‘rniga raqam yoziladi; ID aynan shu xodimga tegishli ekanini tekshiring.
2. Xodim o‘z login/paroli bilan kiradi va **Connect Telegram**dan 10 daqiqalik kod oladi. Oldindan ID kiritilmagan bo‘lsa, tizim kod bermaydi.
3. Xodim administrator belgilagan Telegram hisobidan kompaniya botining shaxsiy chatiga `/start KOD` yuboradi. Boshqa Telegram ID kodi bo‘lsa ham hisobni bog‘lay olmaydi.
4. Worker ishlayotgan bo‘lsa bog‘lanish tasdiqlanadi va Telegram Chat ID saqlanadi. Shundan keyin bot menyusidan Mini App ochiladi.
5. Mini App Telegram imzosini serverda tekshiradi; faqat faol va tasdiqlangan hisobga sessiya beradi. Oddiy Telegram IDni so‘rovga yozib yuborish kirish uchun yetarli emas.
6. Super Admin IDni almashtirsa, avvalgi sessiyalar va ulanish kodlari bekor qilinadi; yangi Telegram hisobini qayta tasdiqlash kerak. Faolsizlantirilgan hisob kira olmaydi.

Bu ketma-ketlik yuqoridagi Connect Telegram bosqichlariga ham tegishli. Login/parol bilan web kirish alohida saqlanadi; Telegram tasdiqlanishi web loginning majburiy ikkinchi omili emas. Botning asosiy ishlash oynasi Mini App; barcha web funksiyalar oddiy chat buyruqlari shaklida mavjud degani emas.

Avtomobillar holati va PDF yuklab olish uchun `FOYDALANISH_QOLLANMASI.md`dagi yangi bo‘limga qarang.
