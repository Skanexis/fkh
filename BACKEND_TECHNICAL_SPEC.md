# Backend Technical Specification

## Project: The F.K.H Mobile-First E-Commerce Web App

## 1. Цель

Разработать backend для мобильного e-commerce приложения The F.K.H, которое сейчас реализовано как frontend-прототип на Vite/React с моковыми данными.

Backend должен заменить локальные данные из `src/app/data/products.ts` на реальные API и обеспечить:

- публичный каталог товаров;
- карточку товара с галереей изображений и видео;
- корзину и создание заказов;
- профиль пользователя и историю заказов;
- админ-панель для товаров, заказов, пользователей и статистики;
- безопасную загрузку медиафайлов;
- обязательную авторизацию через Telegram-бота;
- автоматическое создание профиля из Telegram-аккаунта;
- роли и аудит административных действий.

Важно: backend должен поддерживать только легальные для выбранной юрисдикции товары и операции. Для товаров с возрастными, региональными или регуляторными ограничениями нужна отдельная проверка соответствия правилам перед запуском.

## 2. Scope MVP

### 2.1 Входит в MVP

- REST API v1.
- Вход пользователя только через Telegram-бота.
- Создание или обновление профиля по Telegram `id`, `username`, имени и фото.
- Авторизация через access token и refresh token.
- Роли: `user`, `admin`.
- Каталог товаров с фильтрацией, поиском и категориями.
- Детальная страница товара.
- Создание заказа из корзины.
- Просмотр заказов пользователем.
- Админское управление товарами.
- Админское управление заказами и статусами.
- Админское управление пользователями.
- Dashboard-статистика для админки.
- Загрузка изображений и видео для товаров.
- Telegram-бот для авторизации пользователей.
- Telegram/webhook уведомления о новом заказе, если будет выбран канал.
- Логирование ошибок и административных действий.

### 2.2 Не входит в первый MVP

- Онлайн-оплата.
- Сложная доставка с картами и трекингом.
- Промокоды и бонусная система.
- Рекомендательная система.
- Многоязычная CMS.
- Полноценный складской учет с партиями.

Эти блоки должны быть предусмотрены архитектурно, но не реализуются в первой версии без отдельного задания.

## 3. Рекомендуемый стек

### 3.1 Backend

- Runtime: Node.js 20+.
- Framework: NestJS или Express/Fastify.
- Language: TypeScript.
- API style: REST JSON.
- Validation: Zod, class-validator или аналогичный валидатор.
- ORM: Prisma.
- Database: PostgreSQL 16+.
- Cache/rate limit: Redis.
- File storage: S3-compatible storage, Cloudflare R2, AWS S3, Supabase Storage или MinIO для dev.
- Auth: Telegram bot login flow + JWT access token + refresh token rotation.
- Telegram Bot API: webhook mode для production, long polling допустим только локально.

### 3.2 DevOps

- Docker Compose для локальной разработки.
- `.env.example` со всеми переменными окружения.
- Миграции БД через Prisma.
- Seed script для демо-товаров из текущего frontend mock.
- OpenAPI/Swagger документация.

## 4. Основные сущности

### 4.1 User

Пользователь приложения. Пользователь создается автоматически после успешной авторизации через Telegram-бота.

Поля:

- `id`: UUID.
- `telegramId`: bigint/string, unique, обязательный.
- `telegramUsername`: string, nullable, unique where not null.
- `telegramFirstName`: string, nullable.
- `telegramLastName`: string, nullable.
- `telegramLanguageCode`: string, nullable.
- `telegramPhotoUrl`: string, nullable.
- `name`: string, отображаемое имя на сайте.
- `avatarUrl`: string, nullable.
- `email`: string, nullable, optional только для контакта, не для входа.
- `phone`: string, nullable, optional только для контакта, не для входа.
- `role`: `user` или `admin`.
- `status`: `active`, `blocked`, `deleted`.
- `createdAt`: datetime.
- `updatedAt`: datetime.
- `lastLoginAt`: datetime, nullable.

