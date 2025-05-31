import React from 'react'

interface BusinessCardIconProps {
  className?: string
  size?: number
}

export const BusinessCardIcon: React.FC<BusinessCardIconProps> = ({ 
  className = "w-4 h-4", 
  size 
}) => {
  const style = size ? { width: size, height: size * (2/3) } : undefined
  
  return (
    <svg 
      className={className}
      style={style}
      viewBox="0 0 24 16" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Card background */}
      <rect 
        x="1" 
        y="1" 
        width="22" 
        height="14" 
        rx="2" 
        ry="2" 
        fill="currentColor" 
        fillOpacity="0.1" 
        stroke="currentColor" 
        strokeWidth="1"
      />
      
      {/* Name line */}
      <rect 
        x="3" 
        y="3" 
        width="8" 
        height="1.5" 
        rx="0.5" 
        fill="currentColor" 
        fillOpacity="0.6"
      />
      
      {/* Title line */}
      <rect 
        x="3" 
        y="5.5" 
        width="6" 
        height="1" 
        rx="0.5" 
        fill="currentColor" 
        fillOpacity="0.4"
      />
      
      {/* Company line */}
      <rect 
        x="3" 
        y="7.5" 
        width="10" 
        height="1" 
        rx="0.5" 
        fill="currentColor" 
        fillOpacity="0.4"
      />
      
      {/* Contact info lines */}
      <rect 
        x="3" 
        y="10" 
        width="7" 
        height="0.8" 
        rx="0.4" 
        fill="currentColor" 
        fillOpacity="0.3"
      />
      <rect 
        x="3" 
        y="11.5" 
        width="9" 
        height="0.8" 
        rx="0.4" 
        fill="currentColor" 
        fillOpacity="0.3"
      />
      
      {/* Small logo placeholder */}
      <circle 
        cx="18" 
        cy="4" 
        r="2" 
        fill="currentColor" 
        fillOpacity="0.2"
      />
    </svg>
  )
} 