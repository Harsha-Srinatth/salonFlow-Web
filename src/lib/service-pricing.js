// Client mirror of bn/src/bookings/variant-pricing.js. The server is authoritative at checkout;
// this only drives what the menu and the booking summary display.

/** Membership tiers charged the member rate (BASIC rates are not published yet). */
export const MEMBER_RATE_SEGMENTS = ["PREMIUM"];

export const isMemberRateSegment = (segment) => MEMBER_RATE_SEGMENTS.includes(`${segment ?? ""}`.trim().toUpperCase());

export const serviceVariants = (service) => (Array.isArray(service?.variants) ? service.variants.filter((v) => v?.name) : []);

export function findVariant(service, name) {
  const wanted = `${name ?? ""}`.trim().toLowerCase();
  if (!wanted) return null;
  return serviceVariants(service).find((v) => `${v.name}`.trim().toLowerCase() === wanted) ?? null;
}

/** The variant to use when none was chosen yet: the first listed (menus list the smallest first). */
export const defaultVariantName = (service) => serviceVariants(service)[0]?.name ?? "";

/**
 * List and member price of a service for a chosen variant.
 * `price` is what this customer pays before offers: the member rate for member tiers when one exists.
 */
export function resolveServicePrice(service, variantName, membershipSegment) {
  const variants = serviceVariants(service);
  const variant = variants.length ? findVariant(service, variantName) ?? variants[0] : null;
  const listPrice = Number(variant ? variant.price : service?.basePrice ?? 0);
  const rawMember = variant ? variant.memberPrice : service?.memberPrice;
  const memberPrice = rawMember == null ? null : Number(rawMember);
  const price = isMemberRateSegment(membershipSegment) && memberPrice != null && memberPrice > 0 ? memberPrice : listPrice;
  return { variant, listPrice, memberPrice, price };
}

export const formatRupees = (value) => `₹${Math.round(Number(value) || 0).toLocaleString("en-IN")}`;

/** Audience labels shown to customers. */
export const AUDIENCE_LABEL = { WOMEN: "Women", MEN: "Men", UNISEX: "Everyone", BOY: "Boy", GIRL: "Girl" };
