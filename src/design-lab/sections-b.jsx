import { useState } from "react";
import { motion } from "motion/react";
import { Calendar, CalendarClock, CalendarPlus, Command as CommandIcon, CreditCard, KeyRound, Layers3, Lock, Mail, Navigation, Phone, Scissors, Search, Sparkles, Trash2, User, UserPlus, Users, Wallet } from "lucide-react";
import { salonDateIso } from "@/lib/salon-date";
import { notify } from "@/lib/notify";
import {
  AnimatedStepper,
  AnimatedTabBar,
  ButtonLoadingMorph,
  CommandPalette,
  ConfirmSheet,
  DateStrip,
  EmptyState,
  FloatingActionButton,
  FloatingLabelInput,
  MonthExpander,
  MorphDialog,
  OtpInput,
  SlideToConfirm,
  SpringBottomSheet,
  TimeSlotPicker,
} from "@/components/kit";
import { spring } from "@/components/motion/presets";
import { Grid, Row, Section, Specimen, wait } from "./lab-ui";
import { demoAvailability, demoSlots } from "./demo-data";

export function Overlays() {
  const [sheet, setSheet] = useState(false);
  const [snapSheet, setSnapSheet] = useState(false);
  const [dialog, setDialog] = useState(false);
  const [morph, setMorph] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [palette, setPalette] = useState(false);
  const [fab, setFab] = useState(false);
  return (
    <Section id="overlays" title="Sheets, dialogs & confirmations" icon={Layers3}>
      <Grid>
        <Specimen title="SpringBottomSheet">
          <Row>
            <ButtonLoadingMorph variant="outline" onClick={() => setSheet(true)}>
              Open sheet
            </ButtonLoadingMorph>
            <ButtonLoadingMorph variant="outline" onClick={() => setSnapSheet(true)}>
              With snap points
            </ButtonLoadingMorph>
          </Row>
          <SpringBottomSheet open={sheet} onOpenChange={setSheet} title="Choose a stylist" description="Drag down to close" icon={Users} footer={<ButtonLoadingMorph fullWidth onClick={() => setSheet(false)}>Done</ButtonLoadingMorph>}>
            <div className="space-y-2">
              {["Anita", "Ravi", "Meera"].map((n) => (
                <div key={n} className="rounded-2xl bg-muted p-3 text-sm font-semibold">
                  {n}
                </div>
              ))}
            </div>
          </SpringBottomSheet>
          <SpringBottomSheet open={snapSheet} onOpenChange={setSnapSheet} title="Booking details" snapPoints={[0.45, 1]} icon={CalendarClock}>
            <p className="text-sm text-ink-neutral">Drag up to expand to full height, down to dismiss.</p>
            <div className="mt-4 space-y-2">
              {Array.from({ length: 12 }, (_, i) => (
                <div key={i} className="h-12 rounded-2xl bg-muted" />
              ))}
            </div>
          </SpringBottomSheet>
        </Specimen>
        <Specimen title="MorphDialog (+ shared-element layoutId)">
          <Row>
            <ButtonLoadingMorph variant="outline" onClick={() => setDialog(true)}>
              Open dialog
            </ButtonLoadingMorph>
            {!morph ? (
              <motion.button layoutId="lab-morph" type="button" onClick={() => setMorph(true)} className="glass-strong rounded-sheet px-4 py-3 text-sm font-semibold" transition={spring.sheet}>
                Expand me
              </motion.button>
            ) : (
              <span className="px-4 py-3 text-sm">…</span>
            )}
          </Row>
          <MorphDialog open={dialog} onOpenChange={setDialog} title="Reschedule booking?" description="We'll text the customer the new time." icon={CalendarClock} footer={<><ButtonLoadingMorph variant="ghost" onClick={() => setDialog(false)}>Cancel</ButtonLoadingMorph><ButtonLoadingMorph onClick={() => setDialog(false)}>Reschedule</ButtonLoadingMorph></>} />
          <MorphDialog open={morph} onOpenChange={setMorph} layoutId="lab-morph" title="Shared-element expand" icon={Sparkles}>
            <p className="text-sm text-ink-neutral">The card grew out of the button.</p>
          </MorphDialog>
        </Specimen>
        <Specimen title="SlideToConfirm" wide>
          <div className="grid gap-4 md:grid-cols-2">
            <SlideToConfirm label="Slide to collect ₹1,450" tone="gold" icon={Wallet} confirmedLabel="Collected" onConfirm={() => wait(1000)} />
            <SlideToConfirm label="Slide to cancel booking" tone="danger" icon={Trash2} confirmedLabel="Cancelled" onConfirm={() => wait(800)} />
            <SlideToConfirm label="Slide to confirm" mode="hold" onConfirm={() => wait(600)} />
            <SlideToConfirm label="Slide (fails, resets)" onConfirm={() => wait(700).then(() => Promise.reject(new Error("x")))} />
            <SlideToConfirm label="Disabled" disabled onConfirm={() => {}} />
          </div>
        </Specimen>
        <Specimen title="ConfirmSheet (sheet on phone, dialog on desktop)">
          <Row>
            <ButtonLoadingMorph variant="outline" onClick={() => setConfirm("default")}>
              Default
            </ButtonLoadingMorph>
            <ButtonLoadingMorph variant="danger" onClick={() => setConfirm("destructive")}>
              Destructive
            </ButtonLoadingMorph>
            <ButtonLoadingMorph variant="gold" onClick={() => setConfirm("payment")}>
              Payment
            </ButtonLoadingMorph>
          </Row>
          <ConfirmSheet
            open={Boolean(confirm)}
            onOpenChange={(o) => !o && setConfirm(null)}
            kind={confirm ?? "default"}
            icon={confirm === "payment" ? CreditCard : confirm === "destructive" ? Trash2 : CalendarPlus}
            title={confirm === "payment" ? "Collect ₹1,450?" : confirm === "destructive" ? "Cancel this booking?" : "Book this slot?"}
            description={confirm === "destructive" ? "The customer will be notified." : undefined}
            onConfirm={async () => {
              await wait(900);
              notify.success("Done");
            }}
          />
        </Specimen>
        <Specimen title="CommandPalette (⌘K / Ctrl+K)">
          <ButtonLoadingMorph variant="outline" icon={CommandIcon} onClick={() => setPalette(true)}>
            Open palette
          </ButtonLoadingMorph>
          <CommandPalette
            open={palette}
            onOpenChange={setPalette}
            hotkey={false}
            groups={[
              { heading: "Jump to", items: [{ id: "a", label: "Appointments", icon: Calendar, hint: "G A", onSelect: () => notify.info("Appointments") }, { id: "c", label: "Customers", icon: Users, onSelect: () => notify.info("Customers") }] },
              { heading: "Actions", items: [{ id: "w", label: "New walk-in", icon: UserPlus, keywords: ["add", "queue"], onSelect: () => notify.info("Walk-in") }, { id: "s", label: "Find service", icon: Search, onSelect: () => {} }] },
            ]}
          />
        </Specimen>
        <Specimen title="FloatingActionButton">
          <ButtonLoadingMorph variant="outline" onClick={() => setFab((v) => !v)}>
            {fab ? "Hide" : "Show"} FAB
          </ButtonLoadingMorph>
          {fab ? (
            <FloatingActionButton
              label="Quick actions"
              actions={[
                { id: "w", label: "Walk-in", icon: UserPlus, onClick: () => notify.info("Walk-in") },
                { id: "b", label: "Book", icon: CalendarPlus, onClick: () => notify.info("Book") },
                { id: "p", label: "Collect", icon: Wallet, onClick: () => notify.info("Collect") },
              ]}
            />
          ) : null}
        </Specimen>
      </Grid>
    </Section>
  );
}

