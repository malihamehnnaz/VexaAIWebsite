import Link from 'next/link';
import { Twitter, Linkedin, Github } from 'lucide-react';
import Logo from './logo';

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/services', label: 'Services' },
  { href: '/#about', label: 'About' },
  { href: '/#portfolio', label: 'Portfolio' },
  { href: '/#blog', label: 'Blog' },
  { href: '/#contact', label: 'Contact' },
];

const socialLinks = [
  { href: '#', icon: Twitter },
  { href: '#', icon: Linkedin },
  { href: '#', icon: Github },
];

export default function Footer() {
  return (
    <footer className="bg-secondary text-secondary-foreground">
      <div className="container mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between space-y-8 md:flex-row md:space-y-0">
          <div className="flex flex-col items-center md:items-start">
            <Link href="/" className="mb-4">
              <Logo />
            </Link>
            <p className="text-sm text-center md:text-left text-muted-foreground">
              Empowering businesses with AI, Software, and Cloud.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-x-8 gap-y-4 text-sm font-medium">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href} className="transition-colors hover:text-primary">
                {link.label}
              </Link>
            ))}
          </div>
          <div className="flex items-center space-x-4">
            {socialLinks.map((social, index) => (
              <Link key={index} href={social.href} className="text-muted-foreground transition-colors hover:text-primary">
                <social.icon className="h-5 w-5" />
                <span className="sr-only">{social.icon.displayName}</span>
              </Link>
            ))}
          </div>
        </div>
        <div className="mt-8 border-t border-border pt-8 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Vexa AI. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
