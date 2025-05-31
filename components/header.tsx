"use client"
import { useState, useEffect } from "react"
import { Moon, Sun, LogIn, LogOut, CreditCard, Bug, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAuth } from "@/contexts/auth-context"
import { useTheme } from "next-themes"
import { usePWAInstall } from "@/components/pwa-install-prompt"

export function Header() {
  const { user, signInWithGoogle, signOut } = useAuth()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const { isInstalled, canInstall, promptInstall } = usePWAInstall()

  // Only render theme-dependent content after mounting to avoid hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark")
  }

  const handleInstall = async () => {
    const success = await promptInstall()
    if (success) {
      console.log('PWA installed successfully!')
    }
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="text-lg font-semibold flex items-center">
            <CreditCard className="w-5 h-5 mr-2" />
            Card Scan
          </div>
        </div>

        <nav className="flex items-center space-x-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => window.open("https://github.com/hunkim/card-scan/issues", "_blank")}
            className="text-sm"
          >
            <Bug className="w-4 h-4 mr-2" />
            Report Issue
          </Button>

          <Button variant="ghost" size="icon" onClick={toggleTheme}>
            {mounted ? (
              theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />
            ) : (
              // Show a neutral icon during SSR to avoid hydration mismatch
              <div className="w-4 h-4" />
            )}
          </Button>

          {/* PWA Install Button - Only show on mobile when installable */}
          {!isInstalled && canInstall && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleInstall}
              className="md:hidden"
            >
              <Download className="w-4 h-4 mr-2" />
              Install
            </Button>
          )}

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.photoURL || "/placeholder.svg"} alt={user.displayName} />
                    <AvatarFallback>{user.displayName?.charAt(0) || "U"}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <div className="flex items-center justify-start gap-2 p-2">
                  <div className="flex flex-col space-y-1 leading-none">
                    <p className="font-medium">{user.displayName}</p>
                    <p className="w-[200px] truncate text-sm text-muted-foreground">{user.email}</p>
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut}>
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button variant="outline" size="sm" onClick={signInWithGoogle}>
              <LogIn className="w-4 h-4 mr-2" />
              Sign In
            </Button>
          )}
        </nav>
      </div>
    </header>
  )
}
