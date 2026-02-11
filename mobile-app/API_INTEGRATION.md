# 📱 Mobile App - Backend Integration

## API Configuration

The mobile app is configured to connect to the backend via:

**File:** `mobile-app/src/config/api.ts`

**Default URL:** `http://localhost:3000`

## Usage in Mobile App

### 1. Import API Service

```typescript
import { apiCall, authApi, documentApi } from '@utils/apiClient';
import apiService from '@services/api.service';
```

### 2. Make API Calls

**Example: Send OTP**
```typescript
const response = await authApi.sendOTP('+919876543210', 'signup');
if (response.success) {
  console.log('OTP sent!');
} else {
  console.error('Error:', response.error);
}
```

**Example: Verify Firebase Token**
```typescript
const response = await authApi.verifyFirebase(phone, idToken);
if (response.success) {
  // User verified, proceed with registration
}
```

**Example: Get User Profile**
```typescript
const response = await apiCall('/api/users/profile');
if (response.success) {
  const userProfile = response.data;
}
```

**Example: Upload File**
```typescript
const response = await uploadFile(
  '/api/documents/upload?type=user_photo',
  {
    uri: imageUri,
    type: 'image/jpeg',
    name: 'photo.jpg',
  }
);
```

## For Physical Device Testing

1. **Find your computer's IP:**
   ```bash
   # Windows
   ipconfig
   # Look for IPv4 Address (e.g., 192.168.1.100)
   ```

2. **Update API config:**
   ```typescript
   // mobile-app/src/config/api.ts
   const API_BASE_URL = __DEV__
     ? 'http://192.168.1.100:3000' // Your IP
     : 'https://api.yaaryatra.com';
   ```

3. **Ensure same WiFi network:**
   - Phone and computer must be on same network

4. **Check firewall:**
   - Allow port 3000 in Windows Firewall

## Authentication

The API service automatically:
- ✅ Adds JWT token to requests
- ✅ Refreshes token when expired
- ✅ Clears tokens on auth failure
- ✅ Handles token storage in AsyncStorage

## Available API Endpoints

All endpoints are defined in `mobile-app/src/config/api.ts`:

- **Auth:** `authApi.sendOTP()`, `authApi.verifyFirebase()`, etc.
- **Documents:** `documentApi.verifyByNumber()`, `documentApi.checkEligibility()`
- **Custom:** Use `apiCall(endpoint, options)` for any endpoint

## Error Handling

All API calls return:
```typescript
{
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
```

Always check `response.success` before using `response.data`.
