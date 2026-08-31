# CampusLoop 🎓📦
> **Peer-to-Peer Campus Rental Marketplace for NIT Durgapur Students**

CampusLoop is a peer-to-peer campus marketplace designed specifically for college students to rent, borrow, and share everyday academic and living essentials — from scientific calculators and engineering textbooks to lab coats, drafters, monitors, gaming accessories, and tech gear.

Built with real-time Socket.io communication, atomic date-range booking conflict protection, Stripe Checkout with cryptographic HMAC-SHA256 webhook confirmation, and student-only JWT authentication.

---

## 🌟 Key Features

- **🛍️ Campus Marketplace with Real-time Filtering:**
  - Fast search, category filtering (Electronics, Books, Lab Equipment, Sports, Accessories, Hostels), and instant multi-criteria sorting.
  - Device photo uploading, sample presets, and external image support.
- **📅 Atomic Date-Range Booking Conflict Engine:**
  - Pure atomic MongoDB reservations (`$elemMatch` / `$not` conditional locks) preventing race conditions and double bookings under concurrent multi-user load.
  - Reserved date slot calendars shown on item pages.
- **💳 Stripe Test-Mode Checkout & Webhooks:**
  - Hosted Stripe Checkout session integration with line items for rental fees + refundable escrow security deposits.
  - Cryptographically verified HMAC-SHA256 webhooks (`checkout.session.completed`) with raw buffer body parsing to lock and confirm bookings.
- **⚡ Dual-View Bookings Dashboard (`/bookings`):**
  - Instant toggle between *"My Bookings (as Renter)"* and *"Bookings on My Items (as Host)"*.
  - Real-time Socket.io status synchronization across connected browser tabs without page refreshes.
- **💬 Real-Time Campus Chat:**
  - One-on-one direct messaging with Socket.io rooms, typing indicators, quick questions, and unread counts.
- **🛡️ Student Security & Verification:**
  - Campus email verification (`@nitdgp.ac.in`), bcrypt password hashing, and role-based permissions.

---

## ⚡ Guest / Demo Mode (For Reviewers & Interviewers)

CampusLoop includes an instant **Guest / Demo Mode** allowing reviewers to explore all student rental and booking features without needing an official NIT Durgapur institute email:

