"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Flag, MessageCircle, MessageSquareHeart, Reply, Send, Sparkles, Star } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { ButtonLoadingMorph, ErrorState, FloatingLabelInput, Rating, StatCard, StatusChip, useAsyncAction } from "@/components/kit";
import { SkeletonList, spring } from "@/components/motion";
import { AvatarBadge } from "@/admin/components/avatar-badge";
import { EmptyState } from "@/admin/components/empty-state";
import { FilterTabs } from "@/admin/components/filter-tabs";
import { SlideOver } from "@/admin/components/slide-over";
import { ToneChip } from "@/admin/components/tone-chip";
import { dateOf } from "@/admin/lib/safe-format";
import { getFirebaseIdToken } from "@/lib/auth/auth-client";
import { toApiUrl } from "@/lib/api-base";
import { notify } from "@/lib/notify";
import { AdminLayout } from "../portal/admin-layout";

async function authFetch(path, init) {
  const token = await getFirebaseIdToken().catch(() => null);
  const res = await fetch(toApiUrl(path), {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Request failed");
  return data;
}

const STATUS_TABS = [
  { value: "ALL", label: "All" },
  { value: "OPEN", label: "Open" },
  { value: "REVIEWED", label: "Reviewed" },
  { value: "RESOLVED", label: "Resolved" },
];
const TYPE_TABS = [
  { value: "ALL", label: "All types" },
  { value: "FEEDBACK", label: "Reviews", icon: MessageSquareHeart },
  { value: "COMPLAINT", label: "Complaints", icon: Flag },
];
const EMPTY_SUMMARY = { total: 0, averageRating: 0, totalComplaints: 0, openCount: 0, resolvedCount: 0 };

/** Feedback type is a category, not a lifecycle status, so it gets a ToneChip. */
function TypeChip({ type }) {
  return type === "COMPLAINT" ? (
    <ToneChip tone="destructive" icon={Flag} size="sm">
      Complaint
    </ToneChip>
  ) : (
    <ToneChip tone="primary" icon={MessageSquareHeart} size="sm">
      Review
    </ToneChip>
  );
}

export default function AdminFeedbackPage() {
  const reduce = useReducedMotion();
  const [feedback, setFeedback] = useState([]);
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [selected, setSelected] = useState(null);
  const [responseText, setResponseText] = useState("");
  const [nextStatus, setNextStatus] = useState("REVIEWED");
  const save = useAsyncAction({ successMs: 700 });

  const loadFeedback = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (typeFilter !== "ALL") params.set("type", typeFilter);
      const data = await authFetch(`/api/admin/feedback${params.toString() ? `?${params.toString()}` : ""}`);
      setFeedback(data.feedback ?? []);
      setSummary(data.summary ?? EMPTY_SUMMARY);
      setLoadError("");
    } catch (error) {
      setLoadError(error.message ?? "Could not load feedback");
      throw error;
    } finally {
      setLoading(false);
    }
  }, [statusFilter, typeFilter]);

  useEffect(() => {
    loadFeedback().catch(() => {});
  }, [loadFeedback]);

  function openRespond(item) {
    setSelected(item);
    setResponseText(item.adminResponse ?? "");
    setNextStatus(item.status === "OPEN" ? "REVIEWED" : item.status);
  }

  async function submitResponse() {
    if (!selected) return;
    try {
      const data = await authFetch(`/api/admin/feedback/${selected.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus, adminResponse: responseText }),
      });
      setFeedback((prev) => prev.map((item) => (item.id === data.feedback.id ? data.feedback : item)));
      notify.success("Response saved");
      setTimeout(() => setSelected(null), 600);
      loadFeedback().catch(() => {});
    } catch (error) {
      notify.error(error.message ?? "Could not save response");
      throw error;
    }
  }

  const avg = Number(summary.averageRating) || 0;

  return (
    <AdminLayout pageTitle="Feedback" description="Ratings and complaints">
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard icon={Star} label="Average rating" value={avg} format={(n) => n.toFixed(1)} tone="gold" loading={loading && !feedback.length && !loadError} />
          <StatCard icon={MessageSquareHeart} label="Reviews" value={summary.total} tone="primary" loading={loading && !feedback.length && !loadError} />
          <StatCard icon={Flag} label="Complaints" value={summary.totalComplaints} tone="destructive" loading={loading && !feedback.length && !loadError} />
          <StatCard icon={Sparkles} label="Resolved" value={summary.resolvedCount} tone="success" loading={loading && !feedback.length && !loadError} />
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <FilterTabs label="Status" options={STATUS_TABS} value={statusFilter} onChange={setStatusFilter} />
          <FilterTabs label="Type" options={TYPE_TABS} value={typeFilter} onChange={setTypeFilter} />
        </div>

        {loadError && !feedback.length ? (
          <ErrorState title="Couldn't load feedback" description={loadError} onRetry={loadFeedback} />
        ) : loading && !feedback.length ? (
          <SkeletonList rows={4} />
        ) : !feedback.length ? (
          <EmptyState illustration="sparkle" title="No feedback here" description={statusFilter !== "ALL" || typeFilter !== "ALL" ? "Try another filter." : "Ratings land here after visits."} />
        ) : (
          <ul className="grid gap-3 lg:grid-cols-2">
            <AnimatePresence initial={false}>
              {feedback.map((item, index) => (
                <motion.li
                  key={item.id}
                  layout={!reduce}
                  initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ ...spring.soft, delay: Math.min(index, 10) * 0.04 }}
                  className="flex min-w-0 flex-col gap-3 rounded-card border border-border/60 bg-card p-4 shadow-soft"
                >
                  <div className="flex items-start gap-3">
                    <AvatarBadge name={item.customerName} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="truncate font-semibold">{item.customerName}</p>
                        <Rating value={Number(item.rating) || 0} className="shrink-0" />
                      </div>
                      <p className="truncate text-caption text-ink-neutral">
                        {item.serviceName || "—"}
                        {item.stylistName ? ` · ${item.stylistName}` : ""} · {dateOf(item.createdAt)}
                      </p>
                    </div>
                  </div>
                  {item.comment ? <p className="text-sm">{item.comment}</p> : null}
                  {item.adminResponse ? (
                    <p className="flex items-start gap-2 rounded-2xl bg-muted/60 px-3 py-2 text-caption">
                      <Reply className="mt-0.5 size-3.5 shrink-0 text-portal" aria-hidden />
                      <span className="min-w-0">{item.adminResponse}</span>
                    </p>
                  ) : null}
                  <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-border/50 pt-3">
                    <div className="flex flex-wrap gap-1.5">
                      <TypeChip type={item.type} />
                      <StatusChip status={item.status} size="sm" />
                    </div>
                    <ButtonLoadingMorph size="sm" variant={item.adminResponse ? "ghost" : "secondary"} icon={item.adminResponse ? MessageCircle : Reply} onClick={() => openRespond(item)}>
                      {item.adminResponse ? "Edit reply" : "Reply"}
                    </ButtonLoadingMorph>
                  </div>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </div>

      <SlideOver
        open={Boolean(selected)}
        onOpenChange={(open) => !open && setSelected(null)}
        title="Reply"
        description={[selected?.customerName, selected?.serviceName].filter(Boolean).join(" · ")}
        icon={Reply}
        size="md"
        footer={
          <ButtonLoadingMorph icon={Send} state={save.state} loadingLabel="Saving…" successLabel="Saved" onClick={() => save.run(submitResponse)}>
            Save reply
          </ButtonLoadingMorph>
        }
      >
        {selected ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Rating value={Number(selected.rating) || 0} />
              <TypeChip type={selected.type} />
            </div>
            {selected.comment ? <p className="rounded-2xl bg-muted/60 p-3 text-sm">{selected.comment}</p> : <p className="text-caption text-ink-neutral">No written comment.</p>}
            <FloatingLabelInput as="textarea" label="Your reply" maxLength={2000} value={responseText} onChange={(e) => setResponseText(e.target.value)} hint={`${responseText.length}/2000 · shown to the customer`} />
            <div className="space-y-2">
              <p className="text-caption font-semibold text-ink-neutral">Mark as</p>
              <FilterTabs label="Mark as" options={STATUS_TABS.filter((t) => t.value !== "ALL")} value={nextStatus} onChange={setNextStatus} size="md" />
            </div>
          </div>
        ) : null}
      </SlideOver>
    </AdminLayout>
  );
}
