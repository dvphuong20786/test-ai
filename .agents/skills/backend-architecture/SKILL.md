---
name: backend-architecture
description: Quy tắc kiến trúc backend dùng chung. Đọc file này trước khi viết code backend. Áp dụng khi thêm API, sửa logic, tạo entity hoặc refactor; điều chỉnh tên thư mục theo repository thực tế.
---

# Backend — Kiến trúc & Quy tắc dùng chung

## 1. Tổng quan

Tài liệu này mô tả một mẫu **REST API server** theo Clean Architecture. Trước khi áp dụng, phải đọc stack và cấu trúc repository hiện tại; các tên module CMS bên dưới chỉ là ví dụ và phải được thay bằng nghiệp vụ thật của dự án.

### Stack kỹ thuật

| Thành phần | Công nghệ | Ghi chú |
|------------|-----------|---------|
| Runtime | **Bun** (không phải Node.js) | Dùng `Bun.serve()` làm HTTP server |
| Ngôn ngữ | **TypeScript** (strict mode) | ESNext target, ESM module |
| Database | **SQLite** (file nhúng) | Qua `bun:sqlite`, không cần DB server |
| Dependencies | **Zero runtime deps** | Chỉ có devDependencies: `@types/bun`, `typescript` |
| Auth | Session-based + PBKDF2 | Token 64-char hex, hash SHA-256 lưu DB |
| Deploy | Single binary + SQLite file | Không cần Docker/K8s (có thể dùng nếu muốn) |

### Quy tắc vàng

> **KHÔNG** thêm bất kỳ runtime dependency nào (`dependencies` trong package.json phải luôn rỗng `{}`).
> Mọi thứ tự viết hoặc dùng API có sẵn của Bun/Web Standards.

---

## 2. Kiến trúc — Clean Architecture (Hexagonal)

```
functions/
├── index.ts              ← Entrypoint: Bun.serve(), CORS, write queue, shutdown
├── container.ts          ← DI container: tạo repos, services, use cases, router
│
├── domain/               ← TẦNG 1: Business logic thuần (KHÔNG import infrastructure/interface)
│   ├── shared/           ← Types, errors, validation dùng chung
│   │   ├── errors.ts     ← ApiError class + Errors factory (notFound, badRequest, ...)
│   │   ├── types.ts      ← AuthUser, Ctx, Handler, Guard, Pagination, Permission, PERMISSIONS
│   │   └── validation.ts ← validate(), cleanString(), isSafeUrl(), slugify()
│   ├── auth/             ← Entities + interfaces cho authentication
│   ├── content/          ← Entities + interfaces cho nội dung (posts, pages, media, ...)
│   ├── form/             ← Entities + interfaces cho form submissions
│   └── admin/            ← Entities + interfaces cho quản trị (users, audit)
│
├── application/          ← TẦNG 2: Use cases (orchestrate domain logic)
│   ├── auth/             ← SetupUseCase, LoginUseCase, LogoutUseCase, ChangePasswordUseCase
│   ├── content/          ← SavePostUseCase, DeletePostUseCase, UploadMediaUseCase, ...
│   ├── form/             ← SubmitFormUseCase, UpdateSubmissionUseCase
│   └── admin/            ← SaveUserUseCase, DeleteUserUseCase
│
├── infrastructure/       ← TẦNG 3: Chi tiết kỹ thuật (database, crypto, ...)
│   ├── persistence/      ← SQLite: connection, helpers, schema, seed, migrate, serializers
│   ├── security/         ← crypto.ts (PBKDF2), rate-limiter.ts (SQLite-backed)
│   └── openapi/          ← OpenAPI spec generator
│
├── interface/            ← TẦNG 4: HTTP layer (routes, middleware, helpers)
│   └── http/
│       ├── router.ts     ← Regex-based router với path params
│       ├── helpers/      ← request.ts (readJson, readPagination), response.ts (json, paginated, errorResponse)
│       ├── middleware/   ← auth.ts (resolveUser, cookie, readSessionToken)
│       └── routes/       ← auth.routes.ts, public.routes.ts, admin-content.routes.ts, admin-ops.routes.ts
│
├── _lib/                 ← [DEPRECATED] Code cũ, giữ tạm để rollback
├── routes/               ← [DEPRECATED] Route handlers cũ
├── cms.ts                ← [DEPRECATED] CmsStore class cũ
└── index.old.ts          ← [DEPRECATED] Backup index.ts cũ
```

