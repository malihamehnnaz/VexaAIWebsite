import Hero from '@/components/pages/home/hero';
import Services from '@/components/pages/home/services';
import FeaturedSolutions from '@/components/pages/home/featured-solutions';
import Testimonials from '@/components/pages/home/testimonials';
import CaseStudies from '@/components/pages/home/case-studies';
import TechStack from '@/components/pages/home/tech-stack';
import Cta from '@/components/pages/home/cta';

export default function Home() {
  return (
    <>
      <Hero />
      <Services />
      <FeaturedSolutions />
      <Testimonials />
      <CaseStudies />
      <TechStack />
      <Cta />
    </>
  );
}
