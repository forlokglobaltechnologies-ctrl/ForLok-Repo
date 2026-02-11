# 🚀 Quick Start Guide

## 1. Setup Environment

```bash
cd backend
cp env.example.txt .env
```

## 2. Fill Minimum Required Values in .env

**Required:**
- `MONGODB_URI` - Your MongoDB connection string
- `JWT_SECRET` - Generate with: `openssl rand -base64 32`
- `JWT_REFRESH_SECRET` - Generate with: `openssl rand -base64 32`

**Optional (can leave empty):**
- `CLOUDINARY_*` - Only if using file uploads
- `IDFY_API_KEY` - Leave empty for mock mode
- `RAZORPAY_*` - Only if using payments

## 3. Install Dependencies

```bash
npm install
```

## 4. Start Server

```bash
npm run dev
```

Server will start on: **http://localhost:3000**

## 5. Test Server

Open browser: http://localhost:3000/health

## 6. Connect Mobile App

Update `mobile-app/src/config/api.ts`:
- For emulator: `http://localhost:3000` ✅ (already set)
- For physical device: `http://YOUR_IP:3000` (find IP with `ipconfig`)

## ✅ Done!

Your backend is now running and ready to accept requests from the mobile app!
