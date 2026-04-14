'use client'

import Link from 'next/link'
import { Menu } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import Logo from '@/components/common/logo'
import LanguageToggle from '@/components/common/language-toggle'
import { useLanguage } from '@/components/common/language-provider'
import { siteCopy } from '@/lib/localization'
import { ThemeToggle } from './theme-toggle'

export default function Header() {
  const [isOpen, setIsOpen] = useState(false)
  const { language } = useLanguage()
  const copy = siteCopy[language]
  const navLinks = [
    { href: '/', label: copy.nav.home },
    { href: '/about', label: copy.nav.about },
    { href: '/services', label: copy.nav.services },
    { href: '/solutions', label: copy.nav.solutions },
    { href: '/case-studies', label: copy.nav.caseStudies },
    { href: '/blog', label: copy.nav.blog },
  ]
  
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 max-w-7xl items-center justify-between">
        <Link href="/" aria-label="Go to home" className="relative z-[60] flex cursor-pointer items-center gap-2">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <LanguageToggle />
          <div className="hidden md:block">
            <ThemeToggle />
          </div>
          <Button asChild className="hidden sm:inline-flex">
            <Link href="/contact">{copy.nav.contactUs}</Link>
          </Button>
          <div className="md:hidden">
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">{copy.nav.toggleMenu}</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left">
                <Link href="/" aria-label="Go to home" className="mb-8 flex cursor-pointer items-center" onClick={() => setIsOpen(false)}>
                  <Logo />
                </Link>
                <nav className="flex flex-col gap-6">
                  {navLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setIsOpen(false)}
                      className="text-lg font-medium text-muted-foreground transition-colors hover:text-primary"
                    >
                      {link.label}
                    </Link>
                  ))}
                </nav>
                <div className="mt-8 flex items-center gap-3">
                  <ThemeToggle />
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  )
}
