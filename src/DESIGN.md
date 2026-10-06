# Sahasra Design System: the contract

This file is the **contract** between the design-system session and the four sessions that redesign
the product in parallel: (1) landing, (2) customer portal, (3) receptionist + employee portals,
(4) admin portal. Those sessions can only coordinate through what is written and built here. If a
rule here conflicts with your instinct, the rule wins. If something you need is missing, follow
**§8 Rules for later sessions**.

- Live gallery: run `npm run dev` and open **`/design-lab`** (dev builds only). Every component is
  shown in every state. `?theme=dark|light`, `?section=<id>`, `?demo=shell&accent=teal`, `?demo=auth`.
- Tokens: `src/globals.css`. Motion presets: `src/components/motion/presets.js`.
- Components: `src/components/motion/*` and `src/components/kit/*` (barrels: `@/components/motion`, `@/components/kit`).
- Helpers: `src/lib/format.js`, `src/lib/salon-date.js`, `src/lib/service-icons.js`, `src/lib/referral.js`, `src/lib/notify.js`.

---

## 1. Brief (verbatim from the product owner)

> Keep this section verbatim so every later session works from the same words.

**GLOBAL RULES**
- Keep ALL existing functionality, routes, Redux state and API calls working. Do not touch the backend. Do not change API contracts. Do not invent endpoints, testimonials, stats or ratings.
- LIGHT MODE: keep the existing palette exactly.
- DARK MODE: strongly reduce gold/yellow. Use cool surfaces (deep slate/navy/ink), cool neutrals, teal or indigo-leaning accent. Gold only as a tiny accent (badges, stars). Calm and cool, not harsh.
- ICONS OVER TEXT: lucide-react icons with short labels; minimal paragraphs and helper text.
- RESPONSIVE FOR ALL DEVICES: mobile-first, 360/390/768/1024/1280/1440/1920 px, no horizontal scroll, 44px touch targets, iOS safe-area insets, tables become cards on mobile, bottom tab nav on mobile and sidebar on desktop.
- Accessibility: WCAG AA in both themes, visible focus, aria-labels on icon-only buttons, keyboard navigable.
- Performance: 60fps on a mid-range Android phone; animate transform/opacity only; lazy-load heavy effects; keep the entry bundle near the current ~165 KB gzip; respect prefers-reduced-motion with simplified fallbacks.
- Never claim something works unless you ran it; list honestly what you could not test.

**CREATIVE DIRECTION** (this must NOT look like a template or default component-library UI; everything feels custom, delightful, memorable, yet fast and obvious to use)
- Concept: "luxury salon meets playful, fluid app": soft glassmorphism, layered depth, gradient mesh/aurora backgrounds, subtle grain, large confident typography, rounded organic shapes, glow and light-sweep effects.
- Motion language: springy and fluid, never linear. Define shared spring/ease presets, durations, stagger values; reuse everywhere so the whole product feels like one.
- Build CUSTOM signature versions of: loaders (branded animated loader e.g. scissors/comb/sparkle morph or liquid blob; shimmer skeletons matching real layouts; route-transition loader; buttons that morph spinner -> checkmark; pull-to-refresh; no plain spinners anywhere); toasts (glass cards, animated icons, progress timer bar, swipe-to-dismiss, personality per type: success burst, error shake, info slide, reward confetti, stacked depth, navigator.vibrate haptics where supported); popups/modals/sheets (spring bottom sheets with drag-to-dismiss and snap points on mobile, morphing centered dialogs on desktop, shared-element expand transitions, blurred backdrop, slide-to-confirm or hold-to-confirm for destructive/payment actions); a date picker (NOT a standard calendar: horizontally swipeable date strip with day chips showing weekday, date, availability dot, today glow, expandable animated month view, past dates dimmed, salon-timezone aware via src/lib/salon-date.js, keyboard accessible); a time-slot selector (grouped Morning/Afternoon/Evening with icons, animated chips with availability states free/limited/busy and a subtle "filling fast" pulse, optional visual day-timeline mode, morphing selection highlight, unavailable slots explain why on tap, confirm animation); inputs and forms (floating labels, animated focus rings, inline validation micro-animations, OTP input with per-digit animation and auto-advance, animated stepper for multi-step flows, magnetic buttons, ripple/press effects); navigation (animated tab bar with morphing active pill, shared-layout page transitions, command palette via cmdk, floating action button with expandable actions); data display (animated counters, progress rings, sparkline cards, charts that draw in on scroll, status chips with icon transitions, booking-status timeline, live queue with animated position changes); rewards/referral (scratch-card or spin/reveal, confetti and particle bursts, animated progress to next reward, shareable invite card); empty/error/offline states (illustrated and animated, friendly copy, one clear action); details (hover tilt, spotlight-follow cards, shine sweeps, animated icons, staggered intro orchestration, scroll progress bar).
- Libraries: consolidate framer-motion and motion into ONE (remove the other). Add only what you really use and lazy-load heavy ones: GSAP + ScrollTrigger and Lenis (landing only, but install now), lottie-react or dotLottie for a few key animations, canvas-confetti, vaul (drawers), cmdk, embla-carousel, sonner (toast engine, fully restyled). OGL/three only as an optional lazy-loaded hero background with a low-power/reduced-motion fallback.

