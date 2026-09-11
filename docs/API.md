# API contract

JSON request/response. Mutating requests require an Origin equal to APP_URL and the `rentcar_session` HttpOnly cookie. `400` validation, `401` unauthenticated, `403` permission/origin, `404` missing, `409` duplicate/conflict, `429` rate limit, `503` infrastructure failure. Lists have a bounded `limit` (1–200, default 100) and one-based `page`.

| Method             | Endpoint                     | Permission / scope                                                                     |
| ------------------ | ---------------------------- | -------------------------------------------------------------------------------------- |
| POST               | /api/auth/login              | login, password; rate limited                                                          |
| POST               | /api/auth/logout             | authenticated                                                                          |
| GET                | /api/me                      | authenticated profile                                                                  |
| GET                | /api/dashboard               | user or manager scope                                                                  |
| GET                | /api/lookup                  | role-filtered form options                                                             |
| GET, POST          | /api/employees               | employees.read / employees.write                                                       |
| PATCH, DELETE      | /api/employees/:id           | employees.write; delete deactivates                                                    |
| GET                | /api/attendance              | own; attendance.read for all; date, employeeId                                         |
| POST               | /api/attendance/check-in     | attendance.write; date, time (HH:mm), timezone (IANA), lateReason only if time > 10:00 |
| POST               | /api/attendance/check-out    | attendance.write; date, time, timezone; closes latest open shift                       |
| GET, POST          | /api/daily-reports           | own or reports.read; filters date, employeeId, carId, q                                |
| GET, POST          | /api/cars                    | cars.read / cars.write; q, status                                                      |
| GET, PATCH, DELETE | /api/cars/:id                | read/write/delete permissions; delete archives                                         |
| GET, POST          | /api/cars/:id/services       | cars.read / services.write                                                             |
| GET, POST          | /api/services                | cars.read / services.write; carId                                                      |
| GET, POST          | /api/documents               | documents.read/write                                                                   |
| GET                | /api/documents/expiring      | documents.read; expired and next 7 days                                                |
| PATCH              | /api/documents/:id           | documents.write; complete validated document form                                      |
| GET                | /api/rentals/search          | rentals.read; plate, months=1/3/6/12, fineAt ISO offset                                |
| GET                | /api/notifications           | own, Super Admin all                                                                   |
| PATCH              | /api/notifications/:id       | mark read; retry:true Super Admin only                                                 |
| GET                | /api/audit-logs              | audit.read; q, entityId                                                                |
| POST               | /api/telegram/connect        | own one-use token                                                                      |
| GET, POST          | /api/google-sheets           | settings.write                                                                         |
| PATCH              | /api/google-sheets/:id       | settings.write                                                                         |
| POST               | /api/google-sheets/sync      | settings.write; configId                                                               |
| GET                | /api/settings                | settings.write                                                                         |
| POST               | /api/settings/intervals      | settings.write; intervals:number[]                                                     |
| POST               | /api/settings/service-types  | settings.write; name                                                                   |
| POST               | /api/settings/document-types | settings.write; name                                                                   |
| PATCH              | /api/settings/office/:id     | settings.write; name, telegramChatId                                                   |
| GET                | /api/health                  | DB readiness, no secrets                                                               |

External rental source names are deliberately distinct from internally authenticated service/report employee identity. The latter is never accepted from request bodies.

## Telegram Mini App

`POST /api/auth/telegram` — `{ initData: string }`, Telegram HMAC va 5 daqiqalik freshness tekshiruvi; faol verified xodim uchun `{ token, expiresAt }`. Keyingi REST so‘rovlarda `Authorization: Bearer mini_...`; token faqat xotirada. Logout mavjud `POST /api/auth/logout`. Browser cookie sessiyasi alohida.

## Avtomobil hisobotlari va sessiyalar

- `GET /api/car-reports?carId=ID&date=YYYY-MM-DD&period=DAY|WEEK|MONTH` — ruxsatga mos hisobot; `format=PDF` qo‘shilsa base64 PDF va fayl nomi.
- `POST /api/car-reports/send` — `{carId,date,period,format:"TEXT"|"PDF",requestId:UUID}`; faqat o‘zining tasdiqlangan Telegram chatiga navbatga qo‘yadi.
- `GET /api/car-reports/preferences`, `PATCH /api/car-reports/preferences` `{format:"TEXT"|"PDF"}`.
- `POST /api/auth/logout-all` — foydalanuvchining barcha sessiyalarini bekor qiladi.
- Attendance checkout va Super Admin tahririda `earlyLeaveReason` qabul qilinadi; mahalliy vaqt 22:00 dan oldin sabab talab qilinadi.
