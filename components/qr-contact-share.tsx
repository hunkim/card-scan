"use client"

import { useState, useEffect } from "react"
import QRCode from "qrcode"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { QrCode, Download, Share2 } from "lucide-react"
import type { BusinessCardData } from "@/types"

interface QRContactShareProps {
  data: BusinessCardData
  className?: string
}

export function QRContactShare({ data, className }: QRContactShareProps) {
  const [qrCodeDataURL, setQrCodeDataURL] = useState<string>("")
  const [isGenerating, setIsGenerating] = useState(false)

  // Generate vCard data from business card data
  const generateVCardData = (data: BusinessCardData): string => {
    const vcard = []
    
    vcard.push("BEGIN:VCARD")
    vcard.push("VERSION:3.0")
    
    // Name (required field)
    if (data.name) {
      // Try to split name into first and last name
      const nameParts = data.name.trim().split(/\s+/)
      const firstName = nameParts[0] || ""
      const lastName = nameParts.slice(1).join(" ") || ""
      
      vcard.push(`N:${lastName};${firstName};;;`)
      vcard.push(`FN:${data.name}`)
    }
    
    // Organization and title
    if (data.company) {
      vcard.push(`ORG:${data.company}`)
    }
    
    if (data.jobTitle) {
      vcard.push(`TITLE:${data.jobTitle}`)
    }
    
    // Phone numbers
    if (data.phone) {
      vcard.push(`TEL;TYPE=WORK,VOICE:${data.phone}`)
    }
    
    if (data.mobile && data.mobile !== data.phone) {
      vcard.push(`TEL;TYPE=CELL:${data.mobile}`)
    }
    
    // Email
    if (data.email) {
      vcard.push(`EMAIL;TYPE=WORK:${data.email}`)
    }
    
    // Address
    if (data.address) {
      // Simple address format - you could enhance this to parse components
      vcard.push(`ADR;TYPE=WORK:;;${data.address};;;;`)
    }
    
    // Website
    if (data.website) {
      let url = data.website
      if (!url.startsWith("http://") && !url.startsWith("https://")) {
        url = `https://${url}`
      }
      vcard.push(`URL:${url}`)
    }
    
    // Social media
    if (data.linkedin) {
      let linkedinUrl = data.linkedin
      if (!linkedinUrl.startsWith("http")) {
        if (linkedinUrl.startsWith("linkedin.com") || linkedinUrl.startsWith("www.linkedin.com")) {
          linkedinUrl = `https://${linkedinUrl}`
        } else if (!linkedinUrl.includes("linkedin.com")) {
          linkedinUrl = `https://linkedin.com/in/${linkedinUrl.replace(/^@/, "")}`
        }
      }
      vcard.push(`URL;TYPE=LinkedIn:${linkedinUrl}`)
    }
    
    if (data.twitter) {
      let twitterUrl = data.twitter
      if (!twitterUrl.startsWith("http")) {
        if (twitterUrl.startsWith("twitter.com") || twitterUrl.startsWith("x.com")) {
          twitterUrl = `https://${twitterUrl}`
        } else {
          twitterUrl = `https://twitter.com/${twitterUrl.replace(/^@/, "")}`
        }
      }
      vcard.push(`URL;TYPE=Twitter:${twitterUrl}`)
    }
    
    // Additional metadata if available
    if (data.metadata) {
      if (data.metadata.department) {
        vcard.push(`X-DEPARTMENT:${data.metadata.department}`)
      }
      if (data.metadata.fax) {
        vcard.push(`TEL;TYPE=FAX:${data.metadata.fax}`)
      }
    }
    
    vcard.push("END:VCARD")
    
    return vcard.join("\r\n")
  }

  // Generate QR code
  useEffect(() => {
    const generateQRCode = async () => {
      if (!data.name && !data.company && !data.email && !data.phone) {
        // Not enough data to generate a meaningful QR code
        setQrCodeDataURL("")
        return
      }

      setIsGenerating(true)
      try {
        const vCardData = generateVCardData(data)
        
        const qrDataURL = await QRCode.toDataURL(vCardData, {
          width: 200,
          margin: 2,
          color: {
            dark: "#000000",
            light: "#FFFFFF",
          },
          errorCorrectionLevel: "M",
        })
        
        setQrCodeDataURL(qrDataURL)
      } catch (error) {
        console.error("Error generating QR code:", error)
        setQrCodeDataURL("")
      } finally {
        setIsGenerating(false)
      }
    }

    generateQRCode()
  }, [data])

  const handleDownloadQR = () => {
    if (!qrCodeDataURL) return
    
    const link = document.createElement("a")
    link.download = `${data.name || "contact"}_qr_code.png`
    link.href = qrCodeDataURL
    link.click()
  }

  const handleShareQR = async () => {
    if (!qrCodeDataURL) return
    
    try {
      // Convert data URL to blob
      const response = await fetch(qrCodeDataURL)
      const blob = await response.blob()
      
      if (navigator.share && navigator.canShare) {
        const file = new File([blob], `${data.name || "contact"}_qr_code.png`, {
          type: "image/png",
        })
        
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: `${data.name || "Contact"} - QR Code`,
            text: "Scan this QR code to add contact details",
            files: [file],
          })
          return
        }
      }
      
      // Fallback: copy to clipboard
      await navigator.clipboard.write([
        new ClipboardItem({
          "image/png": blob,
        }),
      ])
      
      // You might want to show a toast notification here
    } catch (error) {
      console.error("Error sharing QR code:", error)
      // Fallback to download
      handleDownloadQR()
    }
  }

  if (!qrCodeDataURL && !isGenerating) {
    return null
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <QrCode className="w-5 h-5" />
          Share Contact
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-center">
          {isGenerating ? (
            <div className="w-[200px] h-[200px] bg-muted rounded-lg flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : qrCodeDataURL ? (
            <div className="border rounded-lg p-3 bg-white">
              <Image
                src={qrCodeDataURL} 
                alt="Contact QR Code"
                width={200}
                height={200}
                className="w-[200px] h-[200px]"
              />
            </div>
          ) : null}
        </div>
        
      </CardContent>
    </Card>
  )
} 