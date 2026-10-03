import Navbar from '@/landing/components/landing/Navbar';
import HeroSection from '@/landing/components/landing/HeroSection';
import ServicesSection from '@/landing/components/landing/ServicesSection';
import WhyChooseSection from '@/landing/components/landing/WhyChooseSection';
import HowItWorksSection from '@/landing/components/landing/HowItWorksSection';
import GallerySection from '@/landing/components/landing/GallerySection';
import FAQSection from '@/landing/components/landing/FAQSection';
import CTASection from '@/landing/components/landing/CTASection';
import Footer from '@/landing/components/landing/Footer';
import { SupportAssistant } from '@/components/assistant/support-assistant';

export default function LandingPage() {
  return (
    <main className="min-h-screen text-foreground">
      <Navbar />
      <HeroSection />
      <ServicesSection />
      <WhyChooseSection />
      <HowItWorksSection />
      <GallerySection />
      {/* TestimonialsSection and StatsSection are not rendered: their reviews and counts were
          placeholders, and publishing invented reviews or figures is misleading (and unlawful
          under consumer-protection rules). Re-enable once they show real, consented data. */}
      <FAQSection />
      <CTASection />
      <Footer />
      <SupportAssistant variant="landing" />
    </main>
  );
}
