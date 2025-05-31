import type { BusinessCardData } from "@/types"

// Upstage API configuration
const UPSTAGE_API_URL = "https://api.upstage.ai/v1/information-extraction"

// Business card schema for Upstage Information Extraction
const BUSINESS_CARD_SCHEMA = {
  type: "json_schema",
  json_schema: {
    name: "business_card_schema",
    schema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Full name of the person on the business card"
        },
        first_name: {
          type: "string", 
          description: "First name of the person"
        },
        last_name: {
          type: "string",
          description: "Last name of the person"
        },
        company: {
          type: "string",
          description: "Company or organization name"
        },
        job_title: {
          type: "string",
          description: "Job title, position, or role"
        },
        department: {
          type: "string",
          description: "Department or division within the company"
        },
        phone: {
          type: "string",
          description: "Primary phone number"
        },
        mobile: {
          type: "string",
          description: "Mobile or cell phone number"
        },
        fax: {
          type: "string",
          description: "Fax number"
        },
        email: {
          type: "string",
          description: "Email address"
        },
        website: {
          type: "string",
          description: "Company or personal website URL"
        },
        address: {
          type: "string",
          description: "Complete physical address"
        },
        street_address: {
          type: "string",
          description: "Street address line"
        },
        city: {
          type: "string",
          description: "City name"
        },
        state: {
          type: "string",
          description: "State or province"
        },
        zip_code: {
          type: "string",
          description: "ZIP or postal code"
        },
        country: {
          type: "string",
          description: "Country name"
        },
        linkedin: {
          type: "string",
          description: "LinkedIn profile URL or username"
        },
        twitter: {
          type: "string",
          description: "Twitter handle or URL"
        },
        facebook: {
          type: "string",
          description: "Facebook profile URL"
        },
        instagram: {
          type: "string",
          description: "Instagram handle or URL"
        },
        skype: {
          type: "string",
          description: "Skype username"
        },
        whatsapp: {
          type: "string",
          description: "WhatsApp number"
        },
        additional_info: {
          type: "string",
          description: "Any additional information or notes found on the card"
        }
      }
    }
  }
}

interface UpstageResponse {
  id: string;
  choices: Array<{
    finish_reason: string;
    message: {
      content: string;
      role: string;
    };
  }>;
  usage: {
    completion_tokens: number;
    prompt_tokens: number;
    total_tokens: number;
  };
}

// Convert image file to base64 data URL
async function fileToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Generate thumbnail from image file
async function generateThumbnail(file: File, maxWidth: number = 64, maxHeight: number = 64): Promise<string> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      // Calculate new dimensions maintaining aspect ratio
      let { width, height } = img;
      
      if (width > height) {
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }
      }
      
      canvas.width = width;
      canvas.height = height;
      
      // Draw image to canvas with new dimensions
      ctx?.drawImage(img, 0, 0, width, height);
      
      // Convert to data URL (base64)
      resolve(canvas.toDataURL('image/jpeg', 0.8));
    };
    
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

// Generate medium-sized image for detail view
async function generateMediumImage(file: File, maxWidth: number = 512, maxHeight: number = 512): Promise<string> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      // Calculate new dimensions maintaining aspect ratio
      let { width, height } = img;
      
      if (width > height) {
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }
      }
      
      canvas.width = width;
      canvas.height = height;
      
      // Draw image to canvas with new dimensions
      ctx?.drawImage(img, 0, 0, width, height);
      
      // Convert to data URL (base64)
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

// Helper function to safely set field values, avoiding undefined
function safeSetField(value: any): any {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  return value;
}

// Helper function to build address from components
function buildAddress(components: (string | null | undefined)[]): string | null {
  const validComponents = components.filter(c => c && c.trim());
  return validComponents.length > 0 ? validComponents.join(", ") : null;
}

// Helper function to build full name
function buildFullName(firstName?: string, lastName?: string): string | null {
  const parts = [firstName, lastName].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : null;
}