### What was decided while building this
- **One animation library: `motion`** (`import { motion } from "motion/react"`). `framer-motion` is uninstalled. `animejs` is still used by five existing admin/customer files (`admin/lib/motion.js` and pages that import it directly); do not add new anime.js code. Migrate those files to `motion` when you redesign them.
- **No Lottie.** There were no licensed Lottie assets, and hand-built SVG + `motion` animations (BrandLoader, SuccessBurst, illustrations, toast icons) cover the "key animations" at a fraction of lottie-web's ~250 KB. If a later session gets real Lottie files, add `@lottiefiles/dotlottie-react`, lazy-load it, and list it in your PR.
- **WebGL:** `ogl` (~10 KB) via `<AuroraBackground webgl />`, lazy, landing hero only. `three` stays only because `img-fx` (PixelImage) needs it as a peer dependency.
- **GSAP/Lenis** are reachable only through `loadGsap()` / `startSmoothScroll()` in `@/components/motion` (dynamic imports). The landing page is the only allowed caller.

---

## 2. Tokens (`src/globals.css`)

All colours are HSL channel triplets: use `hsl(var(--token))` in CSS, or the Tailwind names (`bg-primary`, `text-ink-success`, `bg-portal/12`).

### 2.1 Colour
| Token | Light (unchanged palette) | Dark (new, cool) | Use |
|---|---|---|---|
| `--background` / `--foreground` | sage white / deep green | `222 32% 7%` ink / `214 32% 93%` | page |
| `--card`, `--popover` | white | `222 28% 10%`, `222 27% 12%` | surfaces |
| `--primary` | `152 38% 32%` sage | `170 58% 48%` teal | brand actions |
| `--accent` | `38 68% 52%` gold | `236 82% 76%` indigo | secondary emphasis |
| `--muted`, `--secondary`, `--border` | unchanged | slate | quiet fills |
| `--success` `--warning` `--destructive` | unchanged | cooled + brightened | semantic |
| `--info` *(new)* | `204 62% 42%` | `204 80% 66%` | in-service, refunds |
| `--plum` *(new)* | `280 40% 48%` | `280 62% 76%` | no-show |
| `--gold` *(new)* | `38 68% 52%` | `43 74% 60%` | **only** stars, rewards, member badges |
| `--ink-*` *(new)* | darker inks | lighter inks | **text/icons on tinted chips**; AA on `tone/12` over card |
| `--portal-accent` *(new)* | = `--primary` | = `--primary` | per-portal accent (see §5) |

**Contrast (computed, see PR):** every dark pair is AA (body 15–16:1, muted text 7–8:1, chip inks 6–8:1).
In light mode the original `--muted-foreground` is only 3.6:1 and white-on-gold `--accent` is 2.4:1;
the palette is frozen, so **for small secondary text use `text-ink-neutral`** (5.3:1) and never put
white text on gold. The kit already does this.