Правила:

- Вход по email/password не используется.
- `name` формируется из `telegramFirstName + telegramLastName`; если имя отсутствует, использовать `@telegramUsername`; если username отсутствует, использовать `Telegram User <telegramId>`.
- При каждом входе backend обновляет `telegramUsername`, имя, язык и фото, если Telegram прислал новые данные.
- Админская роль назначается вручную в БД или через bootstrap-список `TELEGRAM_ADMIN_IDS`.

### 4.1.1 TelegramAuthRequest

Временный запрос на вход через Telegram-бота.

Поля:

- `id`: UUID.
- `nonce`: string, unique.
- `status`: `pending`, `confirmed`, `expired`, `cancelled`.
- `telegramId`: bigint/string, nullable.
- `userId`: UUID, nullable.
- `ip`: string, nullable.
- `userAgent`: string, nullable.
- `expiresAt`: datetime.
- `createdAt`: datetime.
- `confirmedAt`: datetime, nullable.

### 4.2 Category

Категория каталога.

Поля:

- `id`: UUID.
- `slug`: string, unique.
- `name`: string.
- `sortOrder`: integer.
- `isActive`: boolean.
- `createdAt`: datetime.
- `updatedAt`: datetime.

Стартовые категории из frontend:

- `premium`
- `gold`
- `limited`
- `new`
- `classic`

Пункт `Tutti` не хранится как категория. Это frontend-фильтр "все товары".

### 4.3 Product

Товар каталога.

Поля:

- `id`: UUID.
- `slug`: string, unique.
- `name`: string.
- `brand`: string.
- `categoryId`: UUID.
- `description`: string.
- `longDescription`: text.
- `badge`: string, nullable.
- `featured`: boolean.
- `rating`: decimal, nullable.
- `reviewsCount`: integer.
- `status`: `draft`, `active`, `archived`.
- `sortOrder`: integer.
- `createdAt`: datetime.
- `updatedAt`: datetime.

### 4.4 ProductMedia

Медиафайл товара.

Поля:

- `id`: UUID.
- `productId`: UUID.
- `type`: `image` или `video`.
- `url`: string.
- `thumbnailUrl`: string, nullable.
- `mimeType`: string.
- `sizeBytes`: integer.
- `width`: integer, nullable.
- `height`: integer, nullable.
- `durationSeconds`: integer, nullable для видео.
- `sortOrder`: integer.
- `alt`: string, nullable.
- `createdAt`: datetime.

Требования:

- Первый media item используется как превью карточки.
- Видео должно иметь thumbnail.
- Backend должен ограничивать размер и MIME-типы.

### 4.5 ProductPriceTier

Вариант цены товара.

Поля:

- `id`: UUID.
- `productId`: UUID.
- `label`: string, например `1g`, `2g`, `3g`, `5g`.
- `amount`: decimal.
- `currency`: `EUR`.
- `sortOrder`: integer.
- `isActive`: boolean.
- `createdAt`: datetime.
- `updatedAt`: datetime.

### 4.6 Cart

Для MVP корзина может храниться на frontend до оформления заказа. Backend должен принимать финальный список позиций в `POST /orders`, заново проверять цены и наличие товара по актуальным данным.

Опционально для авторизованных пользователей можно добавить server-side cart:

- `Cart`
- `CartItem`

Но это не обязательный блок первого MVP.

### 4.7 Order

Заказ пользователя.

Поля:

- `id`: UUID.
- `publicId`: string, например `ORD-000284`.
- `userId`: UUID, обязательный.
- `telegramIdSnapshot`: bigint/string.
- `telegramUsernameSnapshot`: string, nullable.
- `customerName`: string.
- `customerEmail`: string, nullable.
- `customerPhone`: string, nullable.
- `status`: `pending`, `accepted`, `completed`, `cancelled`.
- `subtotalAmount`: decimal.
- `totalAmount`: decimal.
- `currency`: `EUR`.
- `customerComment`: text, nullable.
- `adminComment`: text, nullable.
- `createdAt`: datetime.
- `updatedAt`: datetime.
- `acceptedAt`: datetime, nullable.
- `completedAt`: datetime, nullable.
- `cancelledAt`: datetime, nullable.

