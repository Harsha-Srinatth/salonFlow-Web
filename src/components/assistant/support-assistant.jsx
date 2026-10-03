"use client";

import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { apiJson } from "@/lib/api-json";
import { cn } from "@/lib/utils";
import { setCustomerBookingField } from "@/store/customer-bookings-slice";
import { ArrowUp, Bot, Check, LogIn, MessageCircleQuestion, Plus, RefreshCw, RotateCcw, WifiOff } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useMediaQuery } from "@/lib/use-media-query";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";

const MAX_INPUT = 1000;
const HISTORY_SENT = 12; // matches the server's cap
const HISTORY_KEPT = 40;

const SUGGESTIONS = {
  guest: ["What are your opening hours?", "How much is a haircut?", "Do you have any offers?", "What is your cancellation policy?"],
  customer: ["Any free slots this evening?", "Show my upcoming bookings", "Which facial suits dry skin?", "What is your cancellation policy?"],
};

function loadHistory(key) {
  try {
    const value = JSON.parse(sessionStorage.getItem(key) ?? "[]");
    return Array.isArray(value) ? value.filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string") : [];
  } catch {
    return [];
  }
}

/** Plain text with clickable https links; never renders HTML from the server. */
function MessageText({ text }) {
  const parts = `${text}`.split(/(https:\/\/[^\s)]+)/g);
  return (
    <p className="whitespace-pre-wrap break-words">
      {parts.map((part, i) =>
        /^https:\/\//.test(part) ? (
          <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="font-medium underline underline-offset-2">
            {part.replace(/^https:\/\/(www\.)?/, "").slice(0, 40)}
          </a>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </p>
  );
}

function AddServicesAction({ action, isCustomer, onDone }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const selectedIds = useSelector((state) => state.customerBookings.bookingForm.serviceIds);
  const ids = action.services.map((service) => service.id);
  const allAdded = ids.every((id) => selectedIds.includes(id));
  const names = action.services.map((service) => service.name).join(", ");

  if (!isCustomer) {
    return (
      <Link
        to="/auth/login"
        className="mt-2 inline-flex h-10 items-center gap-2 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground"
      >
        <LogIn className="size-4" /> Sign in to book {names}
      </Link>
    );
  }
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      <button
        type="button"
        disabled={allAdded}
        onClick={() => dispatch(setCustomerBookingField({ field: "serviceIds", value: [...selectedIds, ...ids] }))}
        className={cn(
          "inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold",
          allAdded ? "bg-success/15 text-success" : "bg-primary text-primary-foreground"
        )}
      >
        {allAdded ? <Check className="size-4" /> : <Plus className="size-4" />}
        {allAdded ? `Added: ${names}` : `Add ${names} to booking`}
      </button>
      {allAdded ? (
        <button
          type="button"
          onClick={() => {
            onDone();
            navigate("/user-dashboard/appointments");
          }}
          className="inline-flex h-10 items-center rounded-full bg-secondary px-4 text-sm font-semibold"
        >
          Go to booking
        </button>
      ) : null}
    </div>
  );
}

/**
 * Business support assistant. Answers from the salon's live data (the server decides what it may
 * see; signed-in customers also get their own bookings). `variant="landing"` renders a floating
 * button for visitors; `variant="portal"` renders an icon button for the customer portal header.
 */
