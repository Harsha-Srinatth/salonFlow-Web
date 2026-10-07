import { CircleHelp, Gift, Route, Scissors } from "lucide-react";
import { iconForCategory } from "@/lib/service-icons";

/** In-page sections shown in the navbar (icon + short label). */
export const NAV_LINKS = [
  { id: "services", label: "Services", icon: Scissors },
  { id: "how", label: "How it works", icon: Route },
  { id: "rewards", label: "Rewards", icon: Gift },
  { id: "faq", label: "FAQ", icon: CircleHelp },
];

/** Where every "Book" button goes. Guests sign in (or sign up) first; GuestOnlyRoute bounces signed-in users to their portal. */
export const BOOK_HREF = "/auth/login";
export const SIGNUP_HREF = "/auth/signup";

const pexels = (id, w) => `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${w}`;

/** Responsive image props for a Pexels photo (explicit size so nothing shifts while it loads). */
export function photo(id, alt) {
  return {
    src: pexels(id, 640),
    srcSet: `${pexels(id, 420)} 420w, ${pexels(id, 640)} 640w, ${pexels(id, 900)} 900w`,
    alt,
    width: 640,
    height: 800,
  };
}

/**
 * Service categories for the showcase. There is no public services endpoint, so this is the
 * curated list the landing page already advertised (no prices, no "most popular" claims).
 *
 * Extension point: if a public services API appears, map each service to
 * `{ id, title, label, image?, audience }` where `audience` is the API's WOMEN | MEN | UNISEX |
 * BOY | GIRL value. ServicesSection shows Women / Men / Kids tabs automatically once the data
 * contains more than one audience, and hides them otherwise (as now).
 */
export const SERVICE_CATEGORIES = [
  { id: "hair", title: "Haircut & styling", label: "Cuts · styling · blow-dry", image: photo("1319460", "Stylist cutting hair") },
  { id: "colour", title: "Colour & highlights", label: "Global · highlights · care", image: photo("2068975", "Hair being styled") },
  { id: "skin", title: "Facial & skin care", label: "Cleanups · facials", image: photo("3993449", "Facial treatment") },
  { id: "spa", title: "Spa & relaxation", label: "Massage · hair spa", image: photo("3738673", "Spa relaxation") },
  { id: "beard", title: "Beard & grooming", label: "Shave · beard · trim" },
  { id: "bridal", title: "Bridal & occasions", label: "Makeup · packages", image: photo("1570807", "Beauty treatment") },
].map((item) => ({ ...item, icon: iconForCategory(item.title) }));

export const HERO_PHOTO = photo("3065171", "Salon chair in a calm, bright salon");