### 2.2 Type
Fonts: **Besley** (`font-display`, headings, big numbers, lining figures) and **Figtree** (`font-sans`, UI).
| Utility | Size | Use |
|---|---|---|
| `text-display-2xl` | clamp 44→88px | landing hero |
| `text-display-xl` | clamp 36→64px | section heroes, queue position |
| `text-display-lg` | clamp 30→48px | page heroes |
| `text-title` | clamp 22→28px | page titles |
| `text-headline` | 18px | card/sheet titles |
| `text-body` | 15px | paragraphs (keep them rare) |
| `text-caption` | 13px | labels, meta |
| `text-micro` | 11px, +4% tracking | overlines, badges |

### 2.3 Space, radii, elevation, layers
- Spacing: Tailwind's 4px scale. Page gutter `px-[var(--gutter)]` (16→32px fluid). Content max `--content-max` 1280px.
- Radii: `rounded-chip` 12, `rounded-control` 14 (inputs, buttons), `rounded-card` 24, `rounded-sheet` 28, `rounded-blob` (organic).
- Shadows: `shadow-soft` (resting), `shadow-lift` (hover), `shadow-float` (sheets, popovers), `shadow-glow` (selected, primary emphasis; tinted by `--portal-accent`).
- Surfaces: `glass-surface`, `glass-strong`, `aurora` (+ `aurora-animated`), `grain`, `shine` (+ `shine-auto`), `kit-shimmer`, `text-gradient-portal`. **Glass budget: at most ~3 glass layers on screen.**
- z-index utilities: `z-raised` 10 · `z-sticky` 20 · `z-nav` 30 · `z-fab` 35 · `z-overlay` 40 · `z-sheet` 50 · `z-modal` 60 · `z-popover` 65 · `z-toast` 70 · `z-palette` 80. Never use raw `z-[9999]`.
- Safe areas: `pt-safe pb-safe pl-safe pr-safe mb-safe`, or `var(--safe-*)` in calc. `index.html` sets `viewport-fit=cover`.
- Touch: `tap` utility extends any small control's hit area to 44px. Layout vars: `--tabbar-h` 64px, `--topbar-h` 60px, `--sidebar-w` 264px.

---

## 3. Motion presets (`@/components/motion/presets`)

| Preset | Value | Use for |
|---|---|---|
| `spring.soft` | stiffness 260, damping 26, mass 0.9 | default: cards, chips, entrances |
| `spring.snappy` | 520 / 34 / 0.7 | selection pills, toggles, tab indicator |
| `spring.bouncy` | 420 / 18 / 0.8 | success icons, badges, pops |
| `spring.sheet` | 340 / 36 / 1 | sheets, dialogs, page transitions |
| `spring.gentle` | 120 / 20 / 1 | hero reveals, progress rings, illustrations |
| `ease.out` / `outExpo` / `inOut` / `emphasized` / `sheet` | cubic-béziers | tweens (fades, bars) |
| `duration` | instant .12 · fast .2 · base .32 · slow .56 · hero 1 (s) | |
| `stagger` | tight .03 · base .06 · loose .1 (s) | lists, grids |
| `distance` | sm 8 · md 16 · lg 32 (px) | entrance offsets |
| `variants.fadeUp/fadeIn/scaleIn/slideRight/stagger()` | | `initial="hidden" animate="show" exit="exit"` |
| `interaction.cardHover` | y −4, spring.soft | **every** hoverable card |
| `interaction.press` | scale .97, spring.snappy | **every** tappable surface (`whileTap`) |
| `interaction.page` | opacity + 12px rise, spring.sheet | **every** page change (via `PageTransition`) |
| `haptic(kind)` | tap 8ms · success · error · warning · reward | no-op when unsupported or reduced motion |

