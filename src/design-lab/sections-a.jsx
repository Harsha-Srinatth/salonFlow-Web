import { useState } from "react";
import { motion } from "motion/react";
import { Bell, CalendarCheck, Gift, Layers, Loader, Megaphone, Palette, RefreshCw, Save, Sparkles, Trash2, Wand2, Wifi } from "lucide-react";
import { notify } from "@/lib/notify";
import { formatMoney } from "@/lib/format";
import { duration, ease, spring, stagger } from "@/components/motion/presets";
import {
  AnimatedCounter,
  ConfettiBurst,
  FadeIn,
  SkeletonCard,
  SkeletonList,
  SkeletonSlots,
  SkeletonStat,
  SkeletonTable,
  SkeletonText,
  Stagger,
  StaggerItem,
  SuccessBurst,
} from "@/components/motion";
import { BrandLoader, ButtonLoadingMorph, OfflineBanner, PullToRefresh, RouteLoader, useAsyncAction } from "@/components/kit";
import { Grid, Row, Section, Specimen, wait } from "./lab-ui";

const SWATCHES = ["background", "card", "muted", "secondary", "primary", "accent", "success", "warning", "destructive", "info", "plum", "gold", "border"];

export function Foundations() {
  const [replay, setReplay] = useState(0);
  return (
    <Section id="foundations" title="Foundations" icon={Palette}>
      <Specimen title="Colour tokens (hsl(var(--token)))" wide>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-7">
          {SWATCHES.map((s) => (
            <div key={s} className="space-y-1.5">
              <div className="h-14 rounded-2xl ring-1 ring-inset ring-border/60" style={{ background: `hsl(var(--${s}))` }} />
              <p className="truncate text-micro font-semibold">--{s}</p>
            </div>
          ))}
          <div className="space-y-1.5">
            <div className="h-14 rounded-2xl bg-portal shadow-glow" />
            <p className="truncate text-micro font-semibold">--portal-accent</p>
          </div>
        </div>
      </Specimen>
      <Grid>
        <Specimen title="Typography scale">
          <div className="space-y-2">
            <p className="font-display text-display-lg font-bold">Display</p>
            <p className="font-display text-title font-bold">Title</p>
            <p className="text-headline font-semibold">Headline</p>
            <p className="text-body">Body — Figtree 15/1.55</p>
            <p className="text-caption text-ink-neutral">Caption</p>
            <p className="text-micro font-semibold uppercase text-ink-neutral">Micro</p>
          </div>
        </Specimen>
        <Specimen title="Surfaces">
          <div className="grid h-44 place-items-center rounded-card bg-muted">
            <div className="glass-strong rounded-2xl px-5 py-3 text-sm font-semibold">glass-strong (solid)</div>
          </div>
        </Specimen>
        <Specimen title="Elevation & radii">
          <Row>
            {["shadow-soft", "shadow-lift", "shadow-float", "shadow-glow"].map((s) => (
              <div key={s} className={`grid h-16 w-24 place-items-center rounded-card bg-card text-micro font-semibold ${s}`}>
                {s.replace("shadow-", "")}
              </div>
            ))}
          </Row>
          <Row className="mt-4">
            {["rounded-chip", "rounded-control", "rounded-card", "rounded-sheet", "rounded-blob"].map((r) => (
              <div key={r} className={`grid size-16 place-items-center bg-portal/15 text-[10px] font-semibold ${r}`}>
                {r.replace("rounded-", "")}
              </div>
            ))}
          </Row>
        </Specimen>
        <Specimen title="Motion presets (tap to replay)" wide>
          <button type="button" onClick={() => setReplay((n) => n + 1)} className="mb-3 inline-flex h-9 items-center gap-2 rounded-full bg-muted px-3 text-caption font-semibold">
            <RefreshCw className="size-3.5" aria-hidden /> Replay
          </button>
          <div className="space-y-2.5">
            {Object.entries(spring).map(([name, t]) => (
              <div key={name} className="flex items-center gap-3">
                <span className="w-20 text-caption font-semibold">spring.{name}</span>
                <div className="relative h-8 flex-1 rounded-full bg-muted" style={{ containerType: "inline-size" }}>
                  <motion.span key={`${name}-${replay}`} className="absolute top-1 left-1 size-6 rounded-full bg-portal" initial={{ x: 0 }} animate={{ x: "calc(100cqw - 2rem)" }} transition={t} />
                </div>
              </div>
            ))}
            <p className="text-caption text-ink-neutral">
              ease.out [{ease.out.join(", ")}] · durations {Object.entries(duration).map(([k, v]) => `${k} ${v}s`).join(" · ")} · stagger {Object.entries(stagger).map(([k, v]) => `${k} ${v}s`).join(" · ")}
            </p>
          </div>
        </Specimen>
      </Grid>
    </Section>
  );
}

