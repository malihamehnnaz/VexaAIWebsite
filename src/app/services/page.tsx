import Header from '@/components/common/header';
import ServicesSection from '@/components/features/services-section';
import Footer from '@/components/common/footer';
import AIChatbot from '@/components/features/ai-chatbot';

export default function ServicesPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-grow">
        <ServicesSection />
      </main>
      <Footer />
      <AIChatbot />
    </div>
  );
}
