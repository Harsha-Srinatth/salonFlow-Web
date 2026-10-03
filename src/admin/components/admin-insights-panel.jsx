"use client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { apiJson } from "@/lib/api-json";
import { cn } from "@/lib/utils";
import { ArrowUp, Bot, RefreshCw, Sparkles } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

const QUESTIONS = ["How did we do in the last 7 days?", "What is our no-show rate this month?", "Which services need photos or details?"];

/**
 * Admin AI panel: which agents exist, whether the model is configured, recent usage, and the
 * read-only insights assistant (aggregated metrics only; it cannot change anything).
 */
export function AdminInsightsPanel() {
  const [overview, setOverview] = useState(null);
  const [overviewError, setOverviewError] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);
  const abortRef = useRef(null);

  const loadOverview = useCallback(async () => {
    setOverviewError(null);
    try {
      setOverview(await apiJson("/api/admin/agents", { auth: true }));
    } catch (err) {
      setOverviewError(err.message);
    }
  }, []);

  useEffect(() => {
    void loadOverview();
    return () => abortRef.current?.abort();
  }, [loadOverview]);

  async function ask(history) {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setPending(true);
    setError(null);
    try {
      const data = await apiJson("/api/admin/agents/insights", {
        method: "POST",
        auth: true,
        signal: controller.signal,
        timeoutMs: 90_000,
        body: { messages: history.slice(-12) },
      });
      setMessages((current) => [...current, { role: "assistant", content: data.reply }]);
    } catch (err) {
      if (!err.cancelled) setError(err.message);
    } finally {
      if (abortRef.current === controller) setPending(false);
    }
  }

  function send(text) {
    const content = `${text}`.trim().slice(0, 1000);
    if (!content || pending) return;
    const next = [...messages, { role: "user", content }];
    setMessages(next);
    setInput("");
    void ask(next);
  }

  const configured = overview?.llmConfigured;

  return (
    <Card className="admin-shadow-sm h-fit xl:sticky xl:top-24">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="size-5 text-primary" /> AI assistants
        </CardTitle>
        <CardDescription>
          {overview === null && !overviewError
            ? "Checking…"
            : configured
              ? `Connected (${overview.model}). The customer assistant answers from your live data.`
              : "Not connected: the customer assistant runs in basic mode (fixed answers from your data). Set ANTHROPIC_API_KEY on the server to enable full AI answers, insights and drafting."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {overviewError ? (
          <p className="text-sm text-destructive">
            {overviewError}{" "}
            <button type="button" className="underline" onClick={() => void loadOverview()}>
              Retry
            </button>
          </p>
        ) : null}
        {overview === null && !overviewError ? <Skeleton className="h-16 w-full" /> : null}
        {overview?.agents?.length ? (
          <ul className="space-y-2 text-xs">
            {overview.agents.map((agent) => {
              const usage = (overview.usageLast7Days ?? []).filter((row) => row.agent_id === agent.id);
              const runs = usage.reduce((sum, row) => sum + row.runs, 0);
              const problems = usage.reduce((sum, row) => sum + row.problems, 0);
              return (
                <li key={agent.id} className="rounded-lg bg-secondary/60 p-2.5">
                  <p className="font-semibold">{agent.id}</p>
                  <p className="text-muted-foreground">{agent.responsibility}</p>
                  <p className="mt-1 text-muted-foreground">
                    Last 7 days: {runs} run{runs === 1 ? "" : "s"}
                    {problems ? ` · ${problems} unanswered/failed` : ""}
                  </p>
                </li>
              );
            })}
          </ul>
        ) : null}

        <div className="space-y-2 border-t border-border pt-4">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <Bot className="size-4 text-primary" /> Ask about your business
          </p>
          {!configured && overview ? (
            <p className="text-xs text-muted-foreground">Available once the AI key is configured.</p>
          ) : (
            <>
              <div className="max-h-80 space-y-2 overflow-y-auto" aria-live="polite">
                {!messages.length ? (
                  <div className="flex flex-wrap gap-1.5">
                    {QUESTIONS.map((q) => (
                      <button key={q} type="button" onClick={() => send(q)} className="rounded-full bg-secondary px-3 py-1.5 text-left text-xs font-medium">
                        {q}
                      </button>
                    ))}
                  </div>
                ) : null}
                {messages.map((message, i) => (
                  <div
                    key={i}
                    className={cn(
                      "whitespace-pre-wrap rounded-xl px-3 py-2 text-sm",
                      message.role === "user" ? "ml-8 bg-primary text-primary-foreground" : "mr-4 bg-secondary"
                    )}
                  >
                    {message.content}
                  </div>
                ))}
                {pending ? <Skeleton className="mr-4 h-12 rounded-xl" /> : null}
                {error ? (
                  <p role="alert" className="text-sm text-destructive">
                    {error}{" "}
                    <button type="button" className="inline-flex items-center gap-1 underline" onClick={() => void ask(messages)}>
                      <RefreshCw className="size-3" /> Retry
                    </button>
                  </p>
                ) : null}
              </div>
              <form
                className="flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  send(input);
                }}
              >
                <input
                  value={input}
                  maxLength={1000}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="e.g. Why were bookings down?"
                  aria-label="Question about your business"
                  className="h-10 min-w-0 flex-1 rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                />
                <Button type="submit" size="icon" disabled={!input.trim() || pending} aria-label="Ask">
                  <ArrowUp className="size-4" />
                </Button>
              </form>
              <p className="text-[11px] text-muted-foreground">Uses aggregated numbers only. Check important figures in Reports.</p>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
