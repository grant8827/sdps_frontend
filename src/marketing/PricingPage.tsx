import { useEffect } from 'react';
import { SiteFooter } from '../components/SiteFooter';
import { PublicNavbar } from './PublicNavbar';
import { PricingSection } from './PricingSection';

/** /pricing: the plans and prices on a page of their own (linked from the navbar). */
export function PricingPage() {
  useEffect(() => {
    document.title = 'Pricing · SDPMPlus';
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="public-page">
      <PublicNavbar />
      <main>
        <PricingSection />
      </main>
      <SiteFooter />
    </div>
  );
}
