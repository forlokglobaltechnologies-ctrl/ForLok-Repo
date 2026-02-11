# 🚀 Starting the Backend Server

## Quick Start

1. **Navigate to backend folder:**
   ```bash
   cd backend
   ```

2. **Install dependencies (if not done):**
   ```bash
   npm install
   ```

3. **Setup .env file:**
   - Copy `env.example.txt` to `.env`
   - Fill in minimum required values (see below)

4. **Start server:**
   ```bash
   npm run dev
   ```

## Minimum Required .env Values

For the server to start, you need at minimum:

```env
# Server
PORT=3000
NODE_ENV=development
API_BASE_URL=http://localhost:3000
FRONTEND_URL=http://localhost:19006

# Database (REQUIRED)
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/yaaryatra
MONGODB_DB_NAME=yaaryatra

# JWT (REQUIRED - generate with: openssl rand -base64 32)
JWT_SECRET=<32-character-secret>
JWT_REFRESH_SECRET=<32-character-secret>

# Firebase (Already configured via JSON file)
FIREBASE_PROJECT_ID=yaaryathra

# Cloudinary (Optional - only if using file uploads)
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# IDfy (Optional - leave empty for mock mode)
IDFY_API_KEY=

# Admin (Change password!)
ADMIN_PASSWORD=change-this-password
ADMIN_EMAIL=admin@yaaryatra.com
```

## Server Status

Once started, the server will:
- ✅ Connect to MongoDB
- ✅ Initialize Firebase (from JSON file)
- ✅ Initialize Cloudinary (if configured)
- ✅ Initialize Razorpay (if configured)
- ✅ Load sample food data (development mode)
- ✅ Start on http://localhost:3000

## Test the Server

1. **Health Check:**
   ```
   GET http://localhost:3000/health
   ```

2. **API Info:**
   ```
   GET http://localhost:3000/
   ```

## Connect Mobile App

### For Emulator/Simulator:
- Use: `http://localhost:3000`
- Already configured in `mobile-app/src/config/api.ts`

### For Physical Device:
1. Find your computer's IP address:
   ```bash
   # Windows
   ipconfig
   # Look for IPv4 Address (e.g., 192.168.1.100)
   
   # Mac/Linux
   ifconfig
   # Look for inet address
   ```

2. Update `mobile-app/src/config/api.ts`:
   ```typescript
   const API_BASE_URL = __DEV__
     ? 'http://192.168.1.100:3000' // Your IP address
     : 'https://api.yaaryatra.com';
   ```

3. Make sure your phone and computer are on the same WiFi network

4. Make sure Windows Firewall allows port 3000

## Troubleshooting

### Server won't start:
- Check if MongoDB URI is correct
- Check if JWT secrets are set (min 32 characters)
- Check if port 3000 is available

### Mobile app can't connect:
- Check if server is running
- Check if using correct IP address (for physical device)
- Check if firewall is blocking port 3000
- Check if phone and computer are on same network

### MongoDB connection failed:
- Check connection string format
- Check if IP is whitelisted in MongoDB Atlas
- Check username/password

## Next Steps

1. ✅ Server running on http://localhost:3000
2. ✅ Mobile app configured to connect
3. ✅ Test API endpoints from mobile app
4. ✅ Start developing features!