CSS twins: `--ease-spring`, `--ease-bounce` (spring curves via `linear()`, with cubic-bézier fallback), `--ease-out-expo`, `--ease-emphasized`, `--ease-sheet`, `--dur-*`, `--stagger-*`.

**Rules:** animate only `transform` and `opacity` (the only exception in the kit is the month view's height on expand). Never `linear` for UI (it's fine for progress timers and infinite spins). `KitProvider` wraps the app in `<MotionConfig reducedMotion="user">`, so motion components drop transforms and keep fades for reduced-motion users. CSS loops in the kit (`kit-*` classes) have reduced-motion overrides; give your own CSS loops one too.

---

## 4. Component API reference

Import from the barrels: `import { StatusChip, DateStrip } from "@/components/kit"` and
`import { FadeIn, spring } from "@/components/motion"`. All components accept `className`.

### 4.1 Motion (`@/components/motion`)
| Component | Props | Notes |
|---|---|---|
| `FadeIn` | `direction` up/down/left/right/none, `delay`, `as` | mount entrance |
| `Stagger` / `StaggerItem` | `gap`, `delay`, `inView`, `as` / `variant` | list orchestration |
| `ScrollReveal` | `y`, `scale`, `amount`, `delay`, `once` | first time in view |
| `PageTransition` | `transitionKey` (default pathname) | PortalShell already uses it |
| `AnimatedCounter` | `value`, `from`, `duration`, `format` | writes textContent, no re-renders |
| `HoverLiftCard` | `tilt`, `as` | lift + press, optional 3D tilt |
| `SpotlightCard` | `as` | pointer spotlight (mouse only) |
| `MagneticButton` | `strength` | wrap a button |
| `SkeletonShimmer` + `SkeletonText/Stat/ListItem/List/Card/Table/Slots` | sizes via classes | match real layouts |
| `ConfettiBurst` / `fireConfetti(opts)` | `trigger` / `{origin, element, particleCount, spread}` | lazy canvas-confetti |
| `SuccessBurst` | `size`, `tone`, `label` | re-key to replay |
| `ScrollProgress` | `container` | top reading bar |
| `loadGsap()`, `startSmoothScroll()` | | landing only |

### 4.2 Loading (contract item d)
```jsx
<BrandLoader variant="scissors" size="md" label="Loading bookings…" />   // scissors | blob | dots; xs…xl; fullScreen; hideLabel
<RouteLoader fullScreen />                                              // Suspense fallback; loader appears after 220ms
const { state, run } = useAsyncAction();
<ButtonLoadingMorph state={state} icon={Save} onClick={() => run(save)}>Save</ButtonLoadingMorph>
// variant primary|secondary|outline|ghost|danger|gold, size sm|md|lg, fullWidth, loadingLabel, successLabel, errorLabel
<PullToRefresh onRefresh={reload}>{list}</PullToRefresh>                // touch only; keep a visible refresh button too
```
`LoadingOrb` / `InlineOrb` (`components/shared/loading-orb`) are legacy names that now render BrandLoader; new code uses BrandLoader.

### 4.3 Feedback: `notify` (contract item c)
```js
import { notify } from "@/lib/notify";
notify.success("Booking confirmed", { description: "Sat 11 Oct · 4:30 pm" });
notify.error(err);                       // Error objects work; lingers 7s, shakes
notify.warning("Slot filling fast");     notify.info("Stylist running late");
notify.message("Saved", { action: { label: "Undo", onClick } });
notify.promise(p, { loading, success, error });
notify.reward("You won a free hair spa!");   // gold + confetti + haptic
notify.loading("Uploading…"); notify.dismiss(id);
```
Also exported: `toast`, a drop-in for `import { toast } from "sonner"` (same call shapes). **Never import from `sonner` directly.** The single `<KitToaster>` is mounted by `<KitProvider>` in `App.jsx`. Customer pages can still push toasts below their header with `--toast-top`.

