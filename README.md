# ShopSmart (Demo Full-Stack)

ShopSmart is a full-stack AI-powered e-commerce platform featuring role-based dashboards (Owner, Seller, Analyst, Customer Care, Customer), AI recommendations, combo offers (Apriori), 3D virtual try-on, fake review detection, Razorpay payments, and real-time updates via Socket.io.

## Project Overview

- **Frontend**: Next.js 14 + Tailwind CSS + ShadCN UI (dark mode default + orange accent)
- **Backend**: Node.js + Express.js (JWT role authentication)
- **Database**: MongoDB + Mongoose
- **AI/ML**: Python FastAPI microservice (REST calls from backend/frontend)
- **3D/AR**: Three.js + TensorFlow.js + MediaPipe (virtual try-on)

## Quick Start (Run Services)

### 1. MongoDB (Atlas or Local)
- Atlas is configured via `MONGODB_URI`
- Local fallback uses `mongodb://localhost:27017/shopsmart`

To run local MongoDB:
```bash
docker compose up -d
```

### 2. Backend (Express)
```bash
cd server
npm install
npm run dev
```
Server runs on `PORT` (default `5000`).

### 3. ML Service (FastAPI)
```bash
cd ml-service
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
ML base URL is `ML_SERVICE_URL` (default `http://localhost:8000`).

### 4. Frontend (Next.js)
```bash
cd client
npm install
npm run dev
```

## Seed Demo Data

Seeds MongoDB with:
- 5 role users
- 50 products
- 200 transactions
- 20 reviews (mix genuine + fake)

```bash
npm run seed
```

To reset and re-seed:
```bash
npm run seed:reset
```

## Environment Variables

Environment variables are loaded from the root `.env` file.

- `MONGODB_URI`: MongoDB Atlas connection string
- `JWT_SECRET`: JWT signing secret
- `RAZORPAY_KEY_ID`: Razorpay Key ID
- `RAZORPAY_KEY_SECRET`: Razorpay Key Secret
- `CLAUDE_API_KEY`: Claude API key (for chatbot + outfit suggestions)
- `PORT`: Express server port (default `5000`)
- `ML_SERVICE_URL`: FastAPI base URL (default `http://localhost:8000`)
- `NODE_ENV`: `development` (enables mongoose debug mode)

## Role-wise Login Credentials (After Seeding)

After running `npm run seed`, use:

- Owner: `owner@shopsmart.com` / `password123`
- Seller: `seller@shopsmart.com` / `password123`
- Analyst: `analyst@shopsmart.com` / `password123`
- Customer Care: `care@shopsmart.com` / `password123`
- Customer: `user@shopsmart.com` / `password123`