### Quy tắc phụ thuộc (Dependency Rule)

```
domain ← application ← infrastructure
                      ← interface
```

- **domain/** KHÔNG ĐƯỢC import từ `application/`, `infrastructure/`, `interface/`
- **application/** import từ `domain/` (entities, interfaces, errors). KHÔNG import từ `infrastructure/`, `interface/`
- **infrastructure/** import từ `domain/` (implements interfaces)
- **interface/** import từ `domain/` (types), `application/` (use cases), `infrastructure/` (serializers, helpers cho DB queries trực tiếp trong routes)
- **container.ts** là nơi DUY NHẤT kết nối tất cả các tầng lại với nhau
- **index.ts** chỉ import `container.ts`, `domain/shared/errors`, `interface/http/helpers/response`, `interface/http/middleware/auth`

---

## 3. Từng tầng chi tiết

### 3.1 Domain (domain/)

Chứa **business logic thuần**, không biết về database, HTTP, hay bất kỳ framework nào.

#### 3.1.1 Entities (domain/*/entities.ts)

Khai báo TypeScript interfaces/types cho các domain object:

```typescript
// domain/content/entities.ts
export interface SeoMeta {
  title: string;
  keywords: string;
  // ...
}

export const POST_STATUSES = ["draft", "published", "hidden"] as const;
export const MEDIA_TYPES = ["image/jpeg", "image/png", ...];
```

**Quy tắc:**
- Chỉ dùng TypeScript interfaces/types + constants
- Không import thư viện ngoài
- Không chứa logic phức tạp (chỉ có helper functions đơn giản như `mediaUrl()`)

#### 3.1.2 Repository Interfaces (domain/*/I*Repo.ts)

Định nghĩa contract cho data access — KHÔNG chứa implementation:

```typescript
// domain/content/IPostRepo.ts
export interface IPostRepo {
  findById(id: number): Record<string, unknown> | null;
  create(data: Record<string, unknown>): number;
  update(id: number, data: Record<string, unknown>): void;
  delete(id: number): void;
  existsSlug(slug: string, excludeId?: number): boolean;
  syncTags(postId: number, tagNames: string[]): void;
  // ...
}
```

**Quy tắc:**
- File name: `I` + tên entity + `Repo.ts` (ví dụ: `IPostRepo.ts`)
- Return type thường là `Record<string, unknown>` (raw DB row) hoặc typed object
- Mutation methods return `void` hoặc `number` (inserted ID)
- Mỗi module có các repos riêng: auth có `IAuthRepo`, `ISessionRepo`; content có `IPostRepo`, `ICategoryRepo`, ...

#### 3.1.3 Service Interfaces (domain/auth/ICryptoService.ts)

```typescript
export interface ICryptoService {
  hashPassword(password: string): Promise<string>;
  verifyPassword(password: string, stored: string): Promise<boolean>;
  randomToken(bytes?: number): string;
  sha256(input: string): Promise<string>;
}
```

#### 3.1.4 Business Rules (domain/content/rules.ts)

Logic nghiệp vụ thuần, không phụ thuộc DB:

```typescript
export function assertPublishable(p: { title: string; slug: string; ... }): void { ... }
export function sanitizeHtml(html: string): string { ... }
export function validateSeo(raw: unknown): Partial<SeoMeta> { ... }
```

**Quy tắc:**
- Throw `Errors.validation(...)` khi vi phạm business rules
- KHÔNG truy cập database — chỉ nhận data qua parameters
- Import từ `domain/shared/` OK, nhưng KHÔNG import từ tầng khác

#### 3.1.5 Shared (domain/shared/)

- **errors.ts**: Class `ApiError` và factory `Errors` (`.notFound()`, `.badRequest()`, `.validation()`, `.unauthorized()`, `.forbidden()`, `.tooMany()`, `.conflict()`, `.payloadTooLarge()`)
- **types.ts**: `AuthUser`, `Ctx`, `Handler`, `Guard`, `Pagination`, `Permission`, `PERMISSIONS`
- **validation.ts**: Hàm `validate()` (schema-based validation), `cleanString()`, `isSafeUrl()`, `slugify()`

