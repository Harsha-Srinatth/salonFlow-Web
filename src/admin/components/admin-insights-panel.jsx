"use client";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowUp, Bot, CircleAlert, Lightbulb, PenLine, PlugZap, Sparkles, Headset } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { BrandDots, ErrorState, IconButton } from "@/components/kit";
import { SkeletonText, spring } from "@/components/motion";
import { apiJson } from "@/lib/api-json";
import { cn } from "@/lib/utils";
import { ToneChip } from "./tone-chip";
import { Panel } from "./panel";

const QUESTIONS = ["How did the last 7 days go?", "No-show rate this month?", "Which services need photos?"];
const AGENT_ICON = { "support-assistant": Headset, "admin-insights": Lightbulb, "service-content": PenLine };

/**
 * Replies arrive whole (the endpoint isn't streamed), so they are revealed word by word, like a
 * stream. Reduced motion shows the full text at once.
 */
function RevealText({ text }) {
  const reduce = useReducedMotion();
  const words = `${text ?? ""}`.split(/(\s+)/);
  if (reduce || words.length > 400) return <>{text}</>;
  return words.map((w, i) => (
    <motion.span key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.16, delay: Math.min(i, 240) * 0.012 }}>
      {w}
    </motion.span>
  ));
}

/**
 * Admin AI panel: which agents exist, whether the model is configured, recent usage, and the
 * read-only insights assistant (aggregated metrics only; it cannot change anything).
 */
export function AdminInsightsPanel() {
  const reduce = useReducedMotion();
  const [overview, setOverview] = useState(null);
  const [overviewError, setOverviewError] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);
  const abortRef = useRef(null);
  const listRef = useRef(null);

  const loadOverview = useCallback(async () => {
    setOverviewError(null);
    try {
      setOverview(await apiJson("/api/admin/agents", { auth: true }));
    } catch (err) {
      setOverviewError(err.message);
      throw err;
    }
  }, []);

  useEffect(() => {
    loadOverview().catch(() => {});
    return () => abortRef.current?.abort();
  }, [loadOverview]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: reduce ? "auto" : "smooth" });
  }, [messages.length, pending, reduce]);

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
  const checking = overview === null && !overviewError;

  return (
    <Panel
      title="AI assistants"
      icon={Sparkles}
      subtitle={checking ? "Checking…" : configured ? `Connected · ${overview.model}` : overviewError ? "Status unknown" : "Basic mode"}
      action={
        checking ? null : configured ? (
          <ToneChip tone="success" icon={PlugZap} size="sm">
            On
          </ToneChip>
        ) : (
          <ToneChip tone="warning" icon={PlugZap} size="sm">
            Off
          </ToneChip>
        )
      }
      bodyClassName="space-y-4 p-4"
    >
      {overviewError ? <ErrorState compact title="Couldn't reach the assistants" description={overviewError} onRetry={loadOverview} className="bg-transparent" /> : null}
      {checking ? <SkeletonText lines={3} /> : null}
      {overview && !configured ? (
        <p className="flex items-start gap-2 rounded-2xl bg-warning/14 p-3 text-caption text-ink-warning ring-1 ring-inset ring-warning/30">
          <CircleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          <span>Customer assistant gives fixed answers from your data. Set ANTHROPIC_API_KEY on the server for full AI.</span>
        </p>
      ) : null}

      {overview?.agents?.length ? (
        <ul className="space-y-2">
          {overview.agents.map((agent) => {
            const usage = (overview.usageLast7Days ?? []).filter((row) => row.agent_id === agent.id);
            const runs = usage.reduce((sum, row) => sum + row.runs, 0);
            const problems = usage.reduce((sum, row) => sum + row.problems, 0);
            const Icon = AGENT_ICON[agent.id] ?? Bot;
            return (
              <li key={agent.id} className="flex items-start gap-3 rounded-2xl bg-muted/50 p-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-card text-portal">
                  <Icon className="size-4" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{agent.id}</p>
                  <p className="text-caption text-ink-neutral">{agent.responsibility}</p>
                  <p className="mt-1 text-[11px] font-semibold text-ink-neutral tabular-nums">
                    7d · {runs} run{runs === 1 ? "" : "s"}
                    {problems ? <span className="text-ink-warning"> · {problems} unanswered</span> : null}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}

      {configured ? (
        <div className="space-y-3 border-t border-border/60 pt-4">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <Bot className="size-4 text-portal" aria-hidden /> Ask about your numbers
          </p>
          <div ref={listRef} className="admin-scrollbar max-h-80 space-y-2 overflow-y-auto" aria-live="polite">
            {!messages.length ? (
              <div className="flex flex-wrap gap-1.5">
                {QUESTIONS.map((q) => (
                  <button key={q} type="button" onClick={() => send(q)} className="tap min-h-9 rounded-full bg-portal/10 px-3 py-1.5 text-left text-caption font-semibold text-portal transition-colors hover:bg-portal/16">
                    {q}
                  </button>
                ))}
              </div>
            ) : null}
            <AnimatePresence initial={false}>
              {messages.map((message, i) => (
                <motion.div
                  key={i}
                  initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={spring.soft}
                  className={cn("whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm", message.role === "user" ? "ml-8 rounded-br-md bg-portal text-portal-foreground" : "mr-4 rounded-bl-md bg-muted")}
                >
                  {message.role === "assistant" && i === messages.length - 1 ? <RevealText text={message.content} /> : message.content}
                </motion.div>
              ))}
              {pending ? (
                <motion.div key="typing" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mr-4 inline-flex items-center gap-2 rounded-2xl rounded-bl-md bg-muted px-3 py-2.5" role="status">
                  <BrandDots size={6} />
                  <span className="sr-only">Thinking</span>
                </motion.div>
              ) : null}
            </AnimatePresence>
            {error ? (
              <div role="alert" className="flex items-center justify-between gap-2 rounded-2xl bg-destructive/12 p-2.5 pl-3 text-caption font-semibold text-ink-destructive">
                <span className="min-w-0">{error}</span>
                <button type="button" className="tap shrink-0 rounded-full px-2 py-1 underline" onClick={() => void ask(messages)}>
                  Retry
                </button>
              </div>
            ) : null}
          </div>
          <form
            className="flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
          >
            <input
              value={input}
              maxLength={1000}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Why were bookings down?"
              aria-label="Question about your business"
              className="h-11 min-w-0 flex-1 rounded-control bg-muted/60 px-3.5 text-sm outline-none placeholder:text-ink-neutral focus-visible:ring-2 focus-visible:ring-portal"
            />
            <IconButton type="submit" icon={ArrowUp} label="Ask" variant="solid" disabled={!input.trim() || pending} />
          </form>
          <p className="text-[11px] text-ink-neutral">Aggregates only. Check key figures in Revenue.</p>
        </div>
      ) : null}
    </Panel>
  );
}