### 4.8 OrderItem

Позиция заказа.

Поля:

- `id`: UUID.
- `orderId`: UUID.
- `productId`: UUID.
- `productNameSnapshot`: string.
- `productBrandSnapshot`: string.
- `priceTierId`: UUID.
- `priceTierLabelSnapshot`: string.
- `unitPriceSnapshot`: decimal.
- `quantity`: integer.
- `lineTotal`: decimal.
- `thumbnailUrlSnapshot`: string, nullable.

Цена и название сохраняются snapshot-ом, чтобы старые заказы не менялись после редактирования товара.

### 4.9 Contact

Контакты для экрана Contacts.

Поля:

- `id`: UUID.
- `type`: `phone`, `telegram`, `whatsapp`, `email`, `address`, `custom`.
- `label`: string.
- `value`: string.
- `href`: string.
- `isActive`: boolean.
- `sortOrder`: integer.
- `createdAt`: datetime.
- `updatedAt`: datetime.

### 4.10 AuditLog

Лог административных действий.

Поля:

- `id`: UUID.
- `actorUserId`: UUID.
- `action`: string, например `product.create`, `order.status_update`.
- `entityType`: string.
- `entityId`: UUID.
- `before`: jsonb, nullable.
- `after`: jsonb, nullable.
- `ip`: string, nullable.
- `userAgent`: string, nullable.
- `createdAt`: datetime.

## 5. API Contract

Все endpoints имеют префикс:

```text
/api/v1
```

Формат ответа успешного запроса:

```json
{
  "data": {},
  "meta": {}
}
```