---

### 3.2 Application (application/)

Chứa **use cases** — mỗi use case là một class với method `execute()`.

#### Pattern chuẩn:

```typescript
// application/content/post/SavePostUseCase.ts
import type { IPostRepo } from "../../../domain/content/IPostRepo";
import type { ISeoRepo } from "../../../domain/content/ISeoRepo";
import type { IAuditRepo } from "../../../domain/admin/IAuditRepo";
import { Errors } from "../../../domain/shared/errors";
import { slugify } from "../../../domain/shared/validation";

export class SavePostUseCase {
  constructor(
    private postRepo: IPostRepo,
    private categoryRepo: ICategoryRepo,
    private seoRepo: ISeoRepo,
    private auditRepo: IAuditRepo,
  ) {}

  execute(input: {
    id: number | null;
    title: string; slug: string; /* ... */
    userId: number | null; userEmail: string; ip: string;
  }) {
    // 1. Validate business rules
    // 2. Call repo methods
    // 3. Audit log
    // 4. Return result
  }
}
```

**Quy tắc:**
- Mỗi file = 1 use case class
- Tên file: `VerbNounUseCase.ts` (ví dụ: `SavePostUseCase.ts`, `DeleteUserUseCase.ts`)
- Constructor nhận **interfaces** (IPostRepo, IAuditRepo, ...), KHÔNG nhận concrete classes
- Method `execute()` nhận plain object input, return plain object output
- Throw `Errors.*` khi lỗi nghiệp vụ
- Luôn gọi `auditRepo.log(...)` sau mutation để ghi lịch sử
- Async chỉ khi cần (ví dụ: crypto.hashPassword)

#### Khi nào KHÔNG cần use case:

- Queries đơn giản (list, get by ID) — route handler gọi `db` trực tiếp
- Toggle visibility, reorder — quá đơn giản, inline trong route handler
- Chỉ tạo use case khi có **business logic phức tạp** (validation, nhiều repo, side effects)

---

### 3.3 Infrastructure (infrastructure/)

#### 3.3.1 Persistence (infrastructure/persistence/)

- **connection.ts**: `openDatabase(path)` mở SQLite với pragmas, class `Db` wrap `bun:sqlite` với typed methods (`all`, `one`, `run`, `insert`, `count`, `transaction`, `close`)
- **schema.ts**: `DDL` array chứa CREATE TABLE statements, `SCHEMA_VERSION` number
- **seed.ts**: Dữ liệu ban đầu (settings, pages, sections, solutions, plans, categories, SEO)
- **migrate.ts**: `runMigrations(db)` — chạy DDL, upsert roles, seed nếu chưa có
- **helpers.ts**: `parseJson()`, `likeTerm()` (SQL LIKE escape)
- **serializers.ts**: Chuyển DB row → API response object (`postFromRow()`, `solutionFromRow()`, `mediaOut()`, ...)

**Quy tắc thêm bảng mới:**
1. Thêm `CREATE TABLE IF NOT EXISTS ...` vào `schema.ts` DDL array
2. Tăng `SCHEMA_VERSION`
3. Thêm seed data vào `seed.ts` nếu cần
4. Thêm serializer vào `serializers.ts`

#### 3.3.2 Security (infrastructure/security/)

- **crypto.ts**: `BunCryptoService` implements `ICryptoService` — PBKDF2-SHA256 password hashing, WebCrypto SHA-256, random token
- **rate-limiter.ts**: `SqliteRateLimiter` — fixed-window rate limiter persisted trong SQLite table `rate_limits`

#### 3.3.3 Repo Implementations

Hiện tại repo implementations nằm **inline trong container.ts** (không tách file riêng). Mỗi repo là một object literal implements interface tương ứng, gọi `db.*` methods.

Nếu muốn tách, đặt trong `infrastructure/persistence/repos/SqlitePostRepo.ts`, v.v.

---

### 3.4 Interface (interface/http/)

#### 3.4.1 Router (interface/http/router.ts)