export function MotionSection() {
  const [count, setCount] = useState(1280);
  const [burst, setBurst] = useState(0);
  const [success, setSuccess] = useState(0);
  return (
    <Section id="motion" title="Motion primitives" icon={Wand2}>
      <Grid>
        <Specimen title="FadeIn · Stagger">
          <FadeIn key={`f${burst}`} className="mb-3 rounded-2xl bg-muted p-3 text-sm font-semibold">FadeIn (up)</FadeIn>
          <Stagger key={`s${burst}`} className="grid grid-cols-4 gap-2">
            {Array.from({ length: 8 }, (_, i) => (
              <StaggerItem key={i} className="h-10 rounded-xl bg-portal/20" />
            ))}
          </Stagger>
        </Specimen>
        <Specimen title="AnimatedCounter">
          <AnimatedCounter value={count} format={(n) => formatMoney(n)} className="font-display text-display-lg font-bold" />
          <Row className="mt-3">
            <button type="button" className="h-9 rounded-full bg-muted px-3 text-caption font-semibold" onClick={() => setCount((c) => c + Math.round(Math.random() * 900))}>
              Add
            </button>
          </Row>
        </Specimen>
        <Specimen title="ConfettiBurst · SuccessBurst">
          <Row>
            <div className="relative">
              <ButtonLoadingMorph variant="gold" icon={Gift} onClick={() => setBurst((n) => n + 1)}>
                Confetti
              </ButtonLoadingMorph>
              <ConfettiBurst trigger={burst} />
            </div>
            <button type="button" onClick={() => setSuccess((n) => n + 1)} aria-label="Replay success burst">
              <SuccessBurst key={success} size={64} />
            </button>
          </Row>
        </Specimen>
        <Specimen title="SkeletonShimmer layouts" state="loading" wide>
          <div className="grid gap-4 md:grid-cols-3">
            <SkeletonStat />
            <SkeletonCard />
            <div className="space-y-4">
              <SkeletonText />
              <SkeletonList rows={2} />
            </div>
            <SkeletonTable rows={3} className="md:col-span-2" />
            <SkeletonSlots />
          </div>
        </Specimen>
      </Grid>
    </Section>
  );
}

function AsyncDemo({ fail = false, label, icon }) {
  const { state, run } = useAsyncAction();
  return (
    <ButtonLoadingMorph
      icon={icon}
      state={state}
      onClick={() =>
        run(async () => {
          await wait(1200);
          if (fail) throw new Error("Nope");
        })
      }
      variant={fail ? "danger" : "primary"}
    >
      {label}
    </ButtonLoadingMorph>
  );
}

