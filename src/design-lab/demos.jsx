import { useState } from "react";
import { CalendarCheck, CalendarPlus, Crown, Gift, History, Hourglass, IndianRupee, LayoutDashboard, LogOut, ShieldCheck, Smartphone, Sparkles, Tag, UserCircle, UserPlus, Users, Wallet } from "lucide-react";
import { formatMoney } from "@/lib/format";
import { notify } from "@/lib/notify";
import { AuthLayout, ButtonLoadingMorph, FloatingActionButton, FloatingLabelInput, OtpInput, PortalShell, ResponsiveTable, StatCard, StatusChip, useAsyncAction } from "@/components/kit";
import { Stagger, StaggerItem } from "@/components/motion";
import { demoBookings } from "./demo-data";

const NAV = [
  { label: "Home", href: "/design-lab", icon: LayoutDashboard },
  { label: "Book", href: "/design-lab/book", icon: CalendarPlus },
  { label: "Queue", href: "/design-lab/queue", icon: Hourglass, badge: 2 },
  { label: "Offers", href: "/design-lab/offers", icon: Tag },
  { label: "Membership", href: "/design-lab/membership", icon: Crown },
  { label: "Refer & Earn", href: "/design-lab/rewards", icon: Gift },
  { label: "History", href: "/design-lab/history", icon: History },
  { label: "Profile", href: "/design-lab/profile", icon: UserCircle },
];

export function ShellDemo({ accent }) {
  return (
    <PortalShell
      brand={{ name: "Sahasra", tagline: "Design lab demo" }}
      nav={NAV}
      title="Good evening, Priya"
      subtitle="Demo content"
      accent={accent}
      user={{ name: "Priya Raman", role: "Customer" }}
      userMenu={
        <button type="button" className="flex h-11 w-full items-center gap-2 rounded-2xl px-3 text-sm font-semibold text-ink-destructive hover:bg-destructive/10" onClick={() => notify.info("Logged out (demo)")}>
          <LogOut className="size-4" aria-hidden /> Log out
        </button>
      }
      commands={[{ heading: "Jump to", items: NAV.map((n) => ({ id: n.href, label: n.label, icon: n.icon, onSelect: () => notify.info(n.label) })) }]}
      fab={<FloatingActionButton label="Quick actions" actions={[{ id: "b", label: "Book", icon: CalendarPlus, onClick: () => {} }, { id: "w", label: "Walk-in", icon: UserPlus, onClick: () => {} }]} />}
    >
      <Stagger className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          [IndianRupee, "Spent this year", 18450, (n) => formatMoney(n)],
          [CalendarCheck, "Visits", 14],
          [Wallet, "Wallet", 350, (n) => formatMoney(n)],
          [Users, "Friends invited", 3],
        ].map(([icon, label, value, format]) => (
          <StaggerItem key={label}>
            <StatCard icon={icon} label={label} value={value} format={format} />
          </StaggerItem>
        ))}
      </Stagger>
      <h2 className="mt-8 mb-3 font-display text-headline font-semibold">Recent bookings</h2>
      <ResponsiveTable
        rowKey={(r) => r.id}
        rows={demoBookings}
        columns={[
          { key: "service", header: "Service", primary: true },
          { key: "time", header: "Time", secondary: true },
          { key: "stylist", header: "Stylist" },
          { key: "amount", header: "Amount", align: "right", cell: (r) => formatMoney(r.amount) },
          { key: "status", header: "Status", trailing: true, cell: (r) => <StatusChip status={r.status} size="sm" audience="customer" /> },
        ]}
      />
      <div className="h-[60vh]" />
    </PortalShell>
  );
}

export function AuthDemo() {
  const [step, setStep] = useState("phone");
  const [otp, setOtp] = useState("");
  const { state, run } = useAsyncAction();
  return (
    <AuthLayout
      title="Your salon, one tap away"
      subtitle="Book, skip the queue, earn rewards."
      highlights={[
        { icon: Sparkles, label: "Instant booking" },
        { icon: Hourglass, label: "Live queue" },
        { icon: Gift, label: "Refer & earn" },
      ]}
      footer={<>New here? <a className="font-semibold text-portal" href="/design-lab?demo=auth">Create account</a></>}
    >
      <h2 className="font-display text-title font-bold">{step === "phone" ? "Sign in" : "Enter the code"}</h2>
      <p className="mt-1 mb-6 flex items-center gap-1.5 text-caption text-ink-neutral">
        {step === "phone" ? <Smartphone className="size-4" aria-hidden /> : <ShieldCheck className="size-4" aria-hidden />}
        {step === "phone" ? "We'll text you a code" : "Sent to +91 98765 43210"}
      </p>
      {step === "phone" ? (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void run(() => new Promise((r) => setTimeout(r, 900))).then(() => setTimeout(() => setStep("otp"), 500));
          }}
        >
          <FloatingLabelInput label="Phone number" icon={Smartphone} type="tel" inputMode="tel" autoComplete="tel" />
          <ButtonLoadingMorph type="submit" fullWidth size="lg" state={state} successLabel="Code sent">
            Send code
          </ButtonLoadingMorph>
        </form>
      ) : (
        <OtpInput value={otp} onChange={setOtp} onComplete={() => notify.success("Signed in (demo)")} />
      )}
    </AuthLayout>
  );
}