### 4.4 Overlays and confirmation (contract item c)
```jsx
<SpringBottomSheet open onOpenChange title="Choose a stylist" description icon={Users} snapPoints={[0.45, 1]} footer={…}>…</SpringBottomSheet>
<MorphDialog open onOpenChange title description icon tone="primary" size="sm|md|lg|xl" layoutId="…" footer={…}>…</MorphDialog>
<ResponsiveModal …same props as MorphDialog…>   // sheet < 768px, dialog ≥ 768px
<SlideToConfirm label="Slide to collect ₹1,450" tone="gold|danger|primary" mode="slide|hold" onConfirm={async () => …} />
<ConfirmSheet open onOpenChange kind="default|destructive|payment" title icon onConfirm={async () => …} />
<CommandPalette open onOpenChange groups={[{ heading, items: [{ id, label, icon, hint, keywords, onSelect }] }]} />
<FloatingActionButton label="Quick actions" actions={[{ id, label, icon, onClick }]} />
```
Shared-element expand: render a `motion.*` trigger with `layoutId="x"`, hide it while open, and pass `layoutId="x"` to `MorphDialog`.

### 4.5 Date and time (contract item b)
```jsx
<DateStrip value={dateIso} onChange={setDateIso} availability={{ "2026-10-07": "limited", … }}
           days={30} minDate maxDate isDisabled={(iso) => …} expandable />
<MonthExpander value onChange availability minDate maxDate />
<TimeSlotPicker slots={slots} value={startsAt} onChange={(startsAt, slot) => …} loading={slotsLoading}
                mode="grid|timeline" allowModeToggle empty={<EmptyState … />} />
```
- Dates are **salon-local `YYYY-MM-DD` strings** (`salonDateIso()`), never `Date` objects.
- Slot shape: `{ startsAt: ISO, availability?: "free"|"limited"|"busy"|"unavailable", reason?: string, seatsLeft?: number }`. The current booking API returns `{ startsAt }`, which renders as free. **Never fetch inside these components**; derive availability in the page from data you already have, and don't invent it.
- Keyboard: strip ←/→/Home/End + Enter; month grid arrows ±1/±7, PageUp/PageDown; slots are radio buttons.

### 4.6 Forms
```jsx
<FloatingLabelInput label="Phone" icon={Phone} type="tel" error={errors.phone} hint="We'll text a code" success={verified} ref={ref} />
<FloatingLabelInput as="textarea" label="Notes" />      // type="password" gets a show/hide toggle
<OtpInput value={code} onChange={setCode} onComplete={verify} length={6} error="Wrong code" success={ok} />
<AnimatedStepper steps={[{ id, label, icon }]} current={i} onStepClick={(i) => …} />
```
Plain `components/ui/*` (shadcn: Button, Input, Select, Dialog…) keeps working. New screens should prefer the kit.

### 4.7 Navigation
```jsx
<AnimatedTabBar items={[{ value, label, icon, badge }]} value onChange variant="pill|underline|glass" size="sm|md" fullWidth />
```

### 4.8 Data display
```jsx
<StatCard icon={IndianRupee} label="Revenue today" value={48250} format={(n) => formatMoney(n)} delta={12} trend={[…]} tone="primary" loading onClick />
<Sparkline data={[…]} />          <ProgressRing value={72} max={100} size={96} tone="portal|gold|success…" label="…">{custom centre}</ProgressRing>
<StatusChip status={booking.status} booking={booking} audience="customer|staff" size="sm|md" iconOnly />
<BookingTimeline status="STARTED" times={{ CONFIRMED: iso, STARTED: iso }} orientation="horizontal|vertical" audience />
<QueuePosition position={entry.positionInLane} peopleAhead={entry.peopleAhead} waitMinutes={entry.waitMinutes} status={entry.status} ticket={entry.ticket} />
<QueueList entries={[{ ticket, name, status, waitMinutes, highlight }]} />
<ResponsiveTable columns={[{ key, header, cell, align, primary, secondary, trailing, hideOnMobile }]} rows rowKey onRowClick loading empty caption mobileCard />
<Avatar name src size="xs…xl" status="online|busy|away|offline" />   <AvatarGroup people max />
<IconLabel icon label sub tone layout="row|stack" size />   <IconButton icon label variant="ghost|soft|solid|outline|glass|danger" size badge active />
<PriceTag amount={899} listPrice={1199} member from paise size />   <Rating value={4.5} count showValue />  <Rating value onChange />
```

