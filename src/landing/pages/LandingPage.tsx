import Navbar from '@/landing/components/landing/Navbar';
import HeroSection from '@/landing/components/landing/HeroSection';
import ServicesSection from '@/landing/components/landing/ServicesSection';
import WhyChooseSection from '@/landing/components/landing/WhyChooseSection';
import HowItWorksSection from '@/landing/components/landing/HowItWorksSection';
import FeaturesSection from '@/landing/components/landing/FeaturesSection';
import GallerySection from '@/landing/components/landing/GallerySection';
import TestimonialsSection from '@/landing/components/landing/TestimonialsSection';
import StatsSection from '@/landing/components/landing/StatsSection';
import FAQSection from '@/landing/components/landing/FAQSection';
import CTASection from '@/landing/components/landing/CTASection';
import Footer from '@/landing/components/landing/Footer';

export default function LandingPage() {
  return (
    <main className="min-h-screen text-foreground">
      <Navbar />
      <HeroSection />
      <ServicesSection />
      <WhyChooseSection />
      <HowItWorksSection />
      <FeaturesSection />
      <GallerySection />
      <TestimonialsSection />
      <StatsSection />
      <FAQSection />
      <CTASection />
      <Footer />
    </main>
  );
}
