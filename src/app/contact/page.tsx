"use client";

import ContactForm from '@/components/features/contact-form';
import { FaEnvelope, FaPhone, FaMapMarkerAlt } from 'react-icons/fa';
import { useLanguage } from '@/components/common/language-provider';
import { getLocalizedCompanyContact, siteCopy } from '@/lib/localization';

const mapEmbedUrl = 'https://www.openstreetmap.org/export/embed.html?bbox=20.2465%2C63.8218%2C20.2588%2C63.8284&layer=mapnik&marker=63.8251%2C20.2526';
const mapExternalUrl = 'https://www.openstreetmap.org/?mlat=63.8251&mlon=20.2526#map=17/63.8251/20.2526';

export default function ContactPage() {
  const { language } = useLanguage();
  const copy = siteCopy[language].contactPage;
  const companyContact = getLocalizedCompanyContact(language);

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-4 text-center text-4xl font-bold">{copy.title}</h1>
        <p className="mx-auto mb-12 max-w-2xl text-center text-muted-foreground">
          {copy.description}
        </p>

      <div className="grid gap-16 lg:grid-cols-[1.05fr_0.95fr]">
        <div>
          <h2 className="mb-4 text-2xl font-bold">{copy.getInTouch}</h2>
          <p className="mb-8 text-muted-foreground">
            {copy.body}
          </p>
          <div className="space-y-4 rounded-3xl border border-border/60 bg-muted/20 p-6">
            <div className="flex items-center gap-4">
              <FaEnvelope className="w-6 h-6 text-primary" />
              <a href={`mailto:${companyContact.email}`} className="text-lg hover:underline">{companyContact.email}</a>
            </div>
            <div className="flex items-center gap-4">
              <FaPhone className="w-6 h-6 text-primary" />
              <a href={companyContact.phoneHref} className="text-lg hover:underline">{companyContact.phone}</a>
            </div>
            <div className="flex items-center gap-4">
              <FaMapMarkerAlt className="w-6 h-6 text-primary" />
              <p className="text-lg">{companyContact.address}</p>
            </div>
          </div>

          <div className="mt-8 overflow-hidden rounded-3xl border border-border/60 bg-background shadow-sm">
            <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
              <div>
                <h2 className="text-xl font-semibold">{copy.officeLocation}</h2>
                <p className="text-sm text-muted-foreground">Rådhusesplanaden 6 F, Umeå</p>
              </div>
              <span className="inline-flex items-center gap-2 rounded-full bg-rose-500/10 px-3 py-1 text-xs font-medium text-rose-600 dark:text-rose-400">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                {copy.liveLocation}
              </span>
            </div>
            <div className="relative h-[320px] w-full">
              <iframe
                title={`${copy.officeLocation} - Vexa AI`}
                src={mapEmbedUrl}
                className="h-full w-full border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
              <div className="pointer-events-none absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-full flex-col items-center">
                <span className="h-5 w-5 rounded-full border-4 border-white bg-red-500 shadow-lg shadow-red-500/30" />
                <span className="-mt-1 h-6 w-1 rounded-full bg-red-500/85" />
              </div>
            </div>
            <div className="border-t border-border/60 px-5 py-4 text-sm text-muted-foreground">
              <a href={mapExternalUrl} target="_blank" rel="noreferrer" className="font-medium text-primary hover:underline">
                {copy.openInMap}
              </a>
            </div>
          </div>

        </div>
        <div>
          <ContactForm />
        </div>
      </div>
      </div>
    </div>
  );
}