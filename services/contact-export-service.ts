import type { BusinessCardData } from "@/types"

// Detect if user is on mobile device
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false
  
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
         (navigator.maxTouchPoints > 0 && navigator.maxTouchPoints > 2 && /MacIntel/.test(navigator.platform))
}

// Check if Web Share API is available
export function canUseWebShare(): boolean {
  return typeof window !== 'undefined' && typeof navigator !== 'undefined' && 'share' in navigator
}

// Generate vCard content for contact import
export function generateVCard(card: BusinessCardData): string {
  const vCardLines: string[] = []
  
  // vCard header
  vCardLines.push('BEGIN:VCARD')
  vCardLines.push('VERSION:3.0')
  
  // Name (required field)
  if (card.name) {
    // Split name into parts for proper formatting
    const nameParts = card.name.trim().split(' ')
    const firstName = nameParts[0] || ''
    const lastName = nameParts.slice(1).join(' ') || ''
    
    // N: Last;First;Middle;Prefix;Suffix
    vCardLines.push(`N:${lastName};${firstName};;;`)
    vCardLines.push(`FN:${card.name}`)
  } else {
    // Fallback if no name
    vCardLines.push('N:;;;;')
    vCardLines.push('FN:Unknown Contact')
  }
  
  // Organization and title
  if (card.company) {
    vCardLines.push(`ORG:${card.company}`)
  }
  
  if (card.jobTitle) {
    vCardLines.push(`TITLE:${card.jobTitle}`)
  }
  
  // Phone numbers
  if (card.phone) {
    vCardLines.push(`TEL;TYPE=WORK,VOICE:${card.phone}`)
  }
  
  if (card.mobile && card.mobile !== card.phone) {
    vCardLines.push(`TEL;TYPE=CELL:${card.mobile}`)
  }
  
  // Email
  if (card.email) {
    vCardLines.push(`EMAIL;TYPE=WORK:${card.email}`)
  }
  
  // Address
  if (card.address) {
    // ADR: Post office box;Extended address;Street;City;State;Postal code;Country
    const addressParts = card.address.split(',').map(part => part.trim())
    const street = addressParts[0] || ''
    const city = addressParts[1] || ''
    const state = addressParts[2] || ''
    
    vCardLines.push(`ADR;TYPE=WORK:;;${street};${city};${state};;`)
    vCardLines.push(`LABEL;TYPE=WORK:${card.address}`)
  }
  
  // Website
  if (card.website) {
    let websiteUrl = card.website
    if (!websiteUrl.startsWith('http://') && !websiteUrl.startsWith('https://')) {
      websiteUrl = `https://${websiteUrl}`
    }
    vCardLines.push(`URL;TYPE=WORK:${websiteUrl}`)
  }
  
  // Social media
  if (card.linkedin) {
    let linkedinUrl = card.linkedin
    if (!linkedinUrl.startsWith('http')) {
      linkedinUrl = linkedinUrl.startsWith('linkedin.com') 
        ? `https://${linkedinUrl}`
        : `https://linkedin.com/in/${linkedinUrl.replace('@', '')}`
    }
    vCardLines.push(`URL;TYPE=LINKEDIN:${linkedinUrl}`)
  }
  
  if (card.twitter) {
    let twitterUrl = card.twitter
    if (!twitterUrl.startsWith('http')) {
      const handle = twitterUrl.replace('@', '')
      twitterUrl = `https://twitter.com/${handle}`
    }
    vCardLines.push(`URL;TYPE=TWITTER:${twitterUrl}`)
  }
  
  // Timestamp
  if (card.timestamp) {
    const date = new Date(card.timestamp)
    const timestamp = date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
    vCardLines.push(`REV:${timestamp}`)
  }
  
  // vCard footer
  vCardLines.push('END:VCARD')
  
  return vCardLines.join('\r\n')
}

// Export single contact as vCard
export async function exportContactAsVCard(card: BusinessCardData): Promise<void> {
  const vCardContent = generateVCard(card)
  const fileName = `${card.name || 'contact'}.vcf`
  
  if (canUseWebShare()) {
    try {
      // Create blob and file for sharing
      const blob = new Blob([vCardContent], { type: 'text/vcard' })
      const file = new File([blob], fileName, { type: 'text/vcard' })
      
      await navigator.share({
        title: `Contact: ${card.name || 'Business Card'}`,
        text: `Contact information for ${card.name || 'business card'}`,
        files: [file]
      })
      return
    } catch (error) {
      console.log('Web Share failed, falling back to download:', error)
      // Fall through to download method
    }
  }
  
  // Fallback to direct download
  downloadVCard(vCardContent, fileName)
}

// Download vCard file
function downloadVCard(content: string, fileName: string): void {
  const blob = new Blob([content], { type: 'text/vcard' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.click()
  URL.revokeObjectURL(url)
}

// Export as CSV (existing functionality)
export function exportAsCSV(cards: BusinessCardData[]): void {
  const headers = [
    "Name",
    "Company",
    "Job Title",
    "Phone",
    "Mobile",
    "Email",
    "Address",
    "Website",
    "LinkedIn",
    "Twitter",
    "Date Added",
  ]
  
  const csvContent = [
    headers.join(","),
    ...cards.map((card) =>
      [
        card.name || "",
        card.company || "",
        card.jobTitle || "",
        card.phone || "",
        card.mobile || "",
        card.email || "",
        card.address || "",
        card.website || "",
        card.linkedin || "",
        card.twitter || "",
        card.timestamp ? new Date(card.timestamp).toLocaleDateString() : "",
      ]
        .map((field) => `"${field}"`)
        .join(","),
    ),
  ].join("\n")

  const blob = new Blob([csvContent], { type: "text/csv" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `business-cards-${new Date().toISOString().split("T")[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// Smart export - choose format based on device and number of cards
export async function smartExport(cards: BusinessCardData[]): Promise<void> {
  if (cards.length === 1 && isMobileDevice()) {
    // Single card on mobile - export as contact
    await exportContactAsVCard(cards[0])
  } else {
    // Multiple cards or desktop - export as CSV
    exportAsCSV(cards)
  }
}

// Get export button text based on context
export function getExportButtonText(cardCount: number): string {
  if (cardCount === 1 && isMobileDevice()) {
    return "Add to Contacts"
  } else if (cardCount === 1) {
    return "Export Contact"
  } else {
    return "Export CSV"
  }
}

// Get export icon name
export function getExportIconName(cardCount: number): string {
  if (cardCount === 1 && isMobileDevice()) {
    return "UserPlus" // or "Contact"
  } else {
    return "Download"
  }
} 