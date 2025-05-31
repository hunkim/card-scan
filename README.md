# Business Card Scanner with Upstage AI

A modern business card scanner that uses Upstage's Information Extraction AI to extract contact information from business card images.

## Features

- 📸 Upload business card images (JPG, PNG, GIF, WebP, PDF)
- 📋 **Clipboard paste support** - Press Ctrl+V to paste images
- 🤖 AI-powered information extraction using Upstage
- 📊 Structured data extraction with comprehensive schema
- 💾 Save and manage scanned cards
- 📱 Responsive design with modern UI
- 🔐 User authentication and personal card library
- 📤 Export cards to CSV format

## Upstage Integration

This application uses Upstage's Information Extraction API to extract business card data. The integration includes:

### JSON Schema for Business Cards

The application uses a comprehensive JSON schema designed specifically for business cards:

```json
{
  "type": "object",
  "properties": {
    "name": { "type": "string", "description": "Full name of the person" },
    "first_name": { "type": "string", "description": "First name" },
    "last_name": { "type": "string", "description": "Last name" },
    "company": { "type": "string", "description": "Company name" },
    "job_title": { "type": "string", "description": "Job title or position" },
    "department": { "type": "string", "description": "Department or division" },
    "phone": { "type": "string", "description": "Primary phone number" },
    "mobile": { "type": "string", "description": "Mobile phone number" },
    "fax": { "type": "string", "description": "Fax number" },
    "email": { "type": "string", "description": "Email address" },
    "website": { "type": "string", "description": "Website URL" },
    "address": { "type": "string", "description": "Complete address" },
    "street_address": { "type": "string", "description": "Street address" },
    "city": { "type": "string", "description": "City" },
    "state": { "type": "string", "description": "State or province" },
    "zip_code": { "type": "string", "description": "ZIP or postal code" },
    "country": { "type": "string", "description": "Country" },
    "linkedin": { "type": "string", "description": "LinkedIn profile" },
    "twitter": { "type": "string", "description": "Twitter handle" },
    "facebook": { "type": "string", "description": "Facebook profile" },
    "instagram": { "type": "string", "description": "Instagram handle" },
    "skype": { "type": "string", "description": "Skype username" },
    "whatsapp": { "type": "string", "description": "WhatsApp number" },
    "additional_info": { "type": "string", "description": "Additional information" }
  }
}
```

### API Integration

The integration sends images to Upstage's API endpoint:

```bash
curl -k -X "POST" "https://api.upstage.ai/v1/information-extraction" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json; charset=utf-8" \
  -d '{
    "model": "information-extract",
    "messages": [
      {
        "role": "user",
        "content": [
          {
            "type": "image_url",
            "image_url": {
              "url": "data:image/jpeg;base64,..."
            }
          }
        ]
      }
    ],
    "response_format": { ... },
    "chunking": {
      "pages_per_chunk": 1
    }
  }'
```

## Setup

### 1. Get Upstage API Key

1. Sign up at [Upstage Console](https://console.upstage.ai/)
2. Create an API key for Information Extraction
3. Copy your API key (starts with `up_`)

### 2. Configure API Key

Edit `lib/config.ts` and replace the placeholder with your actual API key:

```typescript
const UPSTAGE_API_KEY = "your_actual_api_key_here"
```

**Security Note**: In production, use environment variables and server-side API routes to protect your API key.

### 3. Install Dependencies

```bash
npm install
# or
pnpm install
```

### 4. Run Development Server

```bash
npm run dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## How It Works

1. **Upload**: User uploads a business card image
2. **Processing**: Image is converted to base64 and sent to Upstage API
3. **Extraction**: Upstage AI extracts structured data using the defined schema
4. **Display**: Extracted data is displayed in an editable form
5. **Save**: Users can save cards to their personal library
6. **Export**: Cards can be exported to CSV format

## Data Flow

```
Image Upload → Base64 Conversion → Upstage API → JSON Response → Data Mapping → UI Display
```

## File Structure

- `services/ocr-service.ts` - Upstage API integration
- `lib/config.ts` - API key configuration
- `types/index.ts` - TypeScript interfaces
- `components/` - React UI components
- `app.tsx` - Main application logic

## Production Deployment

For production deployment:

1. Set up environment variables for API keys
2. Implement server-side API routes for secure API calls
3. Add proper error handling and logging
4. Configure image storage (e.g., AWS S3, Vercel Blob)
5. Add rate limiting and usage monitoring

## Troubleshooting

### API Key Issues
- Ensure your API key is valid and has Information Extraction permissions
- Check that the key is properly set in `lib/config.ts`

### Image Processing Issues
- Supported formats: JPG, PNG, GIF, WebP
- Maximum file size: 10MB
- Ensure images are clear and readable

### Common Errors
- `401 Unauthorized`: Invalid API key
- `400 Bad Request`: Invalid image format or payload
- `429 Too Many Requests`: Rate limit exceeded

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test with real business card images
5. Submit a pull request

## License

MIT License - see LICENSE file for details 