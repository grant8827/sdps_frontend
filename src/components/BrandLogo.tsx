/**
 * The SDPMPlus logo (public/sdpmplus-logo.jpg — a web-sized copy of
 * public/SDPMPlus_School_Branding_Logo.png). It includes the product
 * name, so it replaces the old badge + text. Sized by height; the
 * width follows the logo's 3:1 shape.
 */
export function BrandLogo({ height = 40 }: { height?: number }) {
  return (
    <img
      src="/sdpmplus-logo.jpg"
      alt="SDPMPlus — School Drop-off & Pick-up"
      className="brand-logo"
      height={height}
      width={Math.round(height * 3)}
    />
  );
}
