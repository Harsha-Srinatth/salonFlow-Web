"use client";

import { AdminLayout } from "../portal/admin-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FilterTabs } from "@/admin/components/filter-tabs";
import { SlideOver } from "@/admin/components/slide-over";
import { StarRating } from "@/components/ui/star-rating";
import { AvatarBadge } from "@/admin/components/avatar-badge";
import { EmptyState } from "@/admin/components/empty-state";
import { ErrorBanner } from "@/admin/components/error-banner";
import { SkeletonRows, SkeletonCards } from "@/admin/components/skeleton";
import { StatCard } from "@/admin/components/stat-card";
import { StatusPill } from "@/admin/components/status-pill";
import { useRevealOnReady } from "@/admin/lib/motion";
import { getFirebaseIdToken } from "@/lib/auth/auth-client";
import { toApiUrl } from "@/lib/api-base";
import { Flag, MessageCircle, MessageSquareHeart, Send, Sparkles, Star } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

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

const STATUS_TABS = ["ALL", "OPEN", "REVIEWED", "RESOLVED"];
const TYPE_TABS = ["ALL", "FEEDBACK", "COMPLAINT"];

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}

export default function AdminFeedbackPage() {
  const [feedback, setFeedback] = useState([]);
  const [summary, setSummary] = useState({ total: 0, averageRating: 0, totalComplaints: 0, openCount: 0, resolvedCount: 0 });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [selected, setSelected] = useState(null);
  const [responseText, setResponseText] = useState("");
  const [nextStatus, setNextStatus] = useState("REVIEWED");
  const [saving, setSaving] = useState(false);
  const listRef = useRevealOnReady([loading, feedback.length, statusFilter, typeFilter], { selector: ":scope > *" });

  async function loadFeedback() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (typeFilter !== "ALL") params.set("type", typeFilter);
      const data = await authFetch(`/api/admin/feedback${params.toString() ? `?${params.toString()}` : ""}`);
      setFeedback(data.feedback ?? []);
      setSummary(data.summary ?? { total: 0, averageRating: 0, totalComplaints: 0, openCount: 0, resolvedCount: 0 });
      setLoadError("");
    } catch (error) {
      const message = error.message ?? "Could not load feedback";
      toast.error(message);
      setLoadError(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadFeedback();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, typeFilter]);

  function openRespond(item) {
    setSelected(item);
    setResponseText(item.adminResponse ?? "");
    setNextStatus(item.status === "OPEN" ? "REVIEWED" : item.status);
  }

  function closeRespond() {
    setSelected(null);
    setResponseText("");
  }

  async function submitResponse() {
    if (!selected) return;
    setSaving(true);
    try {
      const data = await authFetch(`/api/admin/feedback/${selected.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus, adminResponse: responseText }),
      });
      setFeedback((prev) => prev.map((item) => (item.id === data.feedback.id ? data.feedback : item)));
      toast.success("Response saved");
      closeRespond();
      void loadFeedback();
    } catch (error) {
      toast.error(error.message ?? "Could not save response");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminLayout
      pageTitle="Feedback & Reviews"
      description="What customers are saying after every visit — respond and close the loop."
    >
      <div className="space-y-4">
        <ErrorBanner message={loadError} onRetry={loadFeedback} />

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={Star} label="Average rating" value={summary.averageRating} display={`${summary.averageRating.toFixed(1)} ★`} tone="accent" />
          <StatCard icon={MessageSquareHeart} label="Total reviews" value={summary.total} tone="primary" delay={60} />
          <StatCard icon={Flag} label="Complaints" value={summary.totalComplaints} tone="destructive" delay={120} />
          <StatCard icon={Sparkles} label="Resolved" value={summary.resolvedCount} tone="success" delay={180} />
        </div>

        <Card className="admin-shadow-sm">
          <CardHeader className="space-y-3">
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="size-5" />
              Customer feedback
            </CardTitle>
            <FilterTabs label="Status" options={STATUS_TABS} value={statusFilter} onChange={setStatusFilter} />
            <FilterTabs label="Type" variant="soft" options={TYPE_TABS.map((t) => ({ value: t, label: t === "ALL" ? "All types" : t === "COMPLAINT" ? "Complaints" : "Feedback" }))} value={typeFilter} onChange={setTypeFilter} />
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? <SkeletonRows count={4} /> : null}
            {!loading && feedback.length === 0 ? (
              <EmptyState
                icon={MessageSquareHeart}
                title="No feedback yet"
                description="Once customers rate completed visits, their reviews and complaints will show up here."
              />
            ) : null}
            <div ref={listRef} className="space-y-2.5">
              {feedback.map((item) => (
                <div
                  key={item.id}
                  className="admin-card-hover admin-shadow-sm flex flex-col gap-3 rounded-xl border border-border/70 bg-card p-4 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <AvatarBadge name={item.customerName} />
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{item.customerName}</p>
                        <StatusPill status={item.type} />
                        <StatusPill status={item.status} />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {item.serviceName || "—"} {item.stylistName ? `· with ${item.stylistName}` : ""} · {formatDate(item.createdAt)}
                      </p>
                      <StarRating value={item.rating} readOnly size="sm" />
                      {item.comment ? <p className="max-w-xl text-sm text-foreground/90">{item.comment}</p> : null}
                      {item.adminResponse ? (
                        <p className="max-w-xl rounded-md bg-muted/50 px-2.5 py-1.5 text-xs text-muted-foreground">
                          <span className="font-semibold text-foreground">Salon reply:</span> {item.adminResponse}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <Button type="button" size="sm" variant="outline" className="shrink-0" onClick={() => openRespond(item)}>
                    {item.adminResponse ? "Edit response" : "Respond"}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <SlideOver
        open={Boolean(selected)}
        onOpenChange={(open) => !open && closeRespond()}
        title="Respond to feedback"
        description={`${selected?.customerName ? `From ${selected.customerName}` : ""} ${selected?.serviceName ? `· ${selected.serviceName}` : ""}`.trim()}
        footer={
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={closeRespond}>
              Close
            </Button>
            <Button type="button" disabled={saving} onClick={() => void submitResponse()}>
              <Send className="size-4" />
              {saving ? "Saving..." : "Save response"}
            </Button>
          </div>
        }
      >
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          {selected ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <StarRating value={selected.rating} readOnly />
                <StatusPill status={selected.type} />
              </div>
              {selected.comment ? (
                <p className="rounded-lg border border-border/60 bg-muted/30 p-3 text-sm">{selected.comment}</p>
              ) : (
                <p className="text-sm text-muted-foreground">No written comment was left.</p>
              )}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground" htmlFor="admin-response">
                  Your reply (optional, visible to the customer later)
                </label>
                <textarea
                  id="admin-response"
                  rows={4}
                  maxLength={2000}
                  value={responseText}
                  onChange={(e) => setResponseText(e.target.value)}
                  placeholder="Thank you for the feedback — here's what we're doing about it..."
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                />
              </div>
              <div className="space-y-1.5">
                <p className="text-sm font-medium text-foreground">Mark as</p>
                <FilterTabs label="Mark as" options={["OPEN", "REVIEWED", "RESOLVED"]} value={nextStatus} onChange={setNextStatus} />
              </div>
            </div>
          ) : null}
        </div>
      </SlideOver>
    </AdminLayout>
  );
}
