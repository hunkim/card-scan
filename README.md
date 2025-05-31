# Card Scan - AI Business Card Scanner

A modern business card scanner powered by **Upstage Information Extractor** that intelligently extracts contact information from business card images with high accuracy.

## Features

- 📸 **Multi-format Support** - Upload JPG, PNG, GIF, WebP images and PDFs
- 📋 **Clipboard Support** - Press Ctrl+V (Cmd+V on Mac) to paste images directly
- 🤖 **AI-Powered Extraction** - Uses Upstage Information Extractor for intelligent data extraction
- 📊 **Comprehensive Schema** - Extracts 20+ fields including contact details and social media
- 💾 **Cloud Storage** - Firebase-powered user accounts and card management
- 🔍 **Smart Search** - Find cards by name, company, email, or phone number
- 📱 **Mobile-First Design** - Optimized for mobile scanning with camera support
- 🎯 **Duplicate Detection** - Automatically detects and prevents duplicate cards
- ✏️ **Real-time Editing** - Auto-save editing with seamless user experience
- 📤 **CSV Export** - Export individual cards or entire collection
- 🌓 **Dark Mode** - Modern UI with light/dark theme support
- 📲 **Progressive Web App** - Install as native app with offline support
- 🔄 **Background Sync** - Automatically syncs cards when connection returns
- 💾 **Offline Storage** - View and scan cards even without internet

## Progressive Web App (PWA) Features

### 🏠 Install to Home Screen
- **One-click Installation**: Add Card Scan to your device's home screen
- **Native App Experience**: Runs in standalone mode without browser UI
- **Cross-platform**: Works on iOS, Android, Windows, macOS, and Linux
- **Auto-prompt**: Smart install prompt appears after user engagement

### 📱 Offline Functionality
- **Offline Viewing**: Access all saved business cards without internet
- **Offline Scanning**: Scan new cards and save them locally
- **Local Storage**: Uses IndexedDB for robust offline data storage
- **Smart Caching**: Automatically caches cards for offline access

### 🔄 Background Sync
- **Automatic Upload**: Cards saved offline sync when connection returns
- **Background Processing**: Uses service worker for seamless sync
- **Retry Logic**: Failed uploads retry automatically with exponential backoff
- **Conflict Resolution**: Handles duplicate detection for offline cards

### 🌐 Network Awareness
- **Connection Status**: Visual indicators for online/offline state
- **Pending Sync**: Shows count of cards waiting to upload
- **Manual Sync**: Force sync button for immediate upload
- **Graceful Degradation**: Full functionality regardless of connection

### 🔧 Technical Implementation
- **Service Worker**: Custom service worker for caching and background sync
- **IndexedDB**: Client-side database for offline card storage
- **Cache Strategy**: Network-first for data, cache-first for assets
- **Manifest**: Web app manifest for installation and theming

## Upstage Information Extractor Integration

This application showcases the power of **Upstage Information Extractor** for document understanding and structured data extraction.

### Why Upstage Information Extractor?

- **High Accuracy**: Advanced AI model specifically trained for document understanding
- **Structured Output**: Returns data in predefined JSON schemas
- **Multi-language Support**: Works with business cards in various languages
- **Robust OCR**: Handles various image qualities and card layouts
- **Industry-leading Performance**: Outperforms traditional OCR solutions

### Business Card Schema Implementation

The application uses a comprehensive 23-field JSON schema optimized for business cards:

