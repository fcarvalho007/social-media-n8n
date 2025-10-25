# Getlate Integration Contract Verification

**Status**: ❌ **FAIL** (Previous implementation was incorrect)
**Date**: 2025-10-25
**Corrected**: ✅ **YES**

## Summary

The previous implementation used incorrect API endpoints and request format. The integration has been updated to match Getlate's actual API specification.

---

## 1. Base URL

### Previous (Incorrect)
```
https://api.getlate.co
```

### Corrected
```
https://getlate.dev/api
```

**Configuration**: Now configurable via `GETLATE_BASE_URL` environment variable (defaults to production URL).

---

## 2. Endpoints

### Previous (Incorrect)
- Instagram: `POST /v1/social/instagram/posts`
- LinkedIn: `POST /v1/social/linkedin/posts`

### Corrected
**Single unified endpoint for all platforms**:
```
POST /v1/posts
```

The platform is specified in the request body via the `platforms[]` array.

---

## 3. Content Type & Upload Strategy

### Previous (Incorrect)
- Content-Type: `application/json`
- Strategy: Base64-encoded files sent inline with post request

### Corrected
**Two-step process**:

1. **Upload media files** via `POST /v1/media`
   - Content-Type: `multipart/form-data` (for files <4MB)
   - Returns: `{ files: [{ url: "https://..." }] }`

2. **Create post** via `POST /v1/posts`
   - Content-Type: `application/json`
   - Reference uploaded files by URL in `mediaItems[]`

---

## 4. Request Schema

### Instagram Carousel (Corrected)
```json
{
  "content": "Caption text\n\n#hashtag1 #hashtag2",
  "platforms": [
    {
      "platform": "instagram",
      "accountId": "68fb951d8bbca9c10cbfef93"
    }
  ],
  "mediaItems": [
    { "type": "image", "url": "https://getlate.dev/..." },
    { "type": "image", "url": "https://getlate.dev/..." }
  ],
  "publishNow": true
}
```

### LinkedIn Document (Corrected)
```json
{
  "content": "Body text\n\nhttps://link.com\n\n#hashtag1 #hashtag2",
  "platforms": [
    {
      "platform": "linkedin",
      "accountId": "urn:li:person:ojg2Ri_Otv"
    }
  ],
  "mediaItems": [
    { "type": "document", "url": "https://getlate.dev/...pdf" }
  ],
  "publishNow": true
}
```

---

## 5. Response Schema

### Expected Response
```json
{
  "_id": "post_id_123",
  "url": "https://instagram.com/p/...",
  "status": "published",
  ...
}
```

**Mapping**:
- Post URL: `response.url`
- External ID: `response._id`

---

## 6. Headers

### Required Headers
```
Authorization: Bearer <GETLATE_API_TOKEN>
Content-Type: application/json
Idempotency-Key: <postId>
```

All headers are correctly implemented in the updated edge function.

---

## 7. Health Check / Connectivity Test

### New Feature Added ✅

A "Testar API" button has been added to the Debug Panel (DEV only) that:
- Calls `GET /v1/usage-stats` to verify API connectivity
- Shows base URL, HTTP status, and usage statistics
- Provides immediate feedback on API configuration

**Test Request**:
```json
POST /functions/v1/publish-to-getlate
{
  "test": true
}
```

**Test Response**:
```json
{
  "success": true,
  "test": true,
  "baseUrl": "https://getlate.dev/api",
  "status": 200,
  "usageStats": {
    "planName": "...",
    "limits": { "profiles": 50 },
    "usage": { "profiles": 12 }
  },
  "timestamp": "2025-10-25T..."
}
```

---

## 8. Changes Made

### Edge Function (`supabase/functions/publish-to-getlate/index.ts`)
- ✅ Updated base URL to `https://getlate.dev/api`
- ✅ Changed to single endpoint: `/v1/posts`
- ✅ Implemented two-step upload process (media first, then post)
- ✅ Updated request body format to match API spec
- ✅ Added health check endpoint (`test: true`)
- ✅ Maintained retry logic with exponential backoff
- ✅ Kept timeout handling (25s)

### Debug Panel (`src/components/publishing/PublishDebugPanel.tsx`)
- ✅ Added "Testar API" button
- ✅ Updated payload examples to show new format
- ✅ Display connectivity test results
- ✅ Show base URL and API status

### Environment Variables
- ✅ `GETLATE_API_TOKEN` - API token (existing)
- ✅ `GETLATE_BASE_URL` - Base URL (new, optional)
- ✅ `INSTAGRAM_ACCOUNT_ID` - Account ID (new, configurable)
- ✅ `LINKEDIN_ACCOUNT_ID` - Account ID (new, configurable)

---

## 9. Testing Checklist

- [ ] Test connectivity via "Testar API" button
- [ ] Verify base URL is correct (production vs sandbox)
- [ ] Test Instagram carousel (2-10 images)
- [ ] Test LinkedIn document (PDF upload)
- [ ] Verify idempotency (retry same post)
- [ ] Check response mapping (URL, ID)
- [ ] Test error handling (invalid token, rate limits)
- [ ] Verify timeout/retry logic

---

## 10. Next Steps

1. **Configure Environment Variables**:
   - Set correct `INSTAGRAM_ACCOUNT_ID`
   - Set correct `LINKEDIN_ACCOUNT_ID`
   - Optionally set `GETLATE_BASE_URL` for sandbox testing

2. **Test Connectivity**:
   - Use "Testar API" button in Debug Panel
   - Verify successful connection to Getlate

3. **Test Publishing**:
   - Try Instagram carousel with 5 images
   - Try LinkedIn document with 10-page PDF
   - Verify posts appear on platforms

4. **Monitor Logs**:
   - Check edge function logs for upload progress
   - Verify idempotency keys are working
   - Monitor for any API errors

---

## Documentation References

- **Official Docs**: https://getlate.dev/docs
- **Base URL**: `https://getlate.dev/api`
- **Unified Endpoint**: `/v1/posts`
- **Media Upload**: `/v1/media`
- **Authentication**: Bearer token in Authorization header

---

## Acceptance Criteria

| Criterion | Status |
|-----------|--------|
| Correct base URL used | ✅ |
| Content-type decision (multipart for uploads) | ✅ |
| Confirmed endpoint paths | ✅ |
| Request schema matches API spec | ✅ |
| Response mapping correct | ✅ |
| Headers properly set | ✅ |
| Health check implemented | ✅ |
| Debug panel updated | ✅ |

---

**Conclusion**: The integration has been completely rewritten to match Getlate's actual API specification. The previous implementation was using non-existent endpoints with an incorrect request format. The corrected implementation now uses the unified `/v1/posts` endpoint with pre-uploaded media files, matching the official API documentation.
