import ContactForm from '@/components/features/contact-form';
import BookingCalendar from '@/components/features/booking-calendar';
import { FaEnvelope, FaPhone, FaMapMarkerAlt } from 'react-icons/fa';
import { companyContact } from '@/content/site-content';

export default function ContactPage() {
  return (
    <div className="container mx-auto px-4 py-16">
      <h1 className="text-4xl font-bold text-center mb-12">Contact Us</h1>
      <div className="grid md:grid-cols-2 gap-16">
        <div>
          <h2 className="text-2xl font-bold mb-4">Get in Touch</h2>
          <p className="text-muted-foreground mb-8">
            Have a project in mind or need guidance on enterprise AI, software, or cloud transformation? Reach out and we’ll get back to you as soon as possible.
          </p>
          <div className="space-y-4">
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
          <div className="mt-12">
            <h2 className="text-2xl font-bold mb-4">Book a Consultation</h2>
            <BookingCalendar />
          </div>
        </div>
        <div>
          <ContactForm />
        </div>
      </div>
    </div>
  );
}