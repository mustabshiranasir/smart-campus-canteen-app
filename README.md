# Smart Canteen App

A cross-platform mobile application that replaces cash-based, queue-prone canteen operations with a secure, cashless food pre-ordering experience. Students browse the menu, pay through an in-app digital wallet, and track their order in real time; administrators manage the menu, monitor live orders, and configure canteen settings from a dedicated console.

## Overview

Long counter queues, cash-handling friction, and a lack of real-time stock visibility are common pain points in busy canteens. This application solves them with a role-based mobile experience: students place and track orders without ever standing in a payment line, while administrators get a live operational view of orders, inventory, and revenue.

The system is built as a four-layer architecture — a React Native client, an Express.js REST API, a Firebase-backed identity layer, and a MongoDB Atlas persistence layer — connected through token-based authentication and a clean MVC backend structure.

## Features

**Student**
- Phone OTP–verified registration and secure login by email or roll/ID number
- Live menu browsing filtered by category, showing only in-stock items
- Cart management with real-time stock validation
- Cashless checkout through an in-app digital wallet
- Real-time order tracking through a defined lifecycle: pending → preparing → ready → completed
- Order cancellation with automatic wallet refund and stock restoration
- Wallet top-up and balance management
- In-app notifications for order placement and status changes
- Profile management, password changes, and app preferences (theme, notification settings)

**Administrator**
- Role-protected admin console, fully isolated from student access
- Full CRUD on menu items, including image upload
- Live order queue with status updates across the full order lifecycle
- Automatic refund and stock restoration on order cancellation
- Real-time notifications on every new order
- Account and settings management

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Mobile Frontend | React Native (Expo) | Cross-platform UI for Android and iOS |
| Navigation | Expo Router | File-based routing with isolated route groups per role |
| HTTP Client | Axios | API communication with interceptor-based token injection |
| Local Storage | Expo Secure Store | Encrypted on-device JWT storage |
| Backend Runtime | Node.js | Server-side JavaScript runtime |
| API Framework | Express.js | RESTful API, structured in MVC pattern |
| Database | MongoDB Atlas | Cloud-hosted NoSQL document store, with local fallback |
| ODM | Mongoose | Schema modeling and querying for MongoDB |
| Identity | Firebase Admin SDK | Server-side identity sync and phone verification |
| Session Auth | JSON Web Tokens | Stateless, 30-day API session tokens |
| Password Security | bcrypt | Salted password hashing |
| Request Validation | Zod | Schema-based validation of all request payloads |
| File Uploads | Multer | Image upload handling with type and size restrictions |

## Architecture

The system follows a four-layer design:

1. **Client Layer** — React Native screens grouped by access level (auth, student, admin), with a shared `AuthContext` and `ThemeContext` for global state.
2. **API Layer** — Express.js routes apply a middleware chain (JWT verification, role guard, request validation, file upload handling) before delegating to controllers.
3. **Identity Layer** — Firebase Admin SDK manages account creation and phone verification independently of business data.
4. **Persistence Layer** — MongoDB Atlas stores all business data, with a local MongoDB instance as an offline fallback.

A centralized error-handling middleware formats all API errors consistently, and all authenticated requests are authorized through a Bearer JWT validated on every protected route.

## Database Design

The data model favors a hybrid embedding-and-referencing strategy: order line items embed a price snapshot for historical accuracy while keeping references to the original user and food documents for query-time population.

| Collection | Purpose | Notable Indexing |
|---|---|---|
| `users` | Account records, role, wallet balance, verification status | Unique index on email; sparse unique index on roll/ID number |
| `foods` | Menu items — name, price, category, stock, availability, image | — |
| `orders` | Order line items, total, status, payment method | Recommended compound index on `{userId, createdAt}` |
| `carts` | One active cart per user, referencing menu items | Unique index on `userId` |
| `notifications` | Order-lifecycle and broadcast notifications | — |
| `otps` | Short-lived phone verification codes | TTL index — auto-expires after 5 minutes |
| `settings` | Per-user preferences (theme, notifications, address) | Unique index on `userId` |

## API Reference

All endpoints are prefixed with `/api`. Routes marked **Admin** require both a valid JWT and an admin role.