export async function extractBusinessCardData(imageFile: File, apiKey?: string): Promise<BusinessCardData> {
  if (!apiKey) {
    throw new Error("Upstage API key is required. Please provide your API key.");
  }

  try {
    // Convert image to data URL
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
    const response = await fetch(UPSTAGE_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json; charset=utf-8"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Upstage API error: ${response.status} ${response.statusText}`);
    }

    const result: UpstageResponse = await response.json();
    
    if (!result.choices || result.choices.length === 0) {
      throw new Error("No data extracted from the image");
    }

    // Parse the extracted JSON data
    const extractedContent = result.choices[0].message.content;
    const extractedData = JSON.parse(extractedContent);

    // Build the business card data object, only including non-null values
    const businessCardData: BusinessCardData = {
      id: "card-" + Date.now(),
      timestamp: new Date().toISOString(),
    };

    // Add main fields only if they have values
    const name = safeSetField(extractedData.name) || buildFullName(extractedData.first_name, extractedData.last_name);
    if (name) businessCardData.name = name;

    const company = safeSetField(extractedData.company);
    if (company) businessCardData.company = company;

    const jobTitle = safeSetField(extractedData.job_title);
    if (jobTitle) businessCardData.jobTitle = jobTitle;

    const phone = safeSetField(extractedData.phone) || safeSetField(extractedData.mobile);
    if (phone) businessCardData.phone = phone;

    // Extract mobile separately if different from main phone
    const mobile = safeSetField(extractedData.mobile);
    if (mobile && mobile !== phone) businessCardData.mobile = mobile;

    const email = safeSetField(extractedData.email);
    if (email) businessCardData.email = email;

    const address = safeSetField(extractedData.address) || buildAddress([
      extractedData.street_address,
      extractedData.city,
      extractedData.state,
      extractedData.zip_code,
      extractedData.country
    ]);
    if (address) businessCardData.address = address;

    const website = safeSetField(extractedData.website);
    if (website) businessCardData.website = website;

    const linkedin = safeSetField(extractedData.linkedin);
    if (linkedin) businessCardData.linkedin = linkedin;

    const twitter = safeSetField(extractedData.twitter);
    if (twitter) businessCardData.twitter = twitter;

    // Store additional extracted fields in metadata (only non-null values)
    const metadata: Record<string, any> = {};
    
    if (safeSetField(extractedData.first_name)) metadata.first_name = extractedData.first_name;
    if (safeSetField(extractedData.last_name)) metadata.last_name = extractedData.last_name;
    if (safeSetField(extractedData.department)) metadata.department = extractedData.department;
    if (safeSetField(extractedData.fax)) metadata.fax = extractedData.fax;
    if (safeSetField(extractedData.street_address)) metadata.street_address = extractedData.street_address;
    if (safeSetField(extractedData.city)) metadata.city = extractedData.city;
    if (safeSetField(extractedData.state)) metadata.state = extractedData.state;
    if (safeSetField(extractedData.zip_code)) metadata.zip_code = extractedData.zip_code;
    if (safeSetField(extractedData.country)) metadata.country = extractedData.country;
    if (safeSetField(extractedData.facebook)) metadata.facebook = extractedData.facebook;
    if (safeSetField(extractedData.instagram)) metadata.instagram = extractedData.instagram;
    if (safeSetField(extractedData.skype)) metadata.skype = extractedData.skype;
    if (safeSetField(extractedData.whatsapp)) metadata.whatsapp = extractedData.whatsapp;
    if (safeSetField(extractedData.additional_info)) metadata.additional_info = extractedData.additional_info;

    // Only add metadata if it has properties
    if (Object.keys(metadata).length > 0) {
      businessCardData.metadata = metadata;
    }

    // Add confidence scores (mock for now as Upstage doesn't provide them)
    businessCardData.confidence = {
      name: 95,
      company: 90,
      jobTitle: 85,
      phone: 88,
      mobile: 86,
      email: 92,
      address: 80,
      website: 75,
      linkedin: 70,
      twitter: 65,
    };

    return businessCardData;

  } catch (error) {
    console.error("Error extracting business card data:", error);
    throw new Error(`Failed to extract business card data: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

export async function uploadImage(file: File): Promise<string> {
  // Legacy function - now generates medium image
  return await generateMediumImage(file);
}

export async function uploadImageWithThumbnail(file: File): Promise<{ imageBase64: string; thumbnailBase64: string }> {
  try {
    // Generate both sizes as base64
    const [thumbnailBase64, imageBase64] = await Promise.all([
      generateThumbnail(file),      // 64x64 for list view
      generateMediumImage(file)     // 512x512 for detail view
    ]);
    
    return { imageBase64, thumbnailBase64 };
  } catch (error) {
    console.error("Error generating images:", error);
    throw new Error("Failed to process image for storage");
  }
}
