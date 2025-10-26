import Header from '@/components/common/header';
import HeroSection from '@/components/features/hero-section';
import ServicesSection from '@/components/features/services-section';
import PortfolioSection from '@/components/features/portfolio-section';
import ContactSection from '@/components/features/contact-section';
import Footer from '@/components/common/footer';
import AIChatbot from '@/components/features/ai-chatbot';

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-grow">
        <HeroSection />
        <ServicesSection />
        <PortfolioSection />
        <ContactSection />
      </main>
      <Footer />
      <AIChatbot />
    </div>
  );
}