**Auth** (`/auth`)
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/send-otp` | — | Generate and dispatch a verification code |
| POST | `/register` | — | Register a student or admin account |
| POST | `/login` | — | Authenticate and receive a JWT |
| GET | `/me` | JWT | Retrieve the authenticated user's profile |
| POST | `/logout` | JWT | End the current session |

**Food** (`/food`)
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/` | JWT | List available food items |
| POST | `/` | Admin | Create a new food item |
| POST | `/upload` | Admin | Upload a food item image |
| PUT | `/:id` | Admin | Update a food item |
| DELETE | `/:id` | Admin | Delete a food item |

**Cart** (`/cart`)
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/` | JWT | Retrieve the current user's cart |
| POST | `/` | JWT | Add an item to the cart (stock-validated) |
| PUT | `/:id` | JWT | Update an item's quantity |
| DELETE | `/:id` | JWT | Remove an item from the cart |

**Orders** (`/orders`)
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/` | JWT | Place an order from the cart, paid via wallet |
| GET | `/` | JWT | Retrieve orders (own for students, all for admins) |
| PATCH | `/:id/status` | JWT | Update an order's lifecycle status |

**User** (`/user`)
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/settings` | JWT | Retrieve user preferences |
| PUT | `/settings` | JWT | Update user preferences |
| PUT | `/profile` | JWT | Update profile details |
| PUT | `/password` | JWT | Change account password |
| POST | `/wallet/topup` | JWT | Top up wallet balance |

**Notifications** (`/notifications`)
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/` | JWT | Retrieve notifications |
| DELETE | `/:id` | JWT | Delete a notification |

## Security

- Passwords hashed with bcrypt; plaintext credentials are never stored or transmitted.
- All protected routes require a valid Bearer JWT, scoped to a 30-day expiry.
- Every request body is validated against a Zod schema before reaching business logic.
- Role-based middleware blocks student access to admin routes, and cross-role login attempts are explicitly rejected.
- Verification codes are stored with a TTL index that auto-expires them after five minutes, preventing replay.
- Uploaded files are restricted by type (JPEG/PNG/WebP) and size (5 MB).
- All secrets (database URI, JWT secret, identity provider credentials) are kept in environment variables, excluded from version control.

## Project Structure

```
smart-canteen-app/
├── config/             # Database and identity provider configuration
├── controllers/        # Business logic per resource (auth, food, cart, order, user, wallet, notifications)
├── middleware/         # Auth guard, admin guard, error handler, upload handler
├── models/             # Mongoose schemas
├── routes/             # Express route definitions
├── validators/         # Zod request schemas
├── uploads/             # Stored food and profile images
├── mobile/
│   └── app/
│       ├── (auth)/      # Role selection, login, registration
│       ├── (student)/   # Menu, cart, orders, checkout, profile
│       ├── (admin)/     # Dashboard, menu management, orders, settings
│       ├── context/     # Auth and theme context providers
│       └── components/  # Shared UI components
├── server.js
├── .env
└── package.json
```

## Getting Started

**Backend**
```bash
cd backend
npm install
cp .env.example .env   # set MongoDB URI, JWT secret, Firebase credentials, admin secret code
npm run dev
```

**Mobile App**
```bash
cd mobile
npm install
npx expo start
```

Required environment variables include a MongoDB connection string, a JWT signing secret, Firebase Admin SDK credentials, and an admin registration secret code.

## Testing

The API has been manually validated against its full endpoint surface, covering both standard flows and edge cases: duplicate registration, expired or invalid verification codes, wrong-password and cross-role login attempts, out-of-stock and over-quantity cart additions, insufficient wallet balance at checkout, unauthenticated and non-admin access to protected routes, and order cancellation with refund and stock restoration. All cases pass as expected.

## Roadmap

- Integrate a production SMS gateway for verification codes
- Add push notifications for order status changes
- Integrate a live payment gateway for wallet top-ups
- Build an analytics dashboard for revenue and top-selling items
- Add full-text search and category filtering on the menu
- Support scheduled order pickup windows
- Add a post-order rating and review system
- Move order placement to a formal multi-document transaction for stronger atomicity guarantees

## Author

**Mustabshira Nasir**