Regex-based router, tự viết (không dùng framework):

```typescript
const router = new Router();
router.add("GET", "/api/admin/posts/:id", "content.read", handler);
router.add("POST", "/api/admin/posts", "content.write", handler);
```

- **method**: HTTP method (GET, POST, PUT, PATCH, DELETE)
- **path**: URL pattern với `:param` cho path parameters
- **guard**: Permission string (`"content.read"`, `"content.write"`, ...), `"auth"` (chỉ cần đăng nhập), hoặc `null` (public)
- **handler**: `(ctx: Ctx) => Response | Promise<Response>`

#### 3.4.2 Route Files (interface/http/routes/*.routes.ts)

Mỗi file export một hàm `registerXxxRoutes(router, ...dependencies)`:

| File | Mô tả | Guard |
|------|--------|-------|
| `auth.routes.ts` | Login, logout, setup, change password | `null` hoặc `"auth"` |
| `public.routes.ts` | API công khai: site data, posts, pages, solutions, pricing, forms, sitemap, robots.txt | `null` |
| `admin-content.routes.ts` | CRUD posts, categories, tags, media, pages, sections, solutions, features, pricing, SEO, settings | `"content.read"`, `"content.write"`, `"media.write"`, `"seo.write"`, `"auth"` |
| `admin-ops.routes.ts` | Dashboard, form submissions, users, audit logs | `"dashboard.view"`, `"forms.read"`, `"forms.write"`, `"users.manage"`, `"audit.read"` |

**Pattern chuẩn cho route handler:**

```typescript
// READ (đơn giản — gọi db trực tiếp)
r.add("GET", "/api/admin/posts", "content.read", (ctx) => {
  const p = readPagination(ctx.url, 20);
  const total = db.count("SELECT COUNT(*) AS c FROM posts");
  const rows = db.all("...");
  return json(paginated(rows.map(r => postFromRow(db, r, false)), total, p));
});

// WRITE (phức tạp — gọi use case)
r.add("POST", "/api/admin/posts", "content.write", async (ctx) => {
  const raw = await readJson(ctx.req, 2_000_000);
  const body = validate(raw, POST_SCHEMA);
  const result = savePostUC.execute({ ...body, ...u(ctx) });
  return json({ data: result }, 201);
});
```

**Quy tắc:**
- Import `Errors` luôn bằng **static import** ở đầu file (KHÔNG dùng `require()` hay `await import()`)
- Import `paginated` từ `response.ts`, import `readPagination` và `readJson` từ `request.ts`
- Helper `u(ctx)` trích `{ userId, userName, userEmail, ip }` từ context
- Response luôn dùng `json()` helper, không `Response.json()`
- Audit log: gọi trong use case (nếu có), hoặc gọi `auditRepo.log(...)` trực tiếp trong handler

#### 3.4.3 Helpers

- **request.ts**: `readPagination(url, defaultLimit?, maxLimit?)`, `readJson(req, maxBytes?)`
- **response.ts**: `json(data, status?, headers?)`, `errorResponse(err)`, `paginated(data, total, p)`

#### 3.4.4 Middleware (interface/http/middleware/auth.ts)

- `readSessionToken(req)`: Đọc token từ `X-Admin-Token` header, `Authorization: Bearer`, hoặc cookie `shkd_session`
- `cookie(token, maxAgeSec)`: Tạo Set-Cookie string
- `resolveUser(req, db, crypto)`: Tìm user từ session token, trả về `AuthUser | null`

---

## 4. DI Container (container.ts)

File `container.ts` là **composition root** — nơi duy nhất kết nối mọi thứ:

```typescript
export function boot(databasePath: string) {
  // 1. Mở database, chạy migrations
  const db = new Db(openDatabase(databasePath));
  db.transaction(() => runMigrations(db));

  // 2. Tạo infrastructure services
  const crypto = new BunCryptoService();
  const rateLimiter = new SqliteRateLimiter(db);

  // 3. Tạo repos (inline implementations)
  const postRepo = createPostRepo(db);
  // ...

  // 4. Tạo use cases (inject repos)
  const savePostUC = new SavePostUseCase(postRepo, categoryRepo, seoRepo, auditRepo);
  // ...

  // 5. Tạo router, đăng ký routes (inject use cases)
  const router = new Router();
  registerAuthRoutes(router, authRepo, loginUC, ...);
  // ...

  return { db, router, crypto };
}
```

