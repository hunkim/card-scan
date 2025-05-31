"use client"

import React from "react"
import { Phone, Mail, Globe, Linkedin, ExternalLink } from "lucide-react"
import { cn } from "@/lib/utils"

interface InteractiveContactFieldProps {
  type: "phone" | "email" | "website" | "linkedin" | "twitter"
  value: string
  className?: string
  iconClassName?: string
  showIcon?: boolean
  truncate?: boolean
}

export function InteractiveContactField({
  type,
  value,
  className = "",
  iconClassName = "",
  showIcon = true,
  truncate = false
}: InteractiveContactFieldProps) {
  if (!value) return null

  const formatPhoneNumber = (phone: string) => {
    // Remove any non-digit characters for the tel: link
    const cleaned = phone.replace(/\D/g, '')
    return cleaned
  }

  const formatLinkedInUrl = (linkedin: string) => {
    // Handle various LinkedIn URL formats
    let url = linkedin.trim()
    
    if (url.startsWith("http")) {
      return url
    }
    
    if (url.startsWith("linkedin.com") || url.startsWith("www.linkedin.com")) {
      return `https://${url}`
    }
    
    if (url.includes("linkedin.com")) {
      return `https://${url}`
    }
    
    // Assume it's a username/profile handle
    const cleanHandle = url.replace(/^@/, "").replace(/^\//, "")
    return `https://linkedin.com/in/${cleanHandle}`
  }

  const formatTwitterUrl = (twitter: string) => {
    let url = twitter.trim()
    
    if (url.startsWith("http")) {
      return url
    }
    
    if (url.startsWith("twitter.com") || url.startsWith("x.com")) {
      return `https://${url}`
    }
    
    if (url.includes("twitter.com") || url.includes("x.com")) {
      return `https://${url}`
    }
    
    // Assume it's a username/handle
    const cleanHandle = url.replace(/^@/, "").replace(/^\//, "")
    return `https://x.com/${cleanHandle}`
  }

  const formatWebsiteUrl = (website: string) => {
    let url = website.trim()
    if (!url.startsWith("http")) {
      return `https://${url}`
    }
    return url
  }

  const getHref = () => {
    switch (type) {
      case "phone":
        return `tel:${formatPhoneNumber(value)}`
      case "email":
        return `mailto:${value}`
      case "website":
        return formatWebsiteUrl(value)
      case "linkedin":
        return formatLinkedInUrl(value)
      case "twitter":
        return formatTwitterUrl(value)
      default:
        return "#"
    }
  }

  const getIcon = () => {
    switch (type) {
      case "phone":
        return <Phone className={cn("w-3 h-3", iconClassName)} />
      case "email":
        return <Mail className={cn("w-3 h-3", iconClassName)} />
      case "website":
        return <Globe className={cn("w-3 h-3", iconClassName)} />
      case "linkedin":
        return <Linkedin className={cn("w-3 h-3", iconClassName)} />
      case "twitter":
        return (
          <svg className={cn("w-3 h-3", iconClassName)} viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
          </svg>
        )
      default:
        return <ExternalLink className={cn("w-3 h-3", iconClassName)} />
    }
  }

  const getAriaLabel = () => {
    switch (type) {
      case "phone":
        return `Call ${value}`
      case "email":
        return `Send email to ${value}`
      case "website":
        return `Visit website ${value}`
      case "linkedin":
        return `View LinkedIn profile ${value}`
      case "twitter":
        return `View Twitter/X profile ${value}`
      default:
        return `Open ${value}`
    }
  }

  const getDisplayValue = () => {
    switch (type) {
      case "linkedin":
        if (value.includes("linkedin.com")) {
          return value.split("/").pop() || value // Show just the username for long LinkedIn URLs
        }
        return value
      case "twitter":
        if (value.includes("twitter.com") || value.includes("x.com")) {
          return `@${value.split("/").pop() || value}` // Show as @username for Twitter URLs
        }
        return value.startsWith("@") ? value : `@${value}`
      default:
        return value
    }
  }

  return (
    <a
      href={getHref()}
      target={type === "phone" || type === "email" ? "_self" : "_blank"}
      rel={type === "website" || type === "linkedin" || type === "twitter" ? "noopener noreferrer" : undefined}
      className={cn(
        "inline-flex items-center gap-1.5 text-primary hover:text-primary/80 transition-colors cursor-pointer",
        "hover:underline",
        className
      )}
      aria-label={getAriaLabel()}
      onClick={(e) => {
        // For phone calls on non-mobile devices, show a confirmation
        if (type === "phone" && !navigator.userAgent.match(/Mobile|Android|iPhone|iPad/)) {
          const confirmed = confirm(`Do you want to call ${value}?`)
          if (!confirmed) {
            e.preventDefault()
          }
        }
      }}
    >
      {showIcon && (
        <span className="flex-shrink-0 text-muted-foreground">
          {getIcon()}
        </span>
      )}
      <span className={cn(truncate && "truncate")}>
        {getDisplayValue()}
      </span>
    </a>
  )
} 