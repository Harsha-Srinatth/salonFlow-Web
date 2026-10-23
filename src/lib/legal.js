import { useCallback, useEffect, useState } from "react";
import { apiJson } from "@/lib/api-json";

/** The salon's own legal pages; the text is served by GET /api/public/legal/:slug and edited in Admin → Settings. */
export const LEGAL_PAGES = {
  privacy: { path: "/privacy", title: "Privacy Policy" },
  terms: { path: "/terms", title: "Terms & Conditions" },
};

/** @returns {{ document: object | null, status: "loading" | "ready" | "error", error: string | null, reload: () => void }} */
export function useLegalDocument(slug) {
  const [state, setState] = useState({ document: null, status: "loading", error: null });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setState({ document: null, status: "loading", error: null });
    apiJson(`/api/public/legal/${slug}`, { signal: controller.signal, timeoutMs: 15_000 })
      .then((data) => setState({ document: data.document, status: "ready", error: null }))
      .catch((error) => {
        if (!error.cancelled) setState({ document: null, status: "error", error: error.message });
      });
    return () => controller.abort();
  }, [slug, attempt]);
  const reload = useCallback(() => setAttempt((n) => n + 1), []);
  return { ...state, reload };
}

const slugify = (text) =>
  text
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "section";

/**
 * Splits a legal document into sections. "## " starts a section, "### " a sub-heading, "- " a
 * bullet (consecutive bullets form one list); any other non-blank line is a paragraph.
 * @returns {{ intro: object[], sections: { id: string, title: string, blocks: object[] }[] }}
 */
export function parseLegalBody(body) {
  const intro = [];
  const sections = [];
  const used = new Set();
  let blocks = intro;
  for (const raw of `${body ?? ""}`.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith("## ")) {
      const title = line.slice(3).trim();
      let id = slugify(title);
      for (let n = 2; used.has(id); n += 1) id = `${slugify(title)}-${n}`;
      used.add(id);
      blocks = [];
      sections.push({ id, title, blocks });
    } else if (line.startsWith("### ")) {
      blocks.push({ type: "h3", text: line.slice(4).trim() });
    } else if (/^[-•*]\s+/.test(line)) {
      const item = line.replace(/^[-•*]\s+/, "");
      const last = blocks[blocks.length - 1];
      if (last?.type === "ul") last.items.push(item);
      else blocks.push({ type: "ul", items: [item] });
    } else {
      blocks.push({ type: "p", text: line });
    }
  }
  return { intro, sections };
}

/** "2026-10-23" -> "23 October 2026" (a calendar date, so no time zone conversion). */
export function formatLegalDate(isoDate) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(`${isoDate ?? ""}`);
  if (!match) return "";
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}
