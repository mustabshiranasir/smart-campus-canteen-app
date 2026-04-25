# Smart Campus Canteen App

A full-stack mobile application that digitizes the university food ordering experience. Students can browse the menu, place orders, and pay using a digital wallet — while canteen admins manage inventory and track orders in real time.

> **Status: In Progress** — Currently in active development as a semester project.

## Problem Statement

Students waste time queuing at the canteen without knowing what food is available or how long the wait will be. This app solves both problems with a digital ordering and queue management system.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Expo + React Native (cross-platform iOS & Android) |
| Navigation | Expo Router (file-based routing) |
| HTTP Client | Axios |
| State Management | React Context API |
| Backend | Node.js + Express (REST API) |
| Database | MongoDB Atlas (cloud NoSQL) |
| ODM | Mongoose |
| Authentication | JWT + bcryptjs |
| Hosting | Render / Railway (free tier) |

## Features

**Student Side**
- Register and login with JWT authentication
- Browse menu by category (Fast Food, Healthy, Drinks, Snacks)
- Add items to cart and update quantities
- Checkout with wallet or cash payment
- Real-time order status tracking (Pending → Preparing → Ready)
- Digital wallet with top-up and transaction history
- View order history

**Admin Side**
- Secure admin login
- Dashboard with today's orders, revenue, active users, and low stock alerts
- Add, edit, and delete menu items
- Toggle item availability on/off
- Manage and update order statuses in real time

## App Screens (14 Total)

**Student (9 screens):** Splash, Login, Register, Home/Menu, Food Detail, Cart, Checkout, My Orders, Profile/Wallet

**Admin (5 screens):** Login, Dashboard, Manage Menu, Add/Edit Food, Manage Orders

## API Endpoints (18 Total)

| Method | Endpoint | Description |
|---|---|---|
| POST | /api/auth/register | Register new student |
| POST | /api/auth/login | Login and get JWT token |
| GET | /api/menu | Get all menu items |
| POST | /api/menu | Add menu item (admin) |
| PUT | /api/menu/:id | Update menu item (admin) |
| DELETE | /api/menu/:id | Delete menu item (admin) |
| GET | /api/cart | Get user cart |
| POST | /api/cart/add | Add item to cart |
| PUT | /api/cart/update | Update cart quantity |
| DELETE | /api/cart/clear | Clear cart |
| POST | /api/orders/checkout | Place order (MongoDB transaction) |
| GET | /api/orders/my | Get user order history |
| GET | /api/orders | Get all orders (admin) |
| PATCH | /api/orders/:id/status | Update order status (admin) |
| GET | /api/wallet | Get wallet balance |
| POST | /api/wallet/topup | Add funds to wallet |

## Database — MongoDB Collections (6)

`users` · `menuItems` · `carts` · `orders` · `payments` · `walletTransactions`

## Key Technical Feature — MongoDB ACID Transaction

The checkout flow uses a MongoDB multi-document transaction with session. All of the following steps either succeed together or roll back completely — no partial data:

1. Read cart
2. Verify stock availability
3. Create order document
4. Decrement stock for each item
5. Create payment record
6. Deduct wallet balance
7. Clear cart

## Project Structure

```
smart-canteen-app/
├── backend/
│   ├── src/
│   │   ├── config/db.js
│   │   ├── controllers/
│   │   ├── middleware/auth.js
│   │   ├── models/
│   │   └── routes/
│   ├── server.js
│   ├── .env.example
│   └── package.json
└── mobile/
    ├── app/
    │   ├── (auth)/
    │   ├── (student)/
    │   └── (admin)/
    ├── context/AuthContext.js
    └── services/api.js
```

## How to Run Locally

**Backend:**
```bash
cd backend
npm install
cp .env.example .env   # fill in your MongoDB URI and JWT secret
npm run dev
```

**Mobile:**
```bash
cd mobile
npm install
npx expo start
```

## Development Roadmap

- [x] Week 1 — Backend setup, MongoDB connection, test route
- [x] Week 2 — User model, register/login, JWT auth
- [ ] Week 3 — Menu APIs + Expo app with login screen
- [ ] Week 4 — Cart & order APIs with MongoDB transaction
- [ ] Week 5 — Admin panel + connect all Expo screens to API
- [ ] Week 6 — Polish, testing, README screenshots, demo video

## Course Details

- Course: Mobile Application Development / Advanced Database Systems
- Institution: COMSATS University Islamabad, Attock Campus
- Program: BS Computer Science (2023–2027)

## Author

**Mustabshira Nasir** — FA23-BCS-063
