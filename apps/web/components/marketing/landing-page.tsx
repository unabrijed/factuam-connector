import { FeatureBento } from "./feature-bento";
import { Faq } from "./faq";
import { HeroSection } from "./hero-section";
import { HowItWorks } from "./how-it-works";
import { MarketingFooter } from "./marketing-footer";
import { ProofTeaser } from "./proof-teaser";

export function LandingPage() {
  return (
    <>
      <HeroSection />
      <HowItWorks />
      <FeatureBento />
      <ProofTeaser />
      <Faq />
      <MarketingFooter />
    </>
  );
}
