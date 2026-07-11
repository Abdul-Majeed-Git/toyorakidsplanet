# CLAUDE.md — ToyOraKids Project Context

> **Purpose:** Ye file kisi bhi AI (Claude, Gemini, GPT) ke liye ek complete project snapshot he.
> Ise padhne ke baad AI ko koi bhi source file baar baar read karne ki zaroorat nahi hogi.
> Tokens bachao, seedha kaam pe ao.

---

## 1. Project Identity

- **Name:** ToyOraKids
- **Type:** Full-stack e-commerce website — Kids' garments & Montessori toys
- **Design System:** Linear/Modern — Glassmorphism, dark mode, ambient glow, spotlight hover, CSS Grid
- **Currency:** PKR (Pakistani Rupees)
- **Checkout Method:** WhatsApp redirect (no payment gateway)
- **Deployment:** Vercel (serverless) + Supabase (PostgreSQL database)

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Vanilla HTML5, CSS3, ES6 JavaScript (no framework) |
| Backend | Vercel Serverless Functions (Node.js) |
| Database | Supabase (PostgreSQL) |
| Auth | Custom JWT (jsonwebtoken) + bcryptjs password hashing |
| Session | HttpOnly Secure Cookie (`toyorakids_token`) |
| Styling | Custom CSS variables, CSS Grid, Flexbox |
| Icons | Font Awesome 6.4 |

---

## 3. Complete File Structure

```
e:\toyora website\
│
├── index.html              # Home: Hero, Categories, Featured Products
├── shop.html               # Catalog: 5-col grid, search, filter, sort
├── product-detail.html     # Detail: Gallery, specs, sizes, WhatsApp order
├── wishlist.html           # Wishlist: glassmorphic grid from localStorage
├── checkout.html           # Checkout: Shipping form → WhatsApp redirect
├── about.html              # About: Loads from localStorage (admin-editable)
├── blog.html               # Blog listing: Loads from localStorage
├── blog-post.html          # Single blog post view
├── admin.html              # Admin Dashboard: Secure JWT login, 5 tabs
├── customer.html           # Customer Dashboard: Profile, Orders, Wishlist, Password
│
├── css/
│   └── style.css           # Global design system — all CSS variables & components
│
├── js/
│   ├── products.js         # Static fallback product catalog (initialProducts array)
│   ├── app.js              # Core app logic: cart, wishlist, pages, WhatsApp, admin tabs
│   └── auth.js             # Auth drawer UI: Login/Register/Forgot tabs → /api/auth/*
│
├── api/
│   ├── db.js               # Supabase client init (reads env vars)
│   ├── products.js         # GET/POST/DELETE products — POST/DELETE need Admin/Staff JWT
│   ├── orders.js           # POST (place order), GET (my orders) — GET needs JWT
│   ├── wishlist.js         # GET/POST toggle — needs JWT
│   ├── helpers/
│   │   └── auth.js         # hashPassword, comparePassword, JWT utils, RBAC, rate-limit, audit
│   └── auth/
│       ├── register.js     # POST — new user signup, email verification token
│       ├── login.js        # POST — bcrypt verify, rate-limit, set HttpOnly cookie
│       ├── logout.js       # POST — clear cookie
│       ├── session.js      # GET — return current user from cookie
│       ├── verify-email.js # GET/POST — activate account via token
│       ├── forgot-password.js # POST — generate reset token (debugLink in response)
│       ├── reset-password.js  # POST — consume token, update password
│       ├── change-password.js # POST — needs JWT, old+new password
│       ├── profile.js      # GET/POST — needs JWT, read/update name+email
│       └── users.js        # GET/PATCH — Admin/SuperAdmin only, list users + change roles
│
├── supabase_setup.sql      # Run once in Supabase SQL Editor to create all tables
├── vercel.json             # API routes + security headers config
├── package.json            # Dependencies: @supabase/supabase-js, bcryptjs, jsonwebtoken, cookie
└── .env.example            # Template for environment variables
```

---

## 4. Database Tables (Supabase PostgreSQL)

| Table | Key Columns | Purpose |
|---|---|---|
| `roles` | id, name | Super Admin / Admin / Staff / Customer |
| `users` | id, name, email, password_hash, role_id, is_verified | User accounts |
| `products` | id, name, price, category, image_url, sizes, rating | Product catalog |
| `email_verification_tokens` | user_id, token, expires_at | Email activation |
| `password_reset_tokens` | user_id, token, expires_at | Password reset (1hr expiry) |
| `login_history` | email, ip_address, status, timestamp | Rate-limiting + audit |
| `audit_logs` | user_id, action, target, details, timestamp | Admin action log |
| `orders` | user_id, items (jsonb), total_amount, shipping_*, status | Order history |
| `wishlists` | user_id, product_id | Cloud wishlist per user |

---

## 5. User Roles & Permissions