export function Loaders() {
  const [showRoute, setShowRoute] = useState(false);
  const [refreshed, setRefreshed] = useState(0);
  return (
    <Section id="loaders" title="Loaders" icon={Loader}>
      <Grid>
        <Specimen title="BrandLoader · scissors (xs → xl)">
          <Row className="items-end">
            {["xs", "sm", "md", "lg", "xl"].map((s) => (
              <BrandLoader key={s} size={s} hideLabel label={`Loading ${s}`} />
            ))}
          </Row>
        </Specimen>
        <Specimen title="BrandLoader · blob / dots">
          <Row className="justify-around">
            <BrandLoader variant="blob" size="lg" label="Blob" />
            <BrandLoader variant="dots" size="md" label="Dots" />
          </Row>
        </Specimen>
        <Specimen title="RouteLoader (Suspense fallback)">
          <button type="button" className="h-9 rounded-full bg-muted px-3 text-caption font-semibold" onClick={() => setShowRoute((v) => !v)}>
            {showRoute ? "Hide" : "Show"} route loader
          </button>
          {showRoute ? <RouteLoader className="min-h-40" delay={0} /> : null}
        </Specimen>
        <Specimen title="ButtonLoadingMorph — every state" wide>
          <Row>
            <ButtonLoadingMorph icon={Save}>Idle</ButtonLoadingMorph>
            <ButtonLoadingMorph state="loading">Loading</ButtonLoadingMorph>
            <ButtonLoadingMorph state="success" successLabel="Saved">
              Success
            </ButtonLoadingMorph>
            <ButtonLoadingMorph state="error">Error</ButtonLoadingMorph>
            <ButtonLoadingMorph disabled>Disabled</ButtonLoadingMorph>
            {["secondary", "outline", "ghost", "gold"].map((v) => (
              <ButtonLoadingMorph key={v} variant={v}>
                {v}
              </ButtonLoadingMorph>
            ))}
          </Row>
          <Row className="mt-3">
            <AsyncDemo label="Save (succeeds)" icon={CalendarCheck} />
            <AsyncDemo label="Delete (fails)" icon={Trash2} fail />
            <ButtonLoadingMorph size="sm">Small</ButtonLoadingMorph>
            <ButtonLoadingMorph size="lg">Large</ButtonLoadingMorph>
          </Row>
        </Specimen>
        <Specimen title="PullToRefresh (touch: pull the page down at the top)" wide>
          <PullToRefresh onRefresh={() => wait(1400).then(() => setRefreshed((n) => n + 1))}>
            <div className="rounded-2xl bg-muted p-4 text-sm">Refreshed {refreshed}×. On a phone, scroll to the top and pull.</div>
          </PullToRefresh>
        </Specimen>
      </Grid>
    </Section>
  );
}

export function Feedback() {
  const [offline, setOffline] = useState(false);
  return (
    <Section id="feedback" title="Toasts & feedback" icon={Bell}>
      <Grid>
        <Specimen title="notify.* — personality per type" wide>
          <Row>
            <ButtonLoadingMorph variant="outline" onClick={() => notify.success("Booking confirmed", { description: "Sat, 11 Oct · 4:30 pm" })}>
              Success
            </ButtonLoadingMorph>
            <ButtonLoadingMorph variant="outline" onClick={() => notify.error("Payment failed", { description: "Your bank declined it." })}>
              Error
            </ButtonLoadingMorph>
            <ButtonLoadingMorph variant="outline" onClick={() => notify.warning("Slot filling fast")}>
              Warning
            </ButtonLoadingMorph>
            <ButtonLoadingMorph variant="outline" onClick={() => notify.info("Stylist is running 10 min late")}>
              Info
            </ButtonLoadingMorph>
            <ButtonLoadingMorph variant="outline" onClick={() => notify.message("Saved to drafts", { action: { label: "Undo", onClick: () => notify.info("Undone") } })}>
              With action
            </ButtonLoadingMorph>
            <ButtonLoadingMorph variant="outline" onClick={() => notify.promise(wait(1600), { loading: "Saving…", success: "Saved", error: "Failed" })}>
              Promise
            </ButtonLoadingMorph>
            <ButtonLoadingMorph variant="gold" icon={Sparkles} onClick={() => notify.reward("You won a free hair spa!", { description: "Find it in Rewards" })}>
              Reward
            </ButtonLoadingMorph>
          </Row>
        </Specimen>
        <Specimen title="OfflineBanner">
          <Row>
            <ButtonLoadingMorph variant="outline" icon={Wifi} onClick={() => setOffline((v) => !v)}>
              {offline ? "Go online" : "Simulate offline"}
            </ButtonLoadingMorph>
          </Row>
          <OfflineBanner forceOffline={offline} />
        </Specimen>
        <Specimen title="Haptics">
          <p className="flex items-center gap-2 text-caption text-ink-neutral">
            <Megaphone className="size-4" aria-hidden /> Every notify call vibrates (Android) with a pattern per type. iOS Safari has no vibrate API.
          </p>
        </Specimen>
        <Specimen title="Layers">
          <p className="flex items-center gap-2 text-caption text-ink-neutral">
            <Layers className="size-4" aria-hidden /> z-toast (70) sits above sheets (50) and dialogs (60).
          </p>
        </Specimen>
      </Grid>
    </Section>
  );
}