export function DateTime() {
  const [date, setDate] = useState(salonDateIso(1));
  const [slot, setSlot] = useState(null);
  const [availability] = useState(() => demoAvailability(30));
  const [slots] = useState(() => demoSlots(salonDateIso(1)));
  return (
    <Section id="datetime" title="Date & time selection" icon={CalendarClock}>
      <Grid>
        <Specimen title="DateStrip + MonthExpander" wide>
          <DateStrip value={date} onChange={setDate} availability={availability} />
          <p className="mt-2 text-caption text-ink-neutral">
            Selected: <b>{date}</b> (salon time). Dots: green free · amber limited · red busy · faded closed/past.
          </p>
        </Specimen>
        <Specimen title="MonthExpander (standalone)">
          <MonthExpander value={date} onChange={setDate} availability={availability} />
        </Specimen>
        <Specimen title="TimeSlotPicker" wide className="xl:col-span-2">
          <TimeSlotPicker slots={slots} value={slot} onChange={setSlot} />
        </Specimen>
        <Specimen title="TimeSlotPicker" state="loading">
          <TimeSlotPicker slots={[]} loading onChange={() => {}} />
        </Specimen>
        <Specimen title="TimeSlotPicker" state="empty">
          <TimeSlotPicker slots={[]} onChange={() => {}} empty={<EmptyState compact illustration="calendar" title="No times left" description="Try another day." />} />
        </Specimen>
        <Specimen title="TimeSlotPicker (timeline mode)" wide className="xl:col-span-2">
          <TimeSlotPicker slots={slots} value={slot} onChange={setSlot} durationMinutes={45} />
        </Specimen>
      </Grid>
    </Section>
  );
}

