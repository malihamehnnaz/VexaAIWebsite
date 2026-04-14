'use client';

import Link from 'next/link';
import { ArrowUpRight, Mail, MapPin, Phone } from 'lucide-react';
import Logo from './logo';
import { useLanguage } from '@/components/common/language-provider';
import { getLocalizedCompanyContact, siteCopy } from '@/lib/localization';

export default function Footer() {
  const { language } = useLanguage();
  const copy = siteCopy[language];
  const companyContact = getLocalizedCompanyContact(language);
  const navLinks = [
    { href: '/', label: copy.nav.home },
    { href: '/about', label: copy.nav.about },
    { href: '/services', label: copy.nav.services },
    { href: '/solutions', label: copy.nav.solutions },
    { href: '/case-studies', label: copy.nav.caseStudies },
    { href: '/blog', label: copy.nav.blog },
    { href: '/contact', label: copy.nav.contact },
  ];

  return (
    <footer className="border-t border-border/40 bg-background/95">
      <div className="container mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-background to-muted/40 p-6 shadow-sm shadow-primary/5 md:p-8">
          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr_1fr] lg:items-start">
            <div>
              <Link href="/" aria-label="Go to home" className="inline-block cursor-pointer">
                <Logo />
              </Link>
              <p className="mt-4 max-w-md text-sm leading-6 text-muted-foreground">
                {copy.footer.intro}
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href="/contact"
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-transform hover:-translate-y-0.5"
                >
                  {copy.footer.startProject}
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/solutions"
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-primary/40 hover:text-primary"
                >
                  {copy.footer.viewSolutions}
                </Link>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">{copy.footer.navigate}</p>
              <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="text-muted-foreground transition-colors hover:text-primary"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">{copy.footer.contact}</p>
              <div className="mt-4 space-y-4 text-sm text-muted-foreground">
                <a href={`mailto:${companyContact.email}`} className="flex items-start gap-3 transition-colors hover:text-primary">
                  <Mail className="mt-0.5 h-4 w-4 text-primary" />
                  <span>{companyContact.email}</span>
                </a>
                <a href={companyContact.phoneHref} className="flex items-start gap-3 transition-colors hover:text-primary">
                  <Phone className="mt-0.5 h-4 w-4 text-primary" />
                  <span>{companyContact.phone}</span>
                </a>
                <div className="flex items-start gap-3">
                  <MapPin className="mt-0.5 h-4 w-4 text-primary" />
                  <span>{companyContact.address}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-3 border-t border-border/50 pt-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <p>&copy; {new Date().getFullYear()} Vexa AI. {copy.footer.rights}</p>
            <div className="flex gap-4">
              <Link href="#" className="transition-colors hover:text-primary">{copy.footer.privacy}</Link>
              <Link href="#" className="transition-colors hover:text-primary">{copy.footer.terms}</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
