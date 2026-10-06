/**
 * Service, category and audience icons (contract item f). Category names are free text typed by
 * the admin ("Hair", "Kids grooming", "Bridal makeup" …), so we match keywords, first match wins.
 */
import { Baby, Brush, Crown, Droplets, Flower2, Gem, Hand, Palette, Scissors, Smile, Sparkles, User, UserRound, Users, Wind } from "lucide-react";

const CATEGORY_ICONS = [
  [/bridal|wedding|groom package|mehendi|mehndi/i, Crown],
  [/kid|child|boy|girl|baby/i, Baby],
  [/make ?up|makeup|cosmetic/i, Brush],
  [/colou?r|highlight|balayage|henna|dye/i, Palette],
  [/nail|mani|pedi/i, Hand],
  [/spa|massage|body|relax|reflex|aroma/i, Flower2],
  [/wax|thread|detan|bleach|shave|beard|groom/i, Droplets],
  [/skin|face|facial|clean|peel|glow/i, Smile],
  [/blow|dry|straighten|smooth|keratin|perm/i, Wind],
  [/hair|cut|trim|style/i, Scissors],
  [/premium|luxury|signature/i, Gem],
];

/** lucide icon component for a category or service name. */
export function iconForCategory(category) {
  const text = `${category ?? ""}`;
  return CATEGORY_ICONS.find(([re]) => re.test(text))?.[1] ?? Sparkles;
}

/** Icon for a service object: tries its category, then its name. */
export function iconForService(service) {
  const byCategory = iconForCategory(service?.category);
  return byCategory === Sparkles ? iconForCategory(service?.name) : byCategory;
}

/** Audience values used by services (WOMEN, MEN, UNISEX, BOY, GIRL, plus the CHILDREN filter). */
export const AUDIENCE_ICON = { WOMEN: UserRound, MEN: User, UNISEX: Users, BOY: Baby, GIRL: Baby, CHILDREN: Baby, KIDS: Baby };

export function iconForAudience(audience) {
  return AUDIENCE_ICON[`${audience ?? ""}`.trim().toUpperCase()] ?? Users;
}
