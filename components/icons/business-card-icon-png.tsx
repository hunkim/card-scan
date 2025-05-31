import React from 'react'
import Image from 'next/image'

interface BusinessCardIconPngProps {
  className?: string
  size?: number
}

export const BusinessCardIconPng: React.FC<BusinessCardIconPngProps> = ({ 
  className = "w-4 h-4", 
  size 
}) => {
  // Extract size from className if not provided as prop
  const getSize = () => {
    if (size) return size
    if (className?.includes('w-12 h-12')) return 48
    if (className?.includes('w-4 h-4')) return 16
    if (className?.includes('w-3 h-3')) return 12
    return 16
  }

  const iconSize = getSize()

  return (
    <div className={className} style={{ position: 'relative' }}>
      <Image
        src="/icons/icon.png"
        alt="Business Card"
        width={iconSize}
        height={iconSize}
        className="object-contain"
        style={{ width: '100%', height: '100%' }}
        priority
      />
    </div>
  )
} 