### 4.9 Rewards and referral
```jsx
<RewardReveal reward={{ title, subtitle, icon }} revealed onReveal />          // scratch card + Reveal button
<ReferralShareCard code={overview.referralCode} link={buildReferralLink(overview.referralCode)}
                   walletBalance={overview.walletBalance} pendingCredit={overview.pendingCredit}
                   progress={{ current, target, label }} onInvite={() => setInviteOpen(true)} />
<InviteSheet open onOpenChange link code />                                    // Web Share, WhatsApp, copy, QR
```
Data source: `GET /api/customer/loyalty` (`referralCode`, `walletBalance`, `pendingCredit`, `referrals[]`) and the vault
endpoints already used by `user/pages/loyalty-page.jsx`. The link format `/auth/signup?ref=CODE` is what SignupPage reads.
There is **no API field for "progress to next reward"**; only pass `progress` if you derive it from real data.

### 4.10 Empty, error, offline (contract item d)
```jsx
<EmptyState illustration="calendar|search|queue|gift|bag|sparkle" title description action={<ButtonLoadingMorph…/>} compact />
<EmptyState icon={Users} title … />                // legacy API, still supported
<ErrorState title description onRetry={async () => …} offline compact />
<OfflineBanner />                                   // PortalShell mounts it; mount yourself elsewhere
```
One action max. Copy: a title of 2–5 words, at most one short sentence.

### 4.11 Layout
```jsx
<PortalShell brand={{ name: "Sahasra", tagline: "Reception" }} nav={[{ label, href, icon, badge }]}
             tabs={[hrefs…]} title subtitle actions={<NotificationBell …/>} user={{ name, src, role }}
             userMenu={<LogoutButton/>} accent="teal" commands={[…]} fab={<FloatingActionButton…/>}>
  {children /* or <Outlet/> */}
</PortalShell>
<AuthLayout title subtitle highlights={[{ icon, label }]} footer>{form}</AuthLayout>
<AuroraBackground webgl animated grain />           // inside a relative parent
```
- PortalShell: desktop (≥1024px) glass sidebar with a sliding active pill and a sticky glass top bar; phone: top bar plus a bottom tab bar (4 tabs + "More" sheet) with a morphing pill, safe-area padding, and content padded above the tab bar. To keep the sidebar mounted across pages, render PortalShell once in a layout route (like `admin/portal/admin-frame.jsx`) and put `<Outlet/>` inside.
- `KitProvider` is already mounted in `App.jsx`. Don't mount it again.

---

## 5. Portal accents
Set **one** accent per portal: `<PortalShell accent="…">` (or `data-accent="…"` on any wrapper). It retints
`--portal-accent`, used by `bg-portal`, `text-portal`, `shadow-glow`, selection pills, loaders, focus glows.
Recommended: customer `sage` (or default), receptionist `teal`, employee `indigo`, admin default/`sage`.
Presets have light and dark values that pass AA with `text-portal-foreground`. Don't recolour anything else per portal.

---

## 6. SHARED PATTERNS CONTRACT

These decisions are fixed. No portal reinvents them.

