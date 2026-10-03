import { CheckCircle2, ClipboardList, HeartHandshake, Info, ShieldAlert, Sparkles, UserCheck, UserX } from "lucide-react";

/** Display order, labels and icons for the long-form service sections (matches the backend keys). */
export const SERVICE_DETAIL_SECTIONS = [
  { key: "overview", label: "What it is", icon: Info, hint: "Explain the service in plain words." },
  { key: "benefits", label: "Why it helps", icon: Sparkles, hint: "The main benefits." },
  { key: "suitableFor", label: "Good for", icon: UserCheck, hint: "Who this service suits." },
  { key: "notRecommendedFor", label: "Not recommended for", icon: UserX, hint: "Who should avoid it or check first." },
  { key: "precautions", label: "Precautions", icon: ShieldAlert, hint: "Allergies, patch tests, requirements." },
  { key: "expectedResult", label: "What to expect", icon: CheckCircle2, hint: "The experience and typical result." },
  { key: "preparation", label: "Before your visit", icon: ClipboardList, hint: "How to prepare." },
  { key: "aftercare", label: "Aftercare", icon: HeartHandshake, hint: "What to do afterwards." },
];

export const SERVICE_DETAIL_LIMITS = {
  overview: 1500,
  benefits: 1500,
  suitableFor: 1000,
  notRecommendedFor: 1000,
  precautions: 1500,
  expectedResult: 1000,
  preparation: 1000,
  aftercare: 1500,
};

export const MAX_GALLERY_IMAGES = 8;

/** Cover image first, then gallery photos, de-duplicated (same rule as the backend). */
export function serviceImages(service) {
  if (Array.isArray(service?.images) && service.images.length) return service.images;
  return [service?.image, ...(Array.isArray(service?.gallery) ? service.gallery : [])].filter(
    (url, index, all) => typeof url === "string" && url && all.indexOf(url) === index
  );
}

/** Splits a section into paragraphs / bullet lines ("- " or "• " prefixes become bullets). */
export function sectionBlocks(text) {
  const lines = `${text ?? ""}`.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const blocks = [];
  for (const line of lines) {
    const bullet = /^[-•*]\s+/.test(line);
    const value = line.replace(/^[-•*]\s+/, "");
    const last = blocks[blocks.length - 1];
    if (bullet && last?.type === "list") last.items.push(value);
    else if (bullet) blocks.push({ type: "list", items: [value] });
    else blocks.push({ type: "p", text: value });
  }
  return blocks;
}