- **1-Click Access:** On the [Login Page](https://campus-loop-ten.vercel.app/login), click **`⚡ Continue as Guest (Demo Mode)`**.
- **Demo Credentials:**
  - **Email:** `guest@nitdgp.ac.in`
  - **Password:** `DemoGuest123!`
- **What's Pre-Seeded:**
  - 3 items owned by Guest Reviewer (*TI-84 Plus Graphing Calculator*, *CLRS Algorithms Book*, *Sony XM4 Headphones*).
  - 4 items owned by peer students (*Casio FX-991CW*, *Higher Engg Math*, *Mini Drafter*, *Raspberry Pi 4*).
  - Pre-populated rental bookings across pending, confirmed, and active states for both Renter and Host perspectives.
- **On-Demand Reseeding (Before an Interview):**
  - **Via CLI:** `npm run seed:demo`
  - **Via HTTP API:** `POST https://campus-loop-jxca.onrender.com/api/auth/reseed-demo`

---

## 🛠️ Tech Stack

### Frontend
- **Framework:** React 18 (Vite SPA)
- **Styling:** Tailwind CSS + Lucide React Icons
- **Routing:** React Router DOM v6
- **Real-Time Client:** Socket.io-client
- **HTTP Client:** Axios with JWT request & response interceptors

### Backend
- **Runtime:** Node.js + Express.js
- **Database:** MongoDB Atlas + Mongoose ODM
- **Real-Time Server:** Socket.io with room multiplexing
- **Payments:** Stripe SDK (`stripe.checkout.sessions` & `stripe.webhooks`)
- **Authentication:** JSON Web Tokens (JWT) & bcryptjs

---

## 🚀 Quickstart: Local Setup

### 1. Prerequisites
- **Node.js:** `v18+` or `v20+`
- **npm:** `v9+`
- **MongoDB:** MongoDB Atlas cluster URI or local MongoDB daemon
- **Stripe Account:** (Free test mode sandbox)

### 2. Clone and Install Dependencies
```bash
# Clone the repository
git clone https://github.com/<your-username>/CampusLoop.git
cd CampusLoop

# Install backend dependencies
npm install

# Install frontend dependencies
cd client
npm install
cd ..
```

---

## ⚙️ Environment Variables

### Backend Configuration (`.env` in project root)
Create a `.env` file in the root directory:

```env
PORT=5000
NODE_ENV=development

# MongoDB Atlas Connection URI
MONGO_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/campusloop?retryWrites=true&w=majority

# JWT Authentication
JWT_SECRET=campusloop_super_secret_jwt_key_2026_dev
JWT_EXPIRES_IN=7d

# Frontend URL (for CORS and Stripe Redirects)
CLIENT_URL=http://localhost:5173

# Stripe API Keys (Get from https://dashboard.stripe.com/test/apikeys)
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

### Frontend Configuration (`client/.env` - Optional in local dev, required in production)
```env
VITE_API_BASE_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

---

## 🏃 Running the Application

### Option A: Run Both Frontend & Backend Concurrently
```bash
npm run dev
```

### Option B: Run Individually
- **Backend Server (Port 5000):**
  ```bash
  node server.js
  # Or with auto-reload:
  npm run server
  ```
- **Frontend Client (Port 5173):**
  ```bash
  npm run client
  ```

Visit **`http://localhost:5173`** in your browser!

---

## 🧪 Testing & Verification Scripts

CampusLoop includes automated verification scripts in `scripts/`:

```bash
# 1. Test Atomic Booking-Conflict Protection (Simultaneous Race Condition)
node scripts/test-booking-race-condition.js

# 2. Test Complete End-to-End Booking Lifecycle (Create -> Conflict -> Confirm -> Cancel)
node scripts/test-bookings-workflow.js

# 3. Test Stripe Test-Mode Checkout & Pending Status Storage
node scripts/test-stripe-checkout.js

# 4. Test Stripe Webhook Signature Verification & Forged Attack Defense
node scripts/test-webhook-workflow.js
```

---

## ☁️ Deployment Guide

### 1. Backend Deployment (Render)
1. Push your repository to GitHub.
2. In **Render Dashboard** $\rightarrow$ Click **New +** $\rightarrow$ **Web Service**.
3. Connect your repository.
4. Settings:
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
5. **Environment Variables on Render:**
   | Variable | Value |
   | :--- | :--- |
   | `NODE_ENV` | `production` |
   | `MONGO_URI` | `mongodb+srv://...` |
   | `JWT_SECRET` | Strong random secret string |
   | `CLIENT_URL` | `https://<your-app>.vercel.app` |
   | `STRIPE_SECRET_KEY` | `sk_test_...` (or `sk_live_...`) |
   | `STRIPE_WEBHOOK_SECRET` | `whsec_...` from Stripe Dashboard Webhook |

### 2. Frontend Deployment (Vercel)
1. In **Vercel Dashboard** $\rightarrow$ Click **Add New Project** $\rightarrow$ Import repository.
2. Set **Root Directory:** `client`
3. Framework Preset: **`Vite`**
4. **Environment Variables on Vercel:**
   | Variable | Value |
   | :--- | :--- |
   | `VITE_API_BASE_URL` | `https://<your-render-backend>.onrender.com/api` |
   | `VITE_SOCKET_URL` | `https://<your-render-backend>.onrender.com` |
5. Deploy! (Client-side routing is handled automatically by [`client/vercel.json`](file:///c:/Users/sanja/OneDrive/Desktop/CampusLoop/client/vercel.json)).

### 3. Stripe Production Webhook Setup
1. In [Stripe Dashboard](https://dashboard.stripe.com/webhooks) $\rightarrow$ **Add Endpoint**.
2. **Endpoint URL:** `https://<your-render-backend>.onrender.com/api/webhooks/stripe`
3. **Events:** `checkout.session.completed`
4. Copy the Signing Secret (`whsec_...`) into Render's `STRIPE_WEBHOOK_SECRET`.

---

## 📋 Full End-to-End Live Deployment Checklist

Run through this test sequence once deployed to confirm everything works in production:

1. **Authentication:** Register two student accounts on `@nitdgp.ac.in` (User A - Host, User B - Renter).
2. **Create Listing:** As User A, list an item (e.g. *Casio FX-991EX Calculator* for ₹20/day).
3. **Marketplace & Filters:** As User B, search "Casio", filter by Electronics, sort by price.
4. **Reserve Item:** As User B, request booking for 3 days $\rightarrow$ Confirm booking starts in `pending` status.
5. **Race Condition Check:** In an incognito tab as User C, attempt to rent the same 3 days $\rightarrow$ Verify instant `409 Conflict` blocking.
6. **Stripe Payment:** As User B, click **"Pay with Stripe"** $\rightarrow$ Enter test card `4242 4242 4242 4242` $\rightarrow$ Complete payment.
7. **Webhook Confirmation:** Verify Stripe delivers webhook (`200 OK`) and booking flips to `Confirmed & Paid` with the dates locked in escrow.
8. **Real-time Chat:** Open User A and User B in side-by-side browser tabs $\rightarrow$ Send a message and watch typing indicators and instant delivery without refreshing!

---

## 📜 License
MIT License. Created with ❤️ for NIT Durgapur campus community.
