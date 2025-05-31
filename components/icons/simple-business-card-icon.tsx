import React from 'react'

interface SimpleBusinessCardIconProps {
  className?: string
}

export const SimpleBusinessCardIcon: React.FC<SimpleBusinessCardIconProps> = ({ 
  className = "w-4 h-4" 
}) => {
  return (
    <img
      src="/icons/icon.png"
      alt="Business Card"
      className={`${className} object-contain`}
    />
  )
} 