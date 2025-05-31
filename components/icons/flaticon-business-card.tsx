import React from 'react'
import Image from 'next/image'

interface FlaticonBusinessCardProps {
  className?: string
  size?: number
}

export const FlaticonBusinessCard: React.FC<FlaticonBusinessCardProps> = ({ 
  className = "w-4 h-4", 
  size = 16 
}) => {
  return (
    <div className={className}>
      <Image
        src="/icons/icon.png"
        alt="Business Card"
        width={size}
        height={size}
        className="w-full h-full object-contain"
      />
    </div>
  )
} 