```typescript
const BUSINESS_CARD_SCHEMA = {
  type: "json_schema",
  json_schema: {
    name: "business_card_schema",
    schema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Full name of the person on the business card" },
        first_name: { type: "string", description: "First name of the person" },
        last_name: { type: "string", description: "Last name of the person" },
        company: { type: "string", description: "Company or organization name" },
        job_title: { type: "string", description: "Job title, position, or role" },
        department: { type: "string", description: "Department or division within the company" },
        phone: { type: "string", description: "Primary phone number" },
        mobile: { type: "string", description: "Mobile or cell phone number" },
        fax: { type: "string", description: "Fax number" },
        email: { type: "string", description: "Email address" },
        website: { type: "string", description: "Company or personal website URL" },
        address: { type: "string", description: "Complete physical address" },
        street_address: { type: "string", description: "Street address line" },
        city: { type: "string", description: "City name" },
        state: { type: "string", description: "State or province" },
        zip_code: { type: "string", description: "ZIP or postal code" },
        country: { type: "string", description: "Country name" },
        linkedin: { type: "string", description: "LinkedIn profile URL or username" },
        twitter: { type: "string", description: "Twitter handle or URL" },
        facebook: { type: "string", description: "Facebook profile URL" },
        instagram: { type: "string", description: "Instagram handle or URL" },
        skype: { type: "string", description: "Skype username" },
        whatsapp: { type: "string", description: "WhatsApp number" },
        additional_info: { type: "string", description: "Any additional information or notes found on the card" }
      }
    }
  }
}
```

### API Integration Code

Here's how the application integrates with Upstage Information Extractor:

```typescript
// services/ocr-service.ts
export async function extractBusinessCardData(imageFile: File, apiKey: string): Promise<BusinessCardData> {
  // Convert image to base64 data URL
  const imageDataURL = await fileToDataURL(imageFile);

  // Prepare the request payload
  const payload = {
    model: "information-extract",
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: {
              url: imageDataURL
            }
          }
        ]
      }
    ],
    response_format: BUSINESS_CARD_SCHEMA,
    chunking: {
      pages_per_chunk: 1
    }
  };

  // Make API request to Upstage
  const response = await fetch("https://api.upstage.ai/v1/information-extraction", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json; charset=utf-8"
    },
    body: JSON.stringify(payload)
  });

  const result = await response.json();
  const extractedData = JSON.parse(result.choices[0].message.content);
  
  // Process and clean the extracted data
  return processExtractedData(extractedData);
}
```

### Data Processing and Validation

The application includes smart data processing to handle edge cases:

```typescript
// Smart field extraction with fallbacks
const name = extractedData.name || buildFullName(extractedData.first_name, extractedData.last_name);
const address = extractedData.address || buildAddress([
  extractedData.street_address,
  extractedData.city, 
  extractedData.state,
  extractedData.zip_code,
  extractedData.country
]);

// Separate mobile from main phone to avoid duplicates
const phone = extractedData.phone || extractedData.mobile;
const mobile = extractedData.mobile && extractedData.mobile !== phone ? extractedData.mobile : null;
```

## Quick Start

### 1. Get Your Upstage API Key

1. Visit [Upstage Console](https://console.upstage.ai/)
2. Sign up or log in to your account
3. Navigate to **API Keys** section
4. Create a new API key for **Information Extraction**
5. Copy your API key (starts with `up_`)

### 2. Set Up Environment Variables

Create a `.env.local` file in the project root:

```bash
# Upstage API Key
NEXT_PUBLIC_UPSTAGE_API_KEY=your_upstage_api_key_here

# Firebase Configuration (optional - for user accounts)
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### 3. Install Dependencies

```bash
pnpm install
# or
npm install
```

### 4. Run the Application

```bash
pnpm dev
# or  
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to start scanning business cards!

## How It Works

### 1. **Image Upload & Processing**
- Users upload business card images via drag-and-drop, file selection, or clipboard paste
- Images are converted to base64 format and resized for optimal processing
- Thumbnails are generated for efficient list display

### 2. **Upstage Information Extractor**
- Base64 image is sent to Upstage API with the business card schema
- Advanced AI model analyzes the image and extracts structured data
- Returns JSON response with identified fields and values

### 3. **Smart Data Processing**
- Application processes the raw extracted data
- Handles edge cases like missing names, duplicate phone numbers
- Builds complete addresses from components
- Validates and cleans all extracted fields

### 4. **User Experience**
- Extracted data appears in an editable form with auto-save
- Users can review and correct any fields
- Duplicate detection prevents saving identical cards
- Real-time search and filtering of saved cards

### Data Flow Diagram

```
📸 Image Upload → 🔄 Base64 Conversion → 🤖 Upstage API → 
📄 JSON Response → 🔧 Data Processing → 💾 Firebase Storage → 
📱 User Interface
```

## Project Structure

```
card-scan/
├── app/                    # Next.js App Router
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/            # React components
│   ├── ui/               # Reusable UI components
│   ├── header.tsx        # App header with auth
│   ├── file-upload.tsx   # Upload component
│   ├── business-card-display.tsx  # Card display/edit
│   └── card-browser.tsx  # Card list management
├── services/             
│   ├── ocr-service.ts    # Upstage API integration
│   └── storage-service.ts # Firebase operations
├── lib/
│   ├── config.ts         # Environment configuration
│   └── firebase.ts       # Firebase initialization
├── hooks/
│   └── use-toast.ts      # Toast notifications
├── contexts/
│   └── auth-context.tsx  # Authentication state
├── types/
│   └── index.ts          # TypeScript interfaces
└── app.tsx               # Main application
```

## Environment Configuration

The application uses environment variables for secure configuration:

- **Development**: Uses `.env.local` for local development
- **Production**: Set environment variables in your deployment platform
- **Security**: API keys are validated and never exposed to client-side code

```typescript
// lib/config.ts
export function getUpstageApiKey(): string {
  const apiKey = process.env.NEXT_PUBLIC_UPSTAGE_API_KEY;
  
  if (!apiKey || apiKey === "your_upstage_api_key_here") {
    throw new Error("Upstage API key not configured");
  }
  
  return apiKey;
}
```

## Production Deployment

### Security Best Practices

1. **Environment Variables**: Store all sensitive keys in environment variables
2. **API Routes**: Consider server-side API routes for additional security
3. **Rate Limiting**: Implement rate limiting for API calls
4. **Error Handling**: Add comprehensive error handling and logging

### Deployment Platforms

- **Vercel**: Optimal for Next.js applications
- **Netlify**: Great alternative with environment variable support  
- **Firebase Hosting**: Integrates well with Firebase backend
- **AWS/Google Cloud**: For enterprise deployments

## Troubleshooting

### Common Issues

**❌ "Upstage API key not configured"**
- Ensure `NEXT_PUBLIC_UPSTAGE_API_KEY` is set in `.env.local`
- Restart development server after adding environment variables
- Verify API key is valid and has Information Extraction permissions

**❌ "401 Unauthorized"**
- Check API key is correct and hasn't expired
- Verify you have sufficient credits in your Upstage account
- Ensure API key has Information Extraction service enabled

**❌ "Failed to extract data from image"**
- Check image format (JPG, PNG, GIF, WebP supported)
- Ensure image is clear and readable
- Try with a different business card image
- Check image file size (under 10MB recommended)

**❌ Firebase Authentication Issues**
- Verify all Firebase environment variables are set
- Check Firebase project configuration
- Ensure authentication is enabled in Firebase Console

### Performance Tips

- **Image Size**: Resize large images before upload for faster processing
- **Network**: Ensure stable internet connection for API calls
- **Browser**: Use modern browsers for optimal performance
- **Mobile**: Use rear camera for better image quality when scanning

## Contributing

We welcome contributions! Here's how to get started:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Test with real business cards** to ensure accuracy
4. **Follow TypeScript best practices**
5. **Update documentation** if needed
6. **Submit a pull request**

### Development Guidelines

- Use TypeScript for type safety
- Follow React best practices
- Test with various business card formats
- Ensure mobile responsiveness
- Add proper error handling

## Learn More

- [Upstage Information Extractor Documentation](https://console.upstage.ai/docs/capabilities/information-extraction/universal-information-extraction)
- [Next.js Documentation](https://nextjs.org/docs)
- [Firebase Documentation](https://firebase.google.com/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)

## Demo

🚀 **Try the live application**: **[https://card-scan-steel.vercel.app/](https://card-scan-steel.vercel.app/)**

Experience the power of Upstage Information Extractor:
- 📸 Upload a business card image
- 🤖 Watch AI extract contact information instantly
- ✏️ Edit and refine the extracted data
- 💾 Sign in to save cards to your collection
- 📱 Test the mobile-optimized scanning experience

## License

MIT License - see [LICENSE](LICENSE) file for details.

---

**Built with ❤️ using Upstage Information Extractor**

# Business Card Scanner

A modern Progressive Web App for extracting contact information from business cards using AI-powered OCR.

## Features

### 🚀 **NEW: Automatic Batch Upload**
- **Smart Detection**: Automatically enters batch mode when multiple files are uploaded
- **Multiple File Upload**: Drag & drop or select multiple business card images at once
- **Continuous Camera**: Camera stays open automatically after first capture for multiple photos
- **Visual Queue**: See all pending images with individual removal options
- **One-Click Processing**: Process all queued images with a single click
- **Progress Tracking**: Real-time progress indicator for batch operations
- **Smart Duplicate Detection**: Automatically detects and skips duplicate cards during batch processing

### Core Features
- **AI-Powered Extraction**: Uses Upstage Information Extractor for high-accuracy data extraction
- **Offline Support**: Works offline and syncs when back online
- **Progressive Web App**: Install as a native app on any device
- **Smart Export**: Contacts format on mobile, CSV on desktop
- **Duplicate Detection**: Prevents saving duplicate business cards
- **Search & Organization**: Find and organize your contacts easily

## How Batch Mode Works

### 🔄 **Automatic Detection**
The app automatically switches to batch mode when:
- Multiple files are dropped or selected at once
- Multiple images are pasted from clipboard
- Camera is used to take multiple photos (stays open after first capture)
- You click "Add More" on a single card preview

### 📱 **Single vs Batch Behavior**

**Single Mode (Default):**
- Upload one image → immediately shows preview and processes
- Take one photo → camera closes, processes immediately
- Perfect for quick single card processing

**Batch Mode (Auto-activated):**
- Upload multiple images → all go to queue
- Take photo → camera stays open for more captures
- Shows queue with all pending cards
- Process all at once with one click

### 🎯 **Usage Scenarios**

**Quick Single Card:**
1. Drop one image or take one photo
2. Review and edit the extracted data
3. Save to your collection

**Multiple Cards:**
1. Drop multiple images at once (auto-batch mode)
2. Or take first photo, then keep taking more (camera stays open)
3. Or upload one card and click "Add More" 
4. Review queue of all cards
5. Click "Process All" to extract data from all cards
6. Cards are automatically saved with duplicate detection

### ⭐ **Smart Features**

- **Camera Intelligence**: Automatically keeps camera open when it detects you want multiple captures
- **Flexible Addition**: Start with single mode, easily add more cards later
- **Visual Feedback**: Clear indicators show when you're in batch mode
- **Error Resilience**: Individual card failures don't stop batch processing
- **Memory Efficient**: Processes cards sequentially to handle large batches

## Technical Implementation

### Batch Processing Flow
1. **Queue Management**: Files are added to a local queue with preview generation
2. **Parallel Processing**: Each file is processed sequentially with progress tracking
3. **Duplicate Detection**: Each extracted card is checked against existing cards
4. **Auto-Save**: Valid cards are automatically saved to user's collection
5. **Error Handling**: Failed extractions are logged and reported to user

### UX Design Principles
- **Non-blocking**: Users can continue adding files while processing
- **Visual Feedback**: Clear progress indicators and status updates
- **Error Recovery**: Individual file failures don't stop batch processing
- **Mobile-First**: Optimized camera workflow for mobile users
- **Accessibility**: Keyboard navigation and screen reader support

## Use Cases

### Business Networking Events
- Quickly capture multiple business cards received at conferences
- Process entire stack of cards in one batch operation
- Automatic duplicate detection prevents redundant entries

### Office Digitization
- Bulk digitize existing business card collections
- Team members can process cards simultaneously
- Export to CSV for CRM integration

### Sales Teams
- Rapid contact capture during trade shows
- Batch processing of leads collected throughout the day
- Offline capability ensures no data loss

## Performance Considerations

- **Memory Management**: Large batches are processed sequentially to prevent memory issues
- **Network Optimization**: Offline processing with sync when online
- **Progress Tracking**: Real-time feedback prevents user confusion
- **Error Resilience**: Individual failures don't affect other cards in batch

---

*Powered by [Upstage Information Extractor](https://console.upstage.ai/docs/capabilities/information-extraction/universal-information-extraction) for accurate business card data extraction.* 