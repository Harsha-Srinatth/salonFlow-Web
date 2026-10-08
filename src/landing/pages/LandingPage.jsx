import "@/landing/landing.css";
import { OfflineBanner } from "@/components/kit/offline-banner";
import { SupportAssistant } from "@/components/assistant/support-assistant";
import Navbar from "@/landing/components/landing/Navbar";
import HeroSection from "@/landing/components/landing/HeroSection";
import ServicesSection from "@/landing/components/landing/ServicesSection";
import HowItWorksSection from "@/landing/components/landing/HowItWorksSection";
import StatsSection from "@/landing/components/landing/StatsSection";
import PerksSection from "@/landing/components/landing/PerksSection";
import ReferralSection from "@/landing/components/landing/ReferralSection";
import FAQSection from "@/landing/components/landing/FAQSection";
import CTASection from "@/landing/components/landing/CTASection";
import Footer from "@/landing/components/landing/Footer";
import StickyBookBar from "@/landing/components/landing/StickyBookBar";

/*
 * Public landing page. Native scrolling, static sections: everything above the fold is in the
 * first paint and nothing waits on an animation. TestimonialsSection / invented counts were
 * removed on purpose: only attributable figures (lib/public-claims, the salon's own settings)
 * are shown.
 */
export default function LandingPage() {
  return (
    <div className="landing-root relative min-h-dvh overflow-x-clip text-foreground">
      <a href="#main" className="sr-only z-toast rounded-full bg-portal px-4 py-2 font-semibold text-portal-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3">
        Skip to content
      </a>
      <OfflineBanner />
      <Navbar />
      <main id="main">
        <HeroSection />
        <ServicesSection />
        <HowItWorksSection />
        <StatsSection />
        <PerksSection />
        <ReferralSection />
        <FAQSection />
        <CTASection />
      </main>
      <Footer />
      <StickyBookBar />
      <SupportAssistant variant="landing" triggerClassName="max-md:bottom-[calc(0.75rem+var(--safe-bottom))] max-md:right-3 max-md:pb-0" />
    </div>
  );
}
