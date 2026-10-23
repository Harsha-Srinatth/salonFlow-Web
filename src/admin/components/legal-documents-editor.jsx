"use client";
import { ExternalLink, FileText, RotateCcw, Save, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { ButtonLoadingMorph, ErrorState, FloatingLabelInput, useAsyncAction } from "@/components/kit";
import { SkeletonText } from "@/components/motion";
import { useConfirm } from "@/admin/components/confirm-dialog";
import { apiJson } from "@/lib/api-json";
import { formatLegalDate, LEGAL_PAGES } from "@/lib/legal";
import { notify as toast } from "@/lib/notify";
import { cn } from "@/lib/utils";

const MAX_BODY = 40_000;
const TABS = [
  { slug: "privacy", label: "Privacy Policy", icon: ShieldCheck },
  { slug: "terms", label: "Terms & Conditions", icon: FileText },
];

const draftOf = (doc) => ({ body: doc.body, effectiveDate: doc.effectiveDate });

/**
 * Edits the salon's own Privacy Policy and Terms & Conditions (shown at /privacy and /terms).
 * Saved separately from the business profile; "Restore built-in" drops the edited version. Lives
 * inside the Settings form, so every button here is type="button".
 */
export function LegalDocumentsEditor() {
  const [docs, setDocs] = useState({});
  const [drafts, setDrafts] = useState({});
  const [tab, setTab] = useState("privacy");
  const [status, setStatus] = useState("loading");
  const [loadError, setLoadError] = useState(null);
  const saveAction = useAsyncAction({ successMs: 900 });
  const { ask, confirmSheet } = useConfirm();

  const apply = useCallback((list) => {
    const bySlug = Object.fromEntries(list.map((doc) => [doc.slug, doc]));
    setDocs((current) => ({ ...current, ...bySlug }));
    setDrafts((current) => ({ ...current, ...Object.fromEntries(list.map((doc) => [doc.slug, draftOf(doc)])) }));
  }, []);

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const data = await apiJson("/api/admin/legal", { auth: true });
      apply(data.documents ?? []);
      setStatus("ready");
    } catch (error) {
      setLoadError(error.message);
      setStatus("error");
    }
  }, [apply]);

  useEffect(() => {
    void load();
  }, [load]);

  if (status === "loading") return <SkeletonText lines={6} />;
  if (status === "error") return <ErrorState compact title="Couldn't load the legal pages" description={loadError} onRetry={load} />;

  const doc = docs[tab];
  const draft = drafts[tab] ?? { body: "", effectiveDate: "" };
  const dirty = doc && (draft.body !== doc.body || draft.effectiveDate !== doc.effectiveDate);
  const setDraft = (field) => (value) => setDrafts((current) => ({ ...current, [tab]: { ...current[tab], [field]: value } }));

  async function save() {
    try {
      const data = await apiJson(`/api/admin/legal/${tab}`, { method: "PUT", auth: true, body: draft });
      apply([data.document]);
      toast.success(`${LEGAL_PAGES[tab].title} saved`, { description: `Live at ${LEGAL_PAGES[tab].path}` });
    } catch (error) {
      toast.error(error.message);
      throw error;
    }
  }

  function restore() {
    ask({
      kind: "destructive",
      icon: RotateCcw,
      title: `Restore the built-in ${LEGAL_PAGES[tab].title}?`,
      description: "Your edited version is removed and the built-in text is shown again.",
      confirmLabel: "Slide to restore",
      cancelLabel: "Keep my version",
      action: async () => {
        try {
          const data = await apiJson(`/api/admin/legal/${tab}`, { method: "DELETE", auth: true });
          apply([data.document]);
          toast.success("Built-in text restored");
        } catch (error) {
          toast.error(error.message);
          throw error;
        }
      },
    });
  }

  return (
    <div className="space-y-4">
      <div role="tablist" aria-label="Legal page" className="flex flex-wrap gap-2">
        {TABS.map(({ slug, label, icon: Icon }) => {
          const changed = docs[slug] && drafts[slug] && (drafts[slug].body !== docs[slug].body || drafts[slug].effectiveDate !== docs[slug].effectiveDate);
          return (
            <button
              key={slug}
              type="button"
              role="tab"
              aria-selected={tab === slug}
              onClick={() => setTab(slug)}
              className={cn(
                "inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold transition-colors",
                tab === slug ? "bg-portal text-portal-foreground shadow-glow" : "bg-muted text-foreground hover:bg-muted/70"
              )}
            >
              <Icon className="size-4" aria-hidden /> {label}
              {changed ? <span className="size-2 rounded-full bg-warning" aria-label="unsaved changes" /> : null}
            </button>
          );
        })}
      </div>

      <div role="tabpanel" aria-label={LEGAL_PAGES[tab].title} className="space-y-3">
        <p className="text-caption text-ink-neutral">
          {doc?.isDefault ? "Showing the built-in text." : `Edited version${doc?.updatedAt ? `, saved ${new Date(doc.updatedAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}` : ""}.`}{" "}
          Start sections with <code className="rounded bg-muted px-1">## </code>, sub-headings with <code className="rounded bg-muted px-1">### </code> and bullets with <code className="rounded bg-muted px-1">- </code>.
        </p>
        <div className="grid gap-3 sm:grid-cols-[minmax(0,14rem)_1fr] sm:items-start">
          <FloatingLabelInput
            id={`legal-${tab}-date`}
            type="date"
            label="Effective date"
            value={draft.effectiveDate}
            hint={draft.effectiveDate ? formatLegalDate(draft.effectiveDate) : "Required"}
            onChange={(e) => setDraft("effectiveDate")(e.target.value)}
          />
          <p className="text-caption text-ink-neutral sm:pt-3">Change the date whenever you change the content, so customers can see the policy was updated.</p>
        </div>
        {/* A plain textarea: a floating label would sit on top of the text once it scrolls. */}
        <div className="space-y-1.5">
          <label htmlFor={`legal-${tab}-body`} className="text-sm font-semibold">
            {LEGAL_PAGES[tab].title} text
          </label>
          <textarea
            id={`legal-${tab}-body`}
            maxLength={MAX_BODY}
            value={draft.body}
            spellCheck
            onChange={(e) => setDraft("body")(e.target.value)}
            aria-describedby={`legal-${tab}-count`}
            className="block min-h-[22rem] w-full resize-y rounded-control bg-card px-3.5 py-3 font-mono text-[13px] leading-6 ring-1 ring-inset ring-border outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-portal/60"
          />
          <p id={`legal-${tab}-count`} className="text-right text-caption text-ink-neutral tabular-nums">
            {draft.body.length.toLocaleString("en-IN")}/{MAX_BODY.toLocaleString("en-IN")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ButtonLoadingMorph type="button" icon={Save} disabled={!dirty} state={saveAction.state} loadingLabel="Saving…" successLabel="Saved" onClick={() => saveAction.run(save)}>
            Save {tab === "privacy" ? "policy" : "terms"}
          </ButtonLoadingMorph>
          {dirty ? (
            <ButtonLoadingMorph type="button" variant="ghost" onClick={() => setDrafts((current) => ({ ...current, [tab]: draftOf(doc) }))}>
              Discard changes
            </ButtonLoadingMorph>
          ) : null}
          {!doc?.isDefault ? (
            <ButtonLoadingMorph type="button" variant="ghost" icon={RotateCcw} onClick={restore}>
              Restore built-in
            </ButtonLoadingMorph>
          ) : null}
          <a
            href={LEGAL_PAGES[tab].path}
            target="_blank"
            rel="noopener"
            className="ml-auto inline-flex h-11 items-center gap-2 rounded-control px-3 text-sm font-semibold text-portal hover:bg-portal/10"
          >
            View page <ExternalLink className="size-4" aria-hidden />
          </a>
        </div>
      </div>
      {confirmSheet}
    </div>
  );
}