| Role | ID | Can Do |
|---|---|---|
| Super Admin | 1 | Everything — including changing other admin roles |
| Admin | 2 | Products, Blog, About, Orders, Users list |
| Staff | 3 | Products only (other admin tabs hidden) |
| Customer | 4 | Own profile, orders, wishlist |

**Default Super Admin credentials (set in supabase_setup.sql):**
- Email: `superadmin@toyorakids.com`
- Password: `SuperAdminSecure123!`

---

## 6. Environment Variables

Set in Vercel Dashboard → Project → Settings → Environment Variables:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJ...  (anon/public key from Supabase API settings)
JWT_SECRET=any-long-random-string-you-choose
```

---

## 7. Authentication Flow

### Login
1. User submits email + password in drawer (`js/auth.js`)
2. `POST /api/auth/login` called
3. Backend: rate-limit check → fetch user → bcrypt compare → set HttpOnly cookie
4. Frontend: renders logged-in state OR redirects admin to `admin.html`

### Register
1. User submits name + email + password
2. `POST /api/auth/register` → hashes password, creates user (role=Customer), creates verification token
3. `debugLink` returned in API response (for dev/testing — shown in drawer)
4. User clicks link → `GET /api/auth/verify-email?token=...` activates account

### Forgot Password
1. `POST /api/auth/forgot-password` → generates 1-hour token
2. `debugLink` returned in response (dev mode)
3. Link opens `customer.html?reset=TOKEN`
4. `POST /api/auth/reset-password` → verifies token, updates hash

### Session Check
- Every page load calls `GET /api/auth/session` (reads HttpOnly cookie)
- Returns `{ loggedIn: true, user: { id, name, email, role } }` or `{ loggedIn: false }`

---

## 8. LocalStorage Keys (Frontend State)

| Key | Content |
|---|---|
| `toyorakids_cart` | Array of cart items |
| `toyorakids_wishlist` | Array of product IDs (local fallback) |
| `toyorakids_admin_products` | Admin-added products (offline fallback) |
| `toyorakids_visits` | Visit tracking array (max 1000 entries) |
| `toyorakids_about_data` | JSON object for About page content + images |
| `toyorakids_blog_posts` | Array of blog post objects |
| `sessionStorage.toyorakids_session_id` | Anonymous visitor session ID |

> **Note:** `toyorakids_user` (old mock user) and `toyorakids_admin_session` (old passcode flag) are **deprecated** — do NOT use.

---

## 9. Key Design Patterns

### Product Rendering
- `js/products.js` → `initialProducts[]` (static fallback)
- `initProducts()` in `app.js` → tries `GET /api/products`, merges with localStorage admin products
- Grid class: `product-grid` (5 cols on wide, 2 on mobile)

### WhatsApp Checkout
- `processWhatsAppCheckout()` in `app.js`
- Formats cart into a WhatsApp message and opens `wa.me/WHATSAPP_NUMBER`
- `WHATSAPP_NUMBER` constant at top of `app.js` (currently `03704842601`)

### Admin Dashboard Tabs
- 5 tabs: Products, About Page Editor, Blog Manager, Visitor History, Statistics
- Tab switching: `.admin-tab-btn[data-target]` → `.admin-tab-pane`
- Staff role: About/Blog/Visits/Stats tabs hidden via `applyRoleVisibility()` in `admin.html`

### Spotlight Effect
- Mouse-tracking CSS variable `--mouse-x` / `--mouse-y` on `.spotlight-card`
- Applied via `initSpotlight()` in `app.js`

---

## 10. Security Measures Implemented

- ✅ Passwords hashed with bcryptjs (10 salt rounds)
- ✅ JWT stored in HttpOnly Secure SameSite=Lax cookie (not localStorage)
- ✅ Rate limiting: 5 failed logins in 15 min → lockout
- ✅ RBAC: role checked in every protected API endpoint
- ✅ Input validation on all API endpoints
- ✅ Email verification before login allowed
- ✅ Time-limited tokens for email verify (24hr) and password reset (1hr)
- ✅ Audit logs for all admin actions (add/delete product, role change, login)
- ✅ Security headers: X-Frame-Options DENY, X-Content-Type-Options nosniff
- ✅ SQL injection prevented via Supabase parameterized queries
- ✅ Old `admin123` hardcoded passcode permanently removed

---

## 11. Where We Left Off / Next Steps

**Completed (July 2026):**
- Full production-grade auth system implemented
- All API endpoints created and secured
- `customer.html` dashboard created
- `admin.html` upgraded to JWT login
- `js/auth.js` fully rewritten (Login/Register/Forgot tabs)
- `js/app.js` old passcode removed
- `vercel.json` updated with all new routes

**Pending / Future Work:**
- Push to GitHub and redeploy on Vercel
- Test all auth flows on live URL
- Add real SMTP email sending (currently uses `debugLink` fallback)
- Consider Supabase Storage for image uploads instead of base64
- Add order status update feature for Admin