### a. Booking status → colour + icon + label
Implemented once in `kit/status-meta.js` → `<StatusChip>` / `<BookingTimeline>`. These are the real API values.
| Status | Tone | Icon | Label (staff) | Label (customer) |
|---|---|---|---|---|
| `PENDING` | warning | Clock | Pending | Pending |
| `CONFIRMED` | primary | CalendarCheck | Confirmed | Confirmed |
| `STARTED` | info, live pulse | Scissors | In service | In service |
| `COMPLETED` | success | CircleCheck | Completed | Completed |
| `CANCELLED` | destructive | CircleX | Cancelled | Cancelled |
| `NO-SHOW` | plum | UserX | No-show | Missed |
| `PAID` / `FAILED` / `REFUNDED` / `EXPIRED` | success / destructive / info / neutral | BadgeCheck / CircleAlert / Undo2 / TimerOff | | |
| `ACTIVE` / `INACTIVE` | success / neutral | | memberships, staff, offers | |
| `FIRST_ACTION_DONE` / `COOLING` / `APPROVED` / `REWARDED` / `REJECTED` / `NEEDS REVIEW` | primary / info / primary / gold / destructive / warning | | referral states | |
| `OPEN` / `RESOLVED` | warning / success | | feedback | |
Aliases: `NO_SHOW`, `CANCELED`, `CLIENT DID NOT VISIT`, `IN_PROGRESS`. Unknown values get a neutral chip.
A `STARTED` booking that is waiting for auto-complete (`isStartedPendingAutoComplete`) still reads **In service**.
Old per-page maps (`STATUS_STYLE` in booking-history, admin `StatusPill`) must be replaced by `StatusChip` when each portal is redesigned.

### b. Date and time selection
`DateStrip` (+ `MonthExpander`) and `TimeSlotPicker` are the **only** date/time UI: customer booking, receptionist
walk-in booking, admin reschedule, and any new flow. No `<input type="date">`, no third-party calendars. The admin
date-*range* picker (reports) is out of scope and may stay.

### c. Feedback and confirmation
- All feedback goes through `notify` (or its `toast` alias). No `alert()`, no inline toasts.
- All confirmations use `ConfirmSheet` / `ResponsiveModal` / `MorphDialog` / `SpringBottomSheet`. No `window.confirm`, no `AlertDialog` in new code.
- **Destructive actions** (cancel booking, delete service/staff/offer, reject referral, remove from history) and **payment collection** (receptionist collect, refunds) use `SlideToConfirm`, usually via `<ConfirmSheet kind="destructive|payment">`, in every portal. Customer self-payments through Razorpay checkout keep Razorpay's own flow.

### d. Loading, empty, error
Initial loads use `SkeletonShimmer` layouts that match the content. Whole-page or route loads use `BrandLoader` or `RouteLoader`. Button actions use `ButtonLoadingMorph`. **No `Loader2 animate-spin` or other plain spinners in redesigned screens.** Empty lists use `EmptyState`, failures use `ErrorState` (with `onRetry`), and offline is handled by `OfflineBanner` / `ErrorState offline`.

### e. Formatting: one helper each (`@/lib/format`)
| Need | Helper |
|---|---|
| Money (rupees, app default) | `formatMoney(v)` → "₹1,250" (wraps `formatRupees`) |
| Money in paise (Razorpay) | `formatMoney(v, { paise: true })`, `paiseToRupees(v)` (integer-safe) |
| Compact money | `formatMoney(v, { compact: true })` → "₹12.3L" |
| Phone | `formatPhone("9876543210")` → "+91 98765 43210"; `maskPhone()` for lists |
| Salon "today" / offsets | `salonDateIso(offset)` |
| Date label | `formatIsoDate(iso, Intl options)`, `salonRelativeDayLabel(iso)` → Today/Tomorrow/"Mon, 6 Oct" |
| Time of an instant | `salonTimeLabel(isoInstant)` → "3:15 pm" in salon time |
| Date + time | `formatSalonDateTime(isoInstant)` |
| Salon date of an instant | `salonDateOf(isoInstant)` |
| Date math | `addDaysIso`, `diffDaysIso`, `monthStartIso`, `daysInMonthIso`, `weekdayIndexIso` |
| Duration | `formatDuration(min)` → "1h 15m"; queue waits use `formatWaitLabel` from `queue-utils` |
| Ordinals | `ordinal(3)` → "3rd" |
Never call `toLocaleDateString()` / `new Date().toISOString().slice(0,10)` for salon dates; device time zones drift.

