import Link from 'next/link';
import { Twitter, Linkedin, Github } from 'lucide-react';
import Logo from './logo';
import { companyContact } from '@/content/site-content';

const navLinks = [
  { href: '/about', label: 'About' },
  { href: '/services', label: 'Services' },
  { href: '/solutions', label: 'Solutions' },
  { href: '/case-studies', label: 'Case Studies' },
  { href: '/blog', label: 'Blog' },
  { href: '/contact', label: 'Contact' },
];

const socialLinks = [
  { name: 'Twitter', href: '#', icon: Twitter },
  { name: 'LinkedIn', href: '#', icon: Linkedin },
  { name: 'GitHub', href: '#', icon: Github },
];

export default function Footer() {
  return (
    <footer className="border-t border-border/40 bg-background/95">
      <div className="container mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div className="md:col-span-1">
            <Link href="/" className="mb-4 inline-block">
              <Logo />
            </Link>
            <p className="text-sm text-muted-foreground">
              Engineering the Future with Intelligent Solutions.
            </p>
            <div className="mt-4 space-y-2 text-sm text-muted-foreground">
              <p>
                <a href={`mailto:${companyContact.email}`} className="transition-colors hover:text-primary">{companyContact.email}</a>
              </p>
              <p>
                <a href={companyContact.phoneHref} className="transition-colors hover:text-primary">{companyContact.phone}</a>
              </p>
              <p>{companyContact.address}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-8 md:col-span-2 md:grid-cols-3">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">Company</h3>
              <ul className="mt-4 space-y-2">
                {navLinks.slice(0, 3).map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-sm text-muted-foreground transition-colors hover:text-primary">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">Resources</h3>
              <ul className="mt-4 space-y-2">
                {navLinks.slice(3).map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-sm text-muted-foreground transition-colors hover:text-primary">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">Legal</h3>
              <ul className="mt-4 space-y-2">
                <li><Link href="#" className="text-sm text-muted-foreground transition-colors hover:text-primary">Privacy Policy</Link></li>
                <li><Link href="#" className="text-sm text-muted-foreground transition-colors hover:text-primary">Terms of Service</Link></li>
              </ul>
            </div>
          </div>
          <div className="md:col-span-1">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">Connect With Us</h3>
            <div className="mt-4 flex space-x-4">
              {socialLinks.map((social) => (
                <Link key={social.name} href={social.href} className="text-muted-foreground transition-colors hover:text-primary">
                  <social.icon className="h-5 w-5" />
                  <span className="sr-only">{social.name}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-12 border-t border-border/40 pt-8 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Vexa AI. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
