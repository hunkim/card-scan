export interface BusinessCardData {
  id?: string
  name?: string
  company?: string
  jobTitle?: string
  phone?: string
  mobile?: string
  email?: string
  address?: string
  website?: string
  linkedin?: string
  twitter?: string
  confidence?: Record<string, number>
  timestamp?: string
  imageBase64?: string      // Medium-sized image (512x512) for detail view
  thumbnailBase64?: string  // Small thumbnail (64x64) for list view
  userId?: string
  metadata?: {
    first_name?: string
    last_name?: string
    department?: string
    mobile?: string
    fax?: string
    street_address?: string
    city?: string
    state?: string
    zip_code?: string
    country?: string
    facebook?: string
    instagram?: string
    skype?: string
    whatsapp?: string
    additional_info?: string
  }
}

export interface User {
  uid: string
  email: string
  displayName: string
  photoURL?: string
}

export interface UploadState {
  isUploading: boolean
  isProcessing: boolean
  progress: number
  error?: string
}