**Khi thêm feature mới:**
1. Tạo interface trong `domain/`
2. Tạo use case trong `application/`
3. Thêm repo implementation trong `container.ts` (hoặc tách file nếu phức tạp)
4. Tạo hoặc mở rộng route file trong `interface/http/routes/`
5. Wire mọi thứ trong `container.ts`

---

## 5. Database Schema

### Các bảng hiện có

| Bảng | Mô tả |
|------|--------|
| `meta` | Key-value store (schema_version, seeded flag) |
| `settings` | Cấu hình website (JSON value): website, branding, header, footer, contact, forms, integrations |
| `users` | Tài khoản admin (email, password_hash, role, active) |
| `roles` | Vai trò + permissions (super_admin, admin, editor, viewer) |
| `sessions` | Phiên đăng nhập (token_hash, user_id, expires_at) |
| `posts` | Bài viết (title, slug, content, status, category_id, published_at) |
| `categories` | Danh mục bài viết |
| `tags` | Thẻ |
| `post_tags` | Many-to-many posts ↔ tags |
| `media` | Hình ảnh (binary data lưu trực tiếp trong SQLite, metadata) |
| `pages` | Trang nội dung tĩnh (slug, data JSON) |
| `sections` | Sections của trang (page_slug, key, data JSON) |
| `solutions` | Giải pháp/sản phẩm |
| `features` | Tính năng của solutions |
| `pricing_plans` | Bảng giá |
| `seo_meta` | SEO metadata (entity_type + entity_key → title, description, og, schema) |
| `form_submissions` | Form liên hệ/đăng ký dùng thử (type, name, phone, email, status) |
| `submission_notes` | Ghi chú nội bộ cho submissions |
| `audit_logs` | Lịch sử thao tác (user, action, entity, detail) |
| `rate_limits` | Rate limiting data (key, window_start, count) |

### Quy tắc database

- Column names dùng **snake_case** (`created_at`, `category_id`)
- API response dùng **camelCase** (`createdAt`, `categoryId`) — chuyển đổi trong serializers
- Boolean lưu dạng `INTEGER` (0/1)
- JSON lưu dạng `TEXT` (stringify/parse)
- Binary (media) lưu dạng `BLOB`
- Timestamps lưu dạng `INTEGER` (milliseconds since epoch — `Date.now()`)
- Foreign keys: `ON DELETE CASCADE` hoặc xử lý thủ công trong code

---

## 6. API Conventions

### URL Pattern

```
/api/public/*         ← Public endpoints (không cần auth)
/api/auth/*           ← Authentication endpoints
/api/admin/*          ← Admin endpoints (cần auth + permission)
/api/media/:id        ← Serve media binary (public)
/api/openapi.json     ← OpenAPI spec
/api/docs             ← Swagger UI
/sitemap.xml          ← SEO sitemap
/robots.txt           ← SEO robots
```

Prefix `/~api/` được strip bởi `index.ts` (cho reverse proxy).

### Response Format

```typescript
// Success (single item)
{ "data": { ... } }

// Success (list with pagination)
{
  "data": [...],
  "pagination": { "page": 1, "limit": 20, "total": 42, "totalPages": 3 }
}

// Error
{
  "error": {
    "code": "VALIDATION_ERROR",   // hoặc NOT_FOUND, UNAUTHORIZED, FORBIDDEN, ...
    "message": "Tiêu đề không được để trống",
    "details": { "title": "Vui lòng nhập tiêu đề" }   // null nếu không có
  }
}
```

### HTTP Status Codes

| Code | Khi nào |
|------|---------|
| 200 | Thành công (read, update) |
| 201 | Tạo mới thành công |
| 400 | Bad request, validation error |
| 401 | Chưa đăng nhập |
| 403 | Không có quyền / CSRF check fail |
| 404 | Không tìm thấy |
| 405 | Method not allowed |
| 409 | Conflict (ví dụ: xoá super admin cuối cùng) |
| 413 | Payload too large |
| 429 | Rate limit exceeded |
| 500 | Server error |