const STEPS = [
  { id: "service", label: "Service", icon: Scissors },
  { id: "time", label: "Date & time", icon: CalendarClock },
  { id: "details", label: "Details", icon: User },
  { id: "pay", label: "Pay", icon: CreditCard },
];

export function Forms() {
  const [otp, setOtp] = useState("");
  const [otpState, setOtpState] = useState(null);
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  return (
    <Section id="forms" title="Inputs & forms" icon={KeyRound}>
      <Grid>
        <Specimen title="FloatingLabelInput — states" wide>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <FloatingLabelInput label="Full name" icon={User} />
            <FloatingLabelInput label="Phone" icon={Phone} defaultValue="+91 98765 43210" success hint="Verified" />
            <FloatingLabelInput label="Email" icon={Mail} value={email} onChange={(e) => setEmail(e.target.value)} error={email && !email.includes("@") ? "Enter a valid email" : undefined} hint="Type to validate" />
            <FloatingLabelInput label="Password" icon={Lock} type="password" defaultValue="secret123" />
            <FloatingLabelInput label="Disabled" disabled defaultValue="Read only" />
            <FloatingLabelInput label="Notes for your stylist" as="textarea" />
          </div>
        </Specimen>
        <Specimen title="OtpInput">
          <OtpInput
            value={otp}
            onChange={(v) => {
              setOtp(v);
              setOtpState(null);
            }}
            onComplete={(v) => setOtpState(v === "123456" ? "ok" : "bad")}
            error={otpState === "bad" ? "Wrong code — try 123456" : false}
            success={otpState === "ok"}
            autoFocus={false}
          />
        </Specimen>
        <Specimen title="OtpInput" state="error / success">
          <OtpInput value="4821" onChange={() => {}} error="Code expired" autoFocus={false} />
          <div className="h-4" />
          <OtpInput value="123456" onChange={() => {}} success autoFocus={false} />
        </Specimen>
        <Specimen title="AnimatedStepper">
          <AnimatedStepper steps={STEPS} current={step} onStepClick={setStep} />
          <Row className="mt-4">
            <ButtonLoadingMorph size="sm" variant="outline" onClick={() => setStep((s) => Math.max(0, s - 1))}>
              Back
            </ButtonLoadingMorph>
            <ButtonLoadingMorph size="sm" onClick={() => setStep((s) => Math.min(STEPS.length, s + 1))}>
              Next
            </ButtonLoadingMorph>
          </Row>
        </Specimen>
      </Grid>
    </Section>
  );
}

export function NavSection() {
  const [tab, setTab] = useState("upcoming");
  const items = [
    { value: "upcoming", label: "Upcoming", icon: CalendarClock, badge: 2 },
    { value: "past", label: "Past", icon: Calendar },
    { value: "cancelled", label: "Cancelled", icon: Trash2 },
  ];
  return (
    <Section id="navigation" title="Navigation & shells" icon={Navigation}>
      <Grid>
        <Specimen title="AnimatedTabBar · pill / underline / glass" wide>
          <div className="space-y-4">
            <AnimatedTabBar items={items} value={tab} onChange={setTab} />
            <AnimatedTabBar items={items} value={tab} onChange={setTab} variant="underline" />
            <div className="rounded-card bg-muted p-4">
              <AnimatedTabBar items={items} value={tab} onChange={setTab} variant="glass" size="sm" fullWidth />
            </div>
          </div>
        </Specimen>
        <Specimen title="PortalShell (full page demo)">
          <p className="mb-3 text-caption text-ink-neutral">Sidebar ≥1024px, bottom tabs + More sheet below. Per-portal accent.</p>
          <Row>
            {["sage", "teal", "indigo", "rose", "amber"].map((a) => (
              <a key={a} href={`/design-lab?demo=shell&accent=${a}`} className="inline-flex h-9 items-center rounded-full bg-muted px-3 text-caption font-semibold capitalize hover:bg-portal/12">
                {a}
              </a>
            ))}
          </Row>
        </Specimen>
        <Specimen title="AuthLayout (full page demo)">
          <a href="/design-lab?demo=auth" className="inline-flex h-9 items-center rounded-full bg-muted px-3 text-caption font-semibold hover:bg-portal/12">
            Open auth demo
          </a>
        </Specimen>
      </Grid>
    </Section>
  );
}
