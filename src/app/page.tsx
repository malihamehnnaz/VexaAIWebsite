import Header from '@/components/common/header';
import HeroSection from '@/components/features/hero-section';
import AboutSection from '@/components/features/about-section';
import ServicesSection from '@/components/features/services-section';
import WhyChooseUsSection from '@/components/features/why-choose-us-section';
import PricingSection from '@/components/features/pricing-section';
import PortfolioSection from '@/components/features/portfolio-section';
import RecommendationTool from '@/components/features/recommendation-tool';
import BlogSection from '@/components/features/blog-section';
import ContactSection from '@/components/features/contact-section';
import Footer from '@/components/common/footer';
import AIChatbot from '@/components/features/ai-chatbot';

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-grow">
        <HeroSection />
        <AboutSection />
        <ServicesSection />
        <WhyChooseUsSection />
        <PricingSection />
        <PortfolioSection />
        <RecommendationTool />
        <BlogSection />
        <ContactSection />
      </main>
      <Footer />
      <AIChatbot />
    </div>
  );
}