### Authentication

1. Client gửi POST `/api/auth/login` với `{ email, password }`
2. Server trả về `{ token, expiresAt, user }` + Set-Cookie
3. Các request tiếp theo gửi token qua:
   - Header `X-Admin-Token: <token>` (ưu tiên)
   - Header `Authorization: Bearer <token>`
   - Cookie `shkd_session=<token>`
4. Mutations (POST/PUT/PATCH/DELETE) từ browser phải có cơ chế chống CSRF phù hợp với kiểu xác thực; nếu dùng custom header, tên header/value phải được cấu hình theo dự án.

### Permission System

Mỗi user có `role`, mỗi role có danh sách `permissions`:

| Role | Permissions |
|------|-------------|
| `super_admin` | Tất cả |
| `admin` | content.*, media.*, seo.*, forms.*, appearance.*, settings.*, dashboard.view, audit.read |
| `editor` | content.read, content.write, media.read, media.write, seo.write, dashboard.view |
| `viewer` | content.read, media.read, dashboard.view |

Route guard kiểm tra permission: `r.add("GET", "/api/admin/posts", "content.read", handler)` → user phải có permission `content.read`.

---

## 7. Validation

Dùng hàm `validate()` từ `domain/shared/validation.ts` với schema object:

```typescript
const body = validate(await readJson(ctx.req), {
  title:    { type: "string", required: true, max: 200, label: "Tiêu đề" },
  slug:     { type: "string", max: 160, label: "Slug", pattern: /^[a-z0-9-]+$/ },
  email:    { type: "email", required: true, label: "Email" },
  status:   { type: "enum", values: ["draft", "published"], label: "Trạng thái" },
  tags:     { type: "strings", maxItems: 20, maxLen: 50, label: "Thẻ" },
  data:     { type: "json", required: true, kind: "object", maxBytes: 300_000, label: "Nội dung" },
  visible:  { type: "boolean", label: "Hiển thị" },
  price:    { type: "number", nullable: true, integer: true, min: 0, label: "Giá" },
  coverUrl: { type: "url", label: "Ảnh", allowRelative: true },
});
```

**Supported types:** `string`, `email`, `number`, `boolean`, `enum`, `strings` (array of strings), `json`, `url`

---

## 8. Quy trình thêm feature mới

### Ví dụ: Thêm module "Testimonials" (đánh giá khách hàng)

#### Bước 1: Domain

```
domain/content/entities.ts       ← Thêm interface Testimonial
domain/content/ITestimonialRepo.ts  ← Tạo interface repo mới
```

#### Bước 2: Application (nếu có logic phức tạp)

```
application/content/testimonial/SaveTestimonialUseCase.ts
application/content/testimonial/DeleteTestimonialUseCase.ts
```

#### Bước 3: Infrastructure

```
infrastructure/persistence/schema.ts      ← Thêm CREATE TABLE testimonials
infrastructure/persistence/serializers.ts  ← Thêm testimonialFromRow()
```

#### Bước 4: Interface

```
interface/http/routes/admin-content.routes.ts  ← Thêm routes CRUD
interface/http/routes/public.routes.ts         ← Thêm route public (nếu cần)
```

#### Bước 5: Container

```
container.ts  ← Thêm createTestimonialRepo(db), tạo use cases, truyền vào route registration
```

#### Bước 6: Verify

```bash
npx tsc --noEmit    # hoặc: .\node_modules\.bin\tsc.cmd --noEmit
bun run dev         # chạy thử
```

---

## 9. Coding Style

### TypeScript

- **Strict mode** bật (tsconfig: `"strict": true`)
- Dùng `type` imports khi chỉ dùng cho type checking: `import type { IPostRepo } from "..."`
- Không dùng `any` — dùng `unknown` + type narrowing
- Không dùng `class` cho repos (dùng object literal trả về từ factory function)
- Dùng `class` cho use cases và services (constructor injection)
- Return types thường inferred, chỉ khai báo explicit khi cần thiết

### Naming

| Loại | Convention | Ví dụ |
|------|-----------|-------|
| File | kebab-case hoặc PascalCase | `auth.routes.ts`, `SavePostUseCase.ts` |
| Interface file | `I` + PascalCase + `Repo/Service` | `IPostRepo.ts`, `ICryptoService.ts` |
| Class | PascalCase | `SavePostUseCase`, `BunCryptoService` |
| Function | camelCase | `registerAuthRoutes()`, `postFromRow()` |
| DB column | snake_case | `created_at`, `category_id` |
| API field | camelCase | `createdAt`, `categoryId` |
| Route file | kebab-case + `.routes.ts` | `admin-content.routes.ts` |
| Constant | UPPER_SNAKE_CASE hoặc PascalCase | `POST_STATUSES`, `MEDIA_TYPES` |

### Error handling

- Business errors: throw `Errors.*()` — tự động chuyển thành JSON response bởi `errorResponse()`
- Không dùng try/catch trong route handlers (trừ khi cần xử lý đặc biệt)
- `index.ts` wrap mọi handler trong try/catch → `errorResponse(err)`

### Imports

- Luôn dùng **static imports** ở đầu file
- **KHÔNG** dùng `require()` hay `await import()` trong function body
- Import order: types → domain → application → infrastructure → interface → local

---

## 10. Security Checklist

- [ ] Input validation: Mọi user input qua `validate()` hoặc `cleanString()`
- [ ] SQL injection: Dùng parameterized queries (`db.all("... WHERE id = ?", id)`) — KHÔNG string concatenation
- [ ] XSS: Rich text qua `sanitizeHtml()`, URLs qua `isSafeUrl()`, links qua `assertSafeLinks()`
- [ ] CSRF: Mutation requests có cơ chế chống CSRF phù hợp (custom header, CSRF token hoặc token authorization).
- [ ] Rate limiting: `rateLimiter.check(key, limit, windowMs)` cho login, setup, form submit
- [ ] Auth: Route guard kiểm tra permission trước khi cho phép truy cập
- [ ] Passwords: PBKDF2-SHA256 100K iterations, constant-time comparison
- [ ] Media: Chỉ cho phép image MIME types, check SVG cho script injection, giới hạn 10MB
- [ ] Audit: Mọi mutation phải ghi audit log

---

## 11. Env Variables

| Variable | Default | Mô tả |
|----------|---------|--------|
| `DATABASE_PATH` | `/var/data/app/app.sqlite` | Đường dẫn file SQLite; cấu hình lại theo môi trường triển khai |
| `PORT` | `3001` | Port lắng nghe |
| `HOST` | `0.0.0.0` | Bind address |
| `TRUST_PROXY` | `"1"` | Trust `X-Real-IP`/`X-Forwarded-For` headers |

---

## 12. Các lệnh thường dùng

```bash
# Cài dependencies (chỉ devDependencies)
npm install
# hoặc: bun install

# Chạy dev server (hot reload)
bun run dev
# hoặc: bun --watch run index.ts

# Chạy production
bun run start
# hoặc: bun run index.ts

# TypeScript type checking
.\node_modules\.bin\tsc.cmd --noEmit -p tsconfig.json
# hoặc: npx tsc --noEmit
```

---

## 13. Lưu ý quan trọng cho AI models

1. **Đọc file này TRƯỚC** khi viết bất kỳ code backend nào
2. **KHÔNG thêm runtime dependencies** — `dependencies` trong package.json phải rỗng
3. **KHÔNG dùng Node.js APIs** mà Bun không hỗ trợ — dùng Web Standards APIs (fetch, Request, Response, crypto.subtle, ...)
4. **KHÔNG dùng `require()` hay `await import()`** trong function body — chỉ static imports
5. **Tuân thủ dependency rule** — domain không import infrastructure, application không import interface
6. **Mọi mutation phải có audit log** — gọi `auditRepo.log(...)`
7. **Messages/labels bằng tiếng Việt** — error messages, validation labels
8. **Luôn cập nhật CHANGELOG.md** sau khi thay đổi code (xem skill `changelog-update`)
9. **Copy trước, cải tiến sau** — khi refactor, giữ nguyên behavior, chỉ đổi cấu trúc
10. **Typecheck phải PASS** trước khi coi là xong: `tsc --noEmit`