Формат ошибки:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request payload",
    "details": {}
  }
}
```

## 6. Public API

### 6.1 Health

```text
GET /health
```

Ответ:

```json
{
  "data": {
    "status": "ok",
    "version": "1.0.0"
  }
}
```

### 6.2 Categories

```text
GET /api/v1/categories
```

Ответ:

```json
{
  "data": [
    {
      "id": "uuid",
      "slug": "premium",
      "name": "Premium",
      "sortOrder": 10
    }
  ]
}
```

### 6.3 Product List

```text
GET /api/v1/products
```

Query params:

- `search`: string, optional.
- `category`: category slug, optional.
- `featured`: boolean, optional.
- `page`: number, default `1`.
- `limit`: number, default `20`, max `50`.
- `sort`: `newest`, `popular`, `price_asc`, `price_desc`, default `newest`.

Ответ:

```json
{
  "data": [
    {
      "id": "uuid",
      "slug": "nero-assoluto",
      "name": "Nero Assoluto",
      "brand": "F.K.H",
      "category": {
        "id": "uuid",
        "slug": "premium",
        "name": "Premium"
      },
      "description": "Extract premium di alta qualita",
      "badge": "Best Seller",
      "featured": true,
      "rating": 4.9,
      "reviewsCount": 128,
      "media": [
        {
          "id": "uuid",
          "type": "image",
          "url": "https://cdn.example.com/products/nero-1.jpg",
          "thumbnailUrl": "https://cdn.example.com/products/nero-1-thumb.jpg",
          "alt": "Nero Assoluto"
        }
      ],
      "priceTiers": [
        {
          "id": "uuid",
          "label": "1g",
          "amount": 10,
          "currency": "EUR"
        }
      ]
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 6,
    "totalPages": 1
  }
}
```

### 6.4 Product Detail

```text
GET /api/v1/products/:slug
```

Ответ должен включать все поля списка плюс:

- `longDescription`;
- полный список media;
- все активные price tiers;
- связанные товары, optional.

### 6.5 Contacts

```text
GET /api/v1/contacts
```

Возвращает активные контакты для экрана Contacts.

## 7. Auth API

Авторизация выполняется через Telegram-бота. На сайте не должно быть формы email/password регистрации или входа.

Основной flow:

1. Frontend запрашивает начало Telegram-login сессии.
2. Backend создает `TelegramAuthRequest` с одноразовым `nonce`.
3. Backend возвращает ссылку на бота вида `https://t.me/<bot_username>?start=<nonce>`.
4. Пользователь открывает бота и отправляет `/start <nonce>`.
5. Bot webhook получает Telegram user object.
6. Backend проверяет `nonce`, создает или обновляет `User`.
7. Frontend polling-ом получает access/refresh tokens.
8. На сайте отображается имя и username из Telegram-профиля.

### 7.1 Start Telegram Login

```text
POST /api/v1/auth/telegram/start
```

Ответ:

```json
{
  "data": {
    "authRequestId": "uuid",
    "botStartUrl": "https://t.me/the_fkh_bot?start=login_nonce",
    "expiresAt": "2026-05-08T22:00:00.000Z"
  }
}
```

### 7.2 Telegram Login Status

Frontend вызывает endpoint каждые 1-2 секунды, пока пользователь подтверждает вход в Telegram.

```text
GET /api/v1/auth/telegram/status/:authRequestId
```

Ответ для `pending`:

```json
{
  "data": {
    "status": "pending"
  }
}
```

Ответ для `confirmed`:

```json
{
  "data": {
    "status": "confirmed",
    "user": {
      "id": "uuid",
      "name": "Marco Rossi",
      "telegramId": "123456789",
      "telegramUsername": "marcorossi",
      "telegramPhotoUrl": "https://cdn.example.com/avatars/123456789.jpg",
      "role": "user"
    },
    "accessToken": "jwt",
    "refreshToken": "jwt"
  }
}
```

### 7.3 Telegram Bot Webhook

Endpoint принимает updates от Telegram Bot API.

```text
POST /api/v1/telegram/webhook
```

Требования:

- Webhook должен проверять secret header `X-Telegram-Bot-Api-Secret-Token`.
- Обрабатывается команда `/start <nonce>`.
- Backend должен найти активный `TelegramAuthRequest` по `nonce`.
- Если `nonce` истек или уже использован, бот отвечает сообщением об ошибке.
- Если `nonce` валиден, backend создает или обновляет пользователя по `telegramId`.
- В профиль сохраняются:
  - `telegramId`;
  - `telegramUsername`;
  - `telegramFirstName`;
  - `telegramLastName`;
  - `telegramLanguageCode`;
  - `telegramPhotoUrl`, если доступно.
- После успешного входа бот отправляет короткое подтверждение, например: `Accesso confermato. Puoi tornare al sito.`
- Webhook должен быстро отвечать Telegram `200 OK`; тяжелые операции выносить в background job.

Пример Telegram user object:

```json
{
  "id": 123456789,
  "is_bot": false,
  "first_name": "Marco",
  "last_name": "Rossi",
  "username": "marcorossi",
  "language_code": "it"
}
```

### 7.4 Refresh

```text
POST /api/v1/auth/refresh
```

### 7.5 Logout

```text
POST /api/v1/auth/logout
```

## 8. User API

Все endpoints требуют роль `user` или `admin`.

### 8.1 Current Profile

```text
GET /api/v1/me
PATCH /api/v1/me
```

`GET /me` должен возвращать Telegram-данные профиля:

```json
{
  "data": {
    "id": "uuid",
    "name": "Marco Rossi",
    "telegramId": "123456789",
    "telegramUsername": "marcorossi",
    "telegramPhotoUrl": "https://cdn.example.com/avatars/123456789.jpg",
    "role": "user",
    "status": "active"
  }
}
```

`PATCH /me` не должен позволять менять `telegramId`. Пользователь может менять только необязательные контактные поля, если они будут добавлены в UI.

### 8.2 My Orders

```text
GET /api/v1/me/orders
GET /api/v1/me/orders/:publicId
```

Профиль должен уметь разделять:

- текущие заказы: `pending`, `accepted`;
- историю: `completed`, `cancelled`.

## 9. Orders API

### 9.1 Create Order

```text
POST /api/v1/orders
```

Всегда требует авторизацию через Telegram. Guest checkout в MVP запрещен.

Body:

```json
{
  "customerComment": "Prefer contact via Telegram",
  "items": [
    {
      "productId": "uuid",
      "priceTierId": "uuid",
      "quantity": 1
    }
  ]
}
```

Backend обязан:

- получить пользователя из access token;
- проверить, что пользователь активен и не заблокирован;
- проверить существование товара;
- проверить, что товар активен;
- проверить, что price tier активен и принадлежит товару;
- взять актуальную цену из БД, а не доверять frontend;
- пересчитать итог;
- сохранить snapshot товара и цены;
- сохранить snapshot Telegram-профиля пользователя;
- создать заказ со статусом `pending`;
- вернуть созданный заказ;
- отправить уведомление администратору, если канал настроен.

### 9.2 Order Status Flow

Разрешенные переходы:

```text
pending -> accepted
pending -> cancelled
accepted -> completed
accepted -> cancelled
```

Запрещено:

- менять `completed` обратно на `pending`;
- редактировать позиции после создания заказа;
- удалять заказ физически из БД.

## 10. Admin API

Все endpoints требуют роль `admin`.

### 10.1 Dashboard

```text
GET /api/v1/admin/dashboard
```

Ответ:

```json
{
  "data": {
    "totalRevenue": 12480,
    "totalOrders": 284,
    "totalUsers": 156,
    "pendingOrders": 12,
    "ordersByStatus": {
      "pending": 12,
      "accepted": 8,
      "completed": 264,
      "cancelled": 0
    },
    "recentOrders": []
  }
}
```

### 10.2 Admin Products

```text
GET /api/v1/admin/products
POST /api/v1/admin/products
GET /api/v1/admin/products/:id
PATCH /api/v1/admin/products/:id
DELETE /api/v1/admin/products/:id
```

`DELETE` должен делать soft delete или переводить товар в `archived`.

Создание товара:

```json
{
  "name": "Nero Assoluto",
  "brand": "F.K.H",
  "categoryId": "uuid",
  "description": "Extract premium di alta qualita",
  "longDescription": "Full product description",
  "badge": "Best Seller",
  "featured": true,
  "status": "active",
  "priceTiers": [
    {
      "label": "1g",
      "amount": 10,
      "currency": "EUR",
      "sortOrder": 10
    }
  ],
  "media": [
    {
      "mediaId": "uuid",
      "sortOrder": 10,
      "alt": "Nero Assoluto"
    }
  ]
}
```

### 10.3 Admin Orders

```text
GET /api/v1/admin/orders
GET /api/v1/admin/orders/:id
PATCH /api/v1/admin/orders/:id/status
PATCH /api/v1/admin/orders/:id/comment
```

Query params для списка:

- `search`: by order id, user name, Telegram username, Telegram id, email, phone.
- `status`: `pending`, `accepted`, `completed`, `cancelled`.
- `dateFrom`: ISO date.
- `dateTo`: ISO date.
- `page`: number.
- `limit`: number.

Обновление статуса:

```json
{
  "status": "accepted"
}
```

### 10.4 Admin Users

```text
GET /api/v1/admin/users
GET /api/v1/admin/users/:id
PATCH /api/v1/admin/users/:id
PATCH /api/v1/admin/users/:id/status
```

Админ может:

- искать пользователей;
- смотреть количество заказов;
- смотреть сумму заказов;
- блокировать пользователя;
- редактировать отображаемое имя и optional contact fields;
- видеть Telegram `id`, `username`, имя и фото пользователя.

Админ не должен видеть токены авторизации. Паролей в системе нет.

### 10.5 Admin Contacts

```text
GET /api/v1/admin/contacts
POST /api/v1/admin/contacts
PATCH /api/v1/admin/contacts/:id
DELETE /api/v1/admin/contacts/:id
```

## 11. Media Upload API

### 11.1 Upload

```text
POST /api/v1/admin/media
Content-Type: multipart/form-data
```

Fields:

- `file`: image или video.
- `type`: `product`.

Ответ:

```json
{
  "data": {
    "id": "uuid",
    "type": "image",
    "url": "https://cdn.example.com/products/file.jpg",
    "thumbnailUrl": "https://cdn.example.com/products/file-thumb.jpg",
    "mimeType": "image/jpeg",
    "sizeBytes": 512000,
    "width": 1200,
    "height": 1600
  }
}
```

Требования:

- Images: `jpg`, `jpeg`, `png`, `webp`.
- Videos: `mp4`, `webm`.
- Max image size: 10 MB.
- Max video size: 100 MB для MVP.
- Генерировать thumbnail для видео.
- Проверять MIME не только по расширению.
- Хранить файлы вне репозитория.
- Возвращать CDN/S3 URL, который frontend может использовать напрямую.

## 12. Validation Rules

### 12.1 Product

- `name`: required, 2-120 chars.
- `brand`: required, 2-80 chars.
- `description`: required, 5-240 chars.
- `longDescription`: required, 10-5000 chars.
- `categoryId`: required.
- `priceTiers`: at least 1 active tier.
- `priceTiers.amount`: positive decimal.
- `priceTiers.label`: required, max 20 chars.
- `media`: at least 1 item для `active` товара.

### 12.2 Order

- `items`: 1-50 items.
- `quantity`: integer, 1-99.
- `customerComment`: optional, max 1000 chars.
- `userId`: берется только из access token, не принимается из body.
- `telegramIdSnapshot`: обязательный snapshot из текущего пользователя.
- `customerName`: формируется из Telegram-профиля, не обязателен в body.
- `customerEmail`: optional, valid email if provided.
- `customerPhone`: optional, valid phone if provided.

### 12.3 User

- `telegramId`: required, unique.
- `telegramUsername`: unique if provided.
- `telegramFirstName`: max 120 chars.
- `telegramLastName`: max 120 chars.
- `email`: optional, unique if provided.
- `phone`: optional, unique if provided.
- `role`: can be changed only by existing admin.

## 13. Security Requirements

- HTTPS only in production.
- Password auth is disabled. The site uses Telegram bot auth only.
- Telegram webhook must validate `X-Telegram-Bot-Api-Secret-Token`.
- Telegram login `nonce` must be random, single-use and expire after 5 minutes.
- Telegram `id` is the primary external identity key and must never be editable from frontend.
- Access token TTL: 15 minutes.
- Refresh token TTL: 7-30 days.
- Refresh token rotation and revocation on logout.
- Rate limiting for auth and order endpoints.
- CORS allowlist for frontend domains.
- Input validation on every endpoint.
- Output serialization without sensitive fields.
- Admin endpoints protected by role guard.
- Audit log for admin create/update/delete/status actions.
- File upload scanning and MIME validation.
- No secrets in repository.
- Production logs must not contain tokens, Telegram bot token, webhook secret or full payment data.

## 14. Compliance And Business Rules

Before production launch, owner must define:

- target country and regions;
- legal product type;
- whether age verification is required;
- whether KYC or document verification is required;
- whether Telegram-only account identity is enough for production compliance;
- delivery or pickup rules;
- data retention period;
- privacy policy and cookie policy.

Backend should include feature flags:

- `AGE_GATE_ENABLED`;
- `ORDER_NOTIFICATIONS_ENABLED`;
- `REGION_RESTRICTIONS_ENABLED`.

If the product category is legally restricted, backend must prevent ordering until required compliance checks are implemented.

## 15. Frontend Integration Plan

### 15.1 Replace mock products

Current source:

```text
src/app/data/products.ts
```

Replace with API client:

```text
GET /api/v1/products
GET /api/v1/products/:slug
GET /api/v1/categories
```

### 15.2 Replace mock orders

Current mock data:

- `MOCK_ORDERS`
- `ADMIN_ORDERS`

Replace with:

```text
GET /api/v1/me/orders
POST /api/v1/orders
GET /api/v1/admin/orders
PATCH /api/v1/admin/orders/:id/status
```

### 15.3 Replace admin mock stats

Current mock data:

- `ADMIN_STATS`
- `ADMIN_USERS`

Replace with:

```text
GET /api/v1/admin/dashboard
GET /api/v1/admin/users
```

### 15.4 API client requirements

Frontend should use one typed API layer:

- base URL from env: `VITE_API_BASE_URL`;
- Telegram bot URL и login session should be requested from backend, not hardcoded;
- automatic access token attach;
- refresh token handling;
- normalized error messages;
- loading and empty states per screen.

### 15.5 Telegram login UI requirements

Frontend must add a mandatory login flow:

- If user is not authenticated, show "Accedi con Telegram" instead of catalog checkout/profile access.
- Button calls `POST /api/v1/auth/telegram/start`.
- Frontend opens returned `botStartUrl` in Telegram.
- Frontend polls `GET /api/v1/auth/telegram/status/:authRequestId`.
- After status `confirmed`, frontend stores tokens and shows Telegram name/avatar in profile.
- If request expires, show retry state and create a new login request.
- Cart checkout must be blocked until Telegram login is completed.

## 16. Database Indexes

Required indexes:

- `users.telegramId` unique.
- `users.telegramUsername` unique where not null.
- `users.email` unique where not null.
- `users.phone` unique where not null.
- `telegram_auth_requests.nonce` unique.
- `telegram_auth_requests.status`.
- `telegram_auth_requests.expiresAt`.
- `products.slug` unique.
- `products.status`.
- `products.categoryId`.
- `products.featured`.
- `categories.slug` unique.
- `orders.publicId` unique.
- `orders.userId`.
- `orders.status`.
- `orders.createdAt`.
- `order_items.orderId`.
- `audit_logs.actorUserId`.
- `audit_logs.createdAt`.

Search:

- PostgreSQL trigram or full-text index for product name/description.
- Basic `ILIKE` is acceptable for MVP if catalog is small.

## 17. Notifications

MVP notification events:

- New order created.
- Order status changed.
- Admin changed product.

Possible channels:

- email;
- Telegram bot;
- webhook.

Implementation should use async queue if available. For MVP, direct send after transaction is acceptable, but failure to send notification must not rollback successful order creation.

## 18. Observability

Required:

- structured JSON logs;
- request id per request;
- error logging with stack trace in non-production;
- production-safe error responses;
- health check endpoint;
- DB connectivity check;
- upload storage connectivity check.

Metrics nice-to-have:

- request latency;
- error rate;
- orders created per day;
- admin status update count.

## 19. Testing Requirements

### 19.1 Unit tests

- Product validation.
- Order total calculation.
- Order status transition rules.
- Telegram nonce generation, expiration and single-use validation.
- Telegram user upsert by `telegramId`.
- JWT token rotation.

### 19.2 Integration tests

- Telegram bot login flow.
- Telegram webhook `/start <nonce>` confirmation.
- Product list/detail.
- Create order.
- User order history.
- Admin product CRUD.
- Admin order status update.
- Media upload validation.

### 19.3 Manual QA Checklist

- Catalog loads from API.
- Category chips filter products.
- Search returns expected products.
- Product detail opens by slug.
- Unauthenticated user cannot checkout and is sent to Telegram login.
- Telegram bot login creates profile with Telegram id, username, name and avatar.
- Cart creates order with correct total.
- User sees current and completed orders.
- Admin can create/edit/archive product.
- Admin can upload image/video.
- Admin can change order status.
- Blocked user cannot create order.

## 20. Environment Variables

```text
NODE_ENV=development
PORT=4000
DATABASE_URL=postgresql://user:password@localhost:5432/fkh
REDIS_URL=redis://localhost:6379
JWT_ACCESS_SECRET=change-me
JWT_REFRESH_SECRET=change-me
ACCESS_TOKEN_TTL=15m
REFRESH_TOKEN_TTL=30d
CORS_ORIGINS=http://localhost:5173
S3_ENDPOINT=
S3_REGION=
S3_BUCKET=
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
PUBLIC_CDN_URL=
AGE_GATE_ENABLED=false
ORDER_NOTIFICATIONS_ENABLED=false
REGION_RESTRICTIONS_ENABLED=false
TELEGRAM_BOT_TOKEN=
TELEGRAM_BOT_USERNAME=
TELEGRAM_WEBHOOK_URL=
TELEGRAM_WEBHOOK_SECRET=
TELEGRAM_LOGIN_REQUEST_TTL_SECONDS=300
TELEGRAM_ADMIN_CHAT_ID=
TELEGRAM_ADMIN_IDS=
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASSWORD=
```

## 21. Suggested Backend Folder Structure

```text
backend/
  src/
    app.module.ts
    main.ts
    config/
    database/
    auth/
    telegram/
    users/
    categories/
    products/
    media/
    orders/
    contacts/
    admin/
    audit/
    notifications/
    common/
  prisma/
    schema.prisma
    migrations/
    seed.ts
  test/
  docker-compose.yml
  .env.example
  package.json
  README.md
```

## 22. Implementation Milestones

### Milestone 1: Backend foundation

- Create backend project.
- Configure TypeScript, lint, env validation.
- Add PostgreSQL and Prisma.
- Add Docker Compose.
- Add health endpoint.
- Add OpenAPI docs.

### Milestone 2: Catalog

- Create categories, products, media, price tiers schema.
- Add seed from current mock products.
- Implement public catalog endpoints.
- Implement admin product CRUD.

### Milestone 3: Telegram auth and users

- Implement Telegram bot webhook.
- Implement Telegram login start/status flow.
- Implement Telegram user profile upsert by `telegramId`.
- Implement refresh/logout.
- Implement roles.
- Implement `/me`.
- Implement admin users list and status update.

### Milestone 4: Orders

- Implement order creation.
- Implement user order history.
- Implement admin order list/detail/status update.
- Add status transition validation.
- Add order notifications.

### Milestone 5: Media

- Implement admin media upload.
- Integrate S3-compatible storage.
- Add video thumbnail generation.
- Add upload validation.

### Milestone 6: Frontend integration

- Add frontend API client.
- Replace mock catalog data.
- Replace mock orders and admin stats.
- Add loading, empty and error states.
- Run full manual QA.

## 23. Acceptance Criteria

Backend is ready for frontend integration when:

- All MVP endpoints are implemented and documented in Swagger/OpenAPI.
- Database migrations run from empty DB.
- Seed creates categories, demo products, price tiers and admin user from configured Telegram id.
- Admin can create, edit and archive product.
- Product media supports images and video.
- User can login only through Telegram bot.
- Login creates or updates profile with Telegram id, username, display name and avatar.
- User can create an order only after Telegram login.
- User can view current and historical orders.
- Admin can view and update orders.
- Prices are recalculated server-side.
- Unauthorized users cannot access admin endpoints.
- Blocked users cannot create orders.
- Tests cover core flows.
- `.env.example` and local startup docs exist.

## 24. Open Questions Before Development

- Which backend framework should be used: NestJS, Express/Fastify, or another stack?
- What is the Telegram bot username?
- Which Telegram ids should be initial admins?
- Should admin login also be Telegram-only? Recommended: yes.
- Should the bot send order status notifications to the user in Telegram?
- Are phone/email fields needed as optional contact fields after Telegram login?
- Are products restricted by age, region or license?
- Which media storage provider will be used in production?
- Do we need online payments in the next phase?
- What production domain will be used for CORS and cookies?
