import type { Metadata } from 'next'
import './globals.css'
import { ThemeProvider } from '@/components/theme-provider'

export const metadata: Metadata = {
  title: 'Card Scan - AI Business Card Scanner',
  description: 'Instantly extract and organize contact information from business cards using AI-powered OCR technology',
  generator: 'Next.js',
  manifest: '/manifest.json',
  keywords: ['business card', 'scanner', 'OCR', 'AI', 'contact', 'card scan'],
  authors: [{ name: 'Card Scan' }],
  creator: 'Card Scan',
  publisher: 'Card Scan',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://card-scan.app'),
  icons: {
    icon: '/icons/icon.png',
    shortcut: '/icons/icon.png',
    apple: '/icons/icon.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Card Scan',
  },
  openGraph: {
    type: 'website',
    siteName: 'Card Scan',
    title: 'Card Scan - AI Business Card Scanner',
    description: 'Instantly extract and organize contact information from business cards using AI-powered OCR technology',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Card Scan - AI Business Card Scanner',
    description: 'Instantly extract and organize contact information from business cards using AI-powered OCR technology',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
        <meta name="theme-color" content="#2563eb" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Card Scan" />
        <meta name="msapplication-TileColor" content="#2563eb" />
        <meta name="msapplication-config" content="/browserconfig.xml" />
        <link rel="icon" type="image/png" sizes="32x32" href="/icons/icon.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/icons/icon.png" />
        <link rel="apple-touch-icon" href="/icons/icon.png" />
        <link rel="mask-icon" href="/icon.svg" color="#2563eb" />
      </head>
      <body suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
