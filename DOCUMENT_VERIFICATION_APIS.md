# Document Verification APIs - Free Options for Development

## Free APIs for Aadhaar & Driving License Verification (Development/Testing)

### 1. **UIDAI Sample Clients (Official - FREE)**
- **Provider**: Unique Identification Authority of India (UIDAI)
- **URL**: https://uidai.gov.in/en/916-developer-section/data-and-downloads-section/11348-sample-clients.html
- **Features**:
  - Official government source
  - Sample clients and source code
  - Aadhaar e-KYC and authentication APIs
  - Test tools to reduce development time
  - **Completely FREE** for development
- **Best for**: Official testing and development

### 2. **IDfy APIs (Free Trial)**
- **Provider**: IDfy
- **Aadhaar Lite API**: https://www.idfy.com/aadhaar-lite-api/
- **Driving License API**: https://www.idfy.com/driving-license-verification-api/
- **Features**:
  - "Try now for free" option
  - Limited free trial for development
  - Non-intrusive verification
  - Good documentation
- **Best for**: Quick integration with free trial

### 3. **Perfios (Free Sandbox)**
- **Provider**: Perfios
- **URL**: https://perfios.ai/aadhaar-verification-api/
- **Features**:
  - Free sandbox environment
  - Test Aadhaar numbers provided
  - No initial costs for development
  - Good for testing
- **Best for**: Development and testing

### 4. **Eko India Financial Services**
- **Provider**: Eko
- **Aadhaar API**: https://eko.in/developers/eps/aadhaar-verification-api/
- **DL API**: https://eko.in/developers/eps/dl-verification-api
- **Features**:
  - 24x7 support
  - Testing environments upon request
  - Comprehensive documentation
- **Best for**: Production-ready solutions

### 5. **Meon APIs**
- **Provider**: Meon
- **DL Verification**: https://meon.co.in/dl-verification-api
- **Features**:
  - "Get API Access Now" option
  - May include free trial
- **Best for**: Driving License verification

---

## Important Notes:

### For Development/Testing:
- **UIDAI Sample Clients** is the best FREE option (official government source)
- Most commercial APIs offer **free trials** or **sandbox environments**
- Free trials usually have:
  - Limited number of requests
  - Test data only
  - No production access

### For Production:
- Most APIs require **paid subscriptions**
- Pricing typically based on:
  - Number of verifications per month
  - API calls per request
  - Response time requirements

### Compliance & Privacy:
- Ensure compliance with UIDAI guidelines
- Follow data protection regulations
- Store documents securely
- Never expose API keys in client code

---

## Recommended Approach for Development:

1. **Start with UIDAI Sample Clients** (Free, Official)
2. **Use IDfy or Perfios** for additional testing (Free trials)
3. **Switch to paid API** when moving to production

---

## Integration Example Structure:

```typescript
// services/verificationService.ts
export const verifyAadhaar = async (aadharNumber: string, otp: string) => {
  // Use UIDAI sample client or API provider
  // In development: Use test credentials
  // In production: Use actual API keys from backend
};

export const verifyDrivingLicense = async (dlNumber: string, dob: string) => {
  // Use API provider
  // In development: Use sandbox/test mode
  // In production: Use actual API keys from backend
};
```