### f. Service, category and audience icons
`@/lib/service-icons`: `iconForCategory(text)`, `iconForService(service)`, `iconForAudience("WOMEN"|"MEN"|"UNISEX"|"BOY"|"GIRL"|"CHILDREN")`.
Keyword map: bridal/wedding → Crown · kids/child/boy/girl → Baby · makeup → Brush · colour/highlights → Palette ·
nails/mani/pedi → Hand · spa/massage/body → Flower2 · wax/thread/shave/beard/groom → Droplets · skin/facial →
Smile · blow-dry/keratin → Wind · hair/cut/style → Scissors · premium → Gem · fallback Sparkles.
(`customer-service-picker`'s `iconForCategory` re-exports this.) Add keywords **here only**.

### g. Fixed behaviour presets
- **Page transition:** `PageTransition` (`interaction.page`). PortalShell applies it; don't add a second one.
- **Tab bars:** `AnimatedTabBar` (in-page) and PortalShell's nav bars. Morphing pill with `spring.snappy`, haptic tap.
- **Sheets:** vaul via `SpringBottomSheet`: drag-to-dismiss, scrim `--scrim` with a 3px blur, safe-area footer.
- **Dialogs:** `MorphDialog`: scale .92 → 1 with blur-out and `spring.sheet`.
- **Card hover:** `interaction.cardHover` (−4px, `shadow-soft` → `shadow-lift`); press `interaction.press`.
- **Lists:** stagger `stagger.base`, item `variants.fadeUp`, capped delay (≤ 10 items × step).

### h. Rules for later sessions
1. **Do not change the API of existing kit or motion components** (`src/components/kit`, `src/components/motion`), tokens, `notify`, `format`, `salon-date`, `service-icons` or `referral`. Additive, backward-compatible props only (new optional props with defaults that keep the current behaviour).
2. A new shared need goes in **`src/components/kit-extra/<area>-<name>.jsx`** (for example `kit-extra/admin-revenue-heatmap.jsx`). It must use the tokens and presets and be **listed in your PR**.
3. **Each session edits only its own folders:** landing → `src/landing/**`; customer → `src/user/**`, `src/components/services/**`, `src/components/offers/**`; reception + employee → `src/receptionist/**`, `src/employee/**`; admin → `src/admin/**`. Touching `App.jsx` routes, `globals.css`, `components/ui`, `components/shared`, `components/kit`, `components/motion` or `lib/*` needs a line in the PR under "Shared files touched" with the reason. Prefer `kit-extra` or your own folder.
4. Use `PortalShell` for portals and `AuthLayout` for auth screens. Keep existing routes, Redux slices and API calls.
5. Before opening your PR: `npm run build`, `npm run lint`, check your screens at 390px and 1440px in both themes, and list anything you could not test.

---

## 7. Checklists for redesigned screens
- [ ] Icons + short labels; no paragraph longer than one sentence on mobile.
- [ ] Works at 360px with no horizontal scroll; tables use `ResponsiveTable`.
- [ ] Touch targets ≥ 44px (`size-11`, `h-11`, or `tap`).
- [ ] Icon-only buttons have `aria-label` (`IconButton` requires `label`).
- [ ] Visible focus on everything interactive; keyboard reaches everything.
- [ ] Small text uses `text-ink-neutral`, not `text-muted-foreground` (light-mode contrast).
- [ ] Statuses via `StatusChip`; dates/times via `DateStrip` + `TimeSlotPicker`; money/phone/date via `@/lib/format`.
- [ ] Loading = skeleton/BrandLoader/ButtonLoadingMorph; empty/error = EmptyState/ErrorState.
- [ ] Destructive and payment-collect actions use SlideToConfirm.
- [ ] Only `transform`/`opacity` animated; checked with reduced motion turned on.
- [ ] Gold appears in dark mode only on stars, rewards and member badges.

## 8. Bundle budget
Entry chunk before this work: **187.1 KB gzip**; after: **176.8 KB gzip**. Heavy libraries (vaul, cmdk, embla, canvas-confetti, gsap, lenis, ogl) must only be reached from lazy route chunks or dynamic imports. If your PR grows the entry chunk by more than 5 KB gzip, say why.
