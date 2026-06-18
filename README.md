# Smart Canteen App

A production-ready, mobile-first full-stack application for university and college canteens.

## 🚀 Quick Startup Commands

To start the entire project, run the following commands:

### 1. Backend Server (Root Directory)
Open a terminal in the root directory:
```bash
# Install backend dependencies
npm install

# Seed the database (creates items with nutritional info and dietary tags)
node seeder.js

# Start backend server (runs on port 5000)
npm run dev
```

### 2. Mobile & Web Frontend (Mobile Directory)
Open a new terminal and navigate to the `mobile` directory:
```bash
# Go to mobile directory
cd mobile

# Install dependencies
npm install

# Start the Expo Dev Server (Press 'w' to launch in browser)
npm start
```

---

## 🚀 Features
- **Mobile-First Design**: Beautiful, responsive UI built with React Native/Expo.
- **Robust Backend**: Node.js + Express with MongoDB and Mongoose.
- **Secure Authentication**: JWT-based authentication with bcrypt password hashing.
- **Real-time Order Management**: Add to cart, checkout, and track order status.
- **Profile Management**: Update user details and secure password management.
- **Input Validation**: End-to-end validation using Zod.

## 🛠️ Tech Stack
- **Frontend**: React Native, Expo, React Navigation, Axios
- **Backend**: Node.js, Express, MongoDB (Mongoose), JWT, Zod
- **Styling**: Native StyleSheet (Orange theme #FF7A00)

---

## 🏃‍♂️ Step-by-Step Setup Guide

### 1. MongoDB Setup
You need a MongoDB database to store users, products, and orders.
1. Create a free cluster on [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Create a database user and whitelist your IP address (`0.0.0.0/0` for all IPs).
3. Copy the Connection String URI.

### 2. Backend Setup
1. Open a terminal in the root directory (`smart-canteen-app`).
2. Install dependencies:
   ```bash
   npm install
   ```
3. Update the `.env` file in the root directory:
   ```env
   PORT=5000
   MONGO_URI=your_mongodb_connection_string_here
   JWT_SECRET=your_super_secret_jwt_key
   ```
4. **Seed the Database** (Adds 15 test products):
   ```bash
   node seeder.js
   ```
5. Start the backend server:
   ```bash
   npm run dev
   ```

### 3. Frontend Setup
1. Open a **new** terminal in the `mobile` directory:
   ```bash
   cd mobile
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Update the API URL in `mobile/services/api.js`:
   - If running on Web/iOS Simulator: `http://localhost:5000/api`
   - If running on an Android Emulator: `http://10.0.2.2:5000/api`
   - If testing on a physical device: `http://<YOUR_COMPUTER_IP_ADDRESS>:5000/api`
4. Start the Expo development server:
   ```bash
   npx expo start
   ```

---

## 🧪 Testing Features
- **Register / Login**: Launch the app, click Student, and Register a new account. Use those credentials to log in.
- **Browse Menu**: Once logged in, the Home tab displays the 15 seeded products. Use the category filters to sort them.
- **Checkout Flow**: Add products to your cart. Go to the Cart tab, proceed to Checkout, select Pickup Time and Payment Method, and click Place Order.
- **Order History**: Navigate to the Orders tab to view your past and active orders.
- **Settings**: Go to the Profile tab -> Settings. Try updating your name, email, or password.

---

## ⚠️ Common Errors & Fixes

1. **Error: `querySrv ECONNREFUSED` or MongoDB Connection Failed**
   - **Fix**: Check your `MONGO_URI` in `.env`. Ensure your current IP is whitelisted in MongoDB Atlas Network Access settings.

2. **Error: `Network Error` on Frontend Login/Register**
   - **Fix**: The frontend cannot reach the backend. If using an Android Emulator, change `baseURL` in `api.js` to `http://10.0.2.2:5000/api`. If using a physical phone, ensure your phone and computer are on the exact same Wi-Fi network and use your computer's local IP address (e.g., `http://192.168.1.5:5000/api`).

3. **Error: Token expired or invalid**
   - **Fix**: The frontend handles this automatically by logging you out. Simply log in again. Ensure `JWT_SECRET` is exactly the same every time you start the backend server.

4. **Error: Cart is not updating**
   - **Fix**: Ensure your backend server is running and the database is connected. Check the Node.js console for any backend crash logs.