export function SupportAssistant({ variant = "portal", isCustomer = false, triggerClassName = "" }) {
  const storageKey = `sahasra.assistant.v1.${isCustomer ? "customer" : "guest"}`;
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState(() => loadHistory(storageKey));
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null); // { message, retryable }
  const [basicMode, setBasicMode] = useState(false);
  const abortRef = useRef(null);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const wide = useMediaQuery("(min-width: 640px)");

  useEffect(() => {
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(messages.slice(-HISTORY_KEPT).map(({ role, content }) => ({ role, content }))));
    } catch {
      /* storage blocked: history lasts for this page view only */
    }
  }, [messages, storageKey]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, pending, error]);

  // Closing the panel cancels an in-flight answer so it can't land in a closed chat.
  useEffect(() => {
    if (!open) abortRef.current?.abort();
  }, [open]);
  useEffect(() => () => abortRef.current?.abort(), []);

  const ask = useCallback(
    async (history) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setPending(true);
      setError(null);
      try {
        const data = await apiJson("/api/assistant/chat", {
          method: "POST",
          auth: isCustomer,
          signal: controller.signal,
          timeoutMs: 60_000,
          body: { messages: history.slice(-HISTORY_SENT).map(({ role, content }) => ({ role, content })) },
        });
        setBasicMode(data.mode === "basic");
        setMessages((current) => [...current, { role: "assistant", content: `${data.reply ?? ""}`, actions: data.actions ?? [] }]);
      } catch (err) {
        if (err.cancelled) return;
        setError({
          message: err.message,
          offline: err.status === 0 && typeof navigator !== "undefined" && navigator.onLine === false,
          retryable: err.status !== 400,
        });
      } finally {
        if (abortRef.current === controller) {
          abortRef.current = null;
          setPending(false);
        }
      }
    },
    [isCustomer]
  );

  function send(text) {
    const content = `${text ?? ""}`.trim().slice(0, MAX_INPUT);
    if (!content || pending) return;
    const next = [...messages, { role: "user", content }];
    setMessages(next);
    setInput("");
    void ask(next);
  }

  function retry() {
    if (messages[messages.length - 1]?.role === "user") void ask(messages);
  }

  function reset() {
    abortRef.current?.abort();
    setMessages([]);
    setError(null);
    setPending(false);
    inputRef.current?.focus();
  }

  const suggestions = SUGGESTIONS[isCustomer ? "customer" : "guest"];
  const trigger =
    variant === "landing" ? (
      <button
        type="button"
        aria-label="Ask a question"
        className={cn(
          "fixed bottom-5 right-5 z-40 flex h-14 items-center gap-2 rounded-full bg-primary pl-4 pr-5 text-sm font-semibold text-primary-foreground shadow-xl shadow-black/20 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 pb-[env(safe-area-inset-bottom)]",
          triggerClassName
        )}
      >
        <MessageCircleQuestion className="size-6" />
        <span className="hidden sm:inline">Ask us</span>
      </button>
    ) : (
      <button
        type="button"
        aria-label="Help and questions"
        className={cn(
          "grid size-10 shrink-0 place-items-center rounded-full text-muted-foreground outline-none hover:bg-secondary focus-visible:ring-[3px] focus-visible:ring-ring/50",
          triggerClassName
        )}
      >
        <MessageCircleQuestion className="size-5" />
      </button>
    );

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent
        side={wide ? "right" : "bottom"}
        className={cn("gap-0 p-0", wide ? "w-[26rem] max-w-[100vw]" : "h-[85dvh] pb-0")}
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          if (wide) inputRef.current?.focus();
        }}
      >
        <header className="flex items-center gap-3 border-b border-border px-4 py-3">
          <span className="grid size-10 place-items-center rounded-full bg-primary/10 text-primary">
            <Bot className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <SheetTitle className="font-display text-base font-semibold">Ask the salon</SheetTitle>
            <SheetDescription className="truncate text-xs text-muted-foreground">
              {basicMode ? "Quick answers mode · from salon info" : "Answers from the salon's own information"}
            </SheetDescription>
          </div>
          {messages.length ? (
            <button type="button" onClick={reset} className="grid size-9 place-items-center rounded-full hover:bg-secondary" aria-label="Start a new conversation">
              <RotateCcw className="size-4" />
            </button>
          ) : null}
        </header>

        <div ref={scrollRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-4" aria-live="polite">
          {!messages.length ? (
            <div className="space-y-4 py-2">
              <p className="text-sm text-muted-foreground">
                Hi! Ask about services, prices, offers, timings, availability or our policies.
                {isCustomer ? " I can also check your bookings." : ""}
              </p>
              <div className="flex flex-col items-start gap-2">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => send(suggestion)}
                    className="rounded-2xl bg-secondary px-3.5 py-2 text-left text-sm font-medium hover:bg-secondary/70"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {messages.map((message, i) => (
            <div key={i} className={cn("flex", message.role === "user" ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-6",
                  message.role === "user" ? "rounded-br-md bg-primary text-primary-foreground" : "rounded-bl-md bg-secondary text-foreground"
                )}
              >
                <MessageText text={message.content} />
                {(message.actions ?? [])
                  .filter((action) => action.type === "ADD_SERVICES_TO_BOOKING" && action.services?.length)
                  .map((action, j) => (
                    <AddServicesAction key={j} action={action} isCustomer={isCustomer} onDone={() => setOpen(false)} />
                  ))}
              </div>
            </div>
          ))}

          {pending ? (
            <div className="flex justify-start" role="status" aria-label="Assistant is typing">
              <div className="flex gap-1 rounded-2xl rounded-bl-md bg-secondary px-4 py-3.5">
                {[0, 150, 300].map((delay) => (
                  <span key={delay} className="size-2 animate-bounce rounded-full bg-muted-foreground/60" style={{ animationDelay: `${delay}ms` }} />
                ))}
              </div>
            </div>
          ) : null}

          {error ? (
            <div role="alert" className="flex items-start gap-2 rounded-2xl bg-destructive/10 p-3 text-sm">
              {error.offline ? <WifiOff className="mt-0.5 size-4 shrink-0" /> : null}
              <div className="flex-1">
                <p>{error.message}</p>
                {error.retryable ? (
                  <button type="button" onClick={retry} className="mt-1.5 inline-flex items-center gap-1.5 font-semibold underline-offset-2 hover:underline">
                    <RefreshCw className="size-3.5" /> Try again
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>

        <form
          className="border-t border-border p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
          onSubmit={(event) => {
            event.preventDefault();
            send(input);
          }}
        >
          <div className="flex items-end gap-2 rounded-3xl bg-secondary p-1.5 pl-4">
            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              maxLength={MAX_INPUT}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                  event.preventDefault();
                  send(input);
                }
              }}
              placeholder="Type your question"
              aria-label="Your question"
              className="max-h-32 min-h-10 flex-1 resize-none bg-transparent py-2 text-base outline-none sm:text-sm"
            />
            <button
              type="submit"
              disabled={!input.trim() || pending}
              aria-label="Send"
              className="grid size-10 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground disabled:opacity-40"
            >
              <ArrowUp className="size-5" />
            </button>
          </div>
          <p className="mt-1.5 px-2 text-[11px] text-muted-foreground">
            Automated answers from salon information. For anything it can't answer, please contact the salon.
          </p>
        </form>
      </SheetContent>
    </Sheet>
  );
}
