import { useState } from "react";
import { BarChart3, Bell, CalendarCheck, Gift, IndianRupee, Plus, Scissors, Settings, Shuffle, Star, Ticket, Trash2, Users } from "lucide-react";
import { formatMoney, formatPhone } from "@/lib/format";
import { buildReferralLink } from "@/lib/referral";
import { iconForCategory } from "@/lib/service-icons";
import {
  Avatar,
  AvatarGroup,
  BookingTimeline,
  ButtonLoadingMorph,
  EmptyState,
  ErrorState,
  IconButton,
  IconLabel,
  InviteSheet,
  PriceTag,
  ProgressRing,
  QueueList,
  QueuePosition,
  Rating,
  ReferralShareCard,
  ResponsiveTable,
  RewardReveal,
  StatCard,
  StatusChip,
  STATUS_META,
} from "@/components/kit";
import { Grid, Row, Section, Specimen, wait } from "./lab-ui";
import { demoBookings, demoQueue } from "./demo-data";

const COLUMNS = [
  { key: "customer", header: "Customer", primary: true, cell: (r) => <span className="flex items-center gap-2"><Avatar name={r.customer} size="xs" />{r.customer}</span> },
  { key: "service", header: "Service", secondary: true },
  { key: "stylist", header: "Stylist" },
  { key: "time", header: "Time" },
  { key: "amount", header: "Amount", align: "right", cell: (r) => formatMoney(r.amount) },
  { key: "status", header: "Status", trailing: true, cell: (r) => <StatusChip status={r.status} size="sm" /> },
];

export function DataSection() {
  const [queue, setQueue] = useState(demoQueue);
  const [chipStatus, setChipStatus] = useState("PENDING");
  const [rating, setRating] = useState(4);
  const position = queue.findIndex((q) => q.highlight) + 1;
  const flow = ["PENDING", "CONFIRMED", "STARTED", "COMPLETED", "CANCELLED", "NO-SHOW"];
  return (
    <Section id="data" title="Data display" icon={BarChart3}>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={IndianRupee} label="Revenue today" value={48250} format={(n) => formatMoney(n)} delta={12} trend={[12, 18, 14, 22, 19, 28, 31]} />
        <StatCard icon={CalendarCheck} label="Bookings" value={36} delta={-4} tone="info" trend={[30, 34, 38, 33, 36, 35, 36]} />
        <StatCard icon={Users} label="Walk-ins" value={9} tone="plum" onClick={() => {}} />
        <StatCard loading label="Loading" value={0} />
      </div>
      <Grid>
        <Specimen title="ProgressRing">
          <Row className="justify-around">
            <ProgressRing value={72} label="Profile complete" />
            <ProgressRing value={3} max={5} tone="gold" size={80} label="Visits to next reward">
              <span className="text-center">
                <span className="block font-display text-lg font-bold">3/5</span>
                <span className="block text-micro text-ink-neutral">visits</span>
              </span>
            </ProgressRing>
            <ProgressRing value={100} tone="success" size={64} stroke={7} label="Done" />
          </Row>
        </Specimen>
        <Specimen title="StatusChip — the shared mapping" wide className="xl:col-span-2">
          <Row>
            {Object.keys(STATUS_META).map((s) => (
              <StatusChip key={s} status={s} />
            ))}
          </Row>
          <Row className="mt-3">
            <StatusChip status="NO-SHOW" audience="customer" />
            <StatusChip status="STARTED" size="sm" />
            <StatusChip status="COMPLETED" iconOnly />
            <StatusChip status="SOMETHING_NEW" />
          </Row>
          <Row className="mt-3">
            <ButtonLoadingMorph size="sm" variant="outline" icon={Shuffle} onClick={() => setChipStatus((s) => flow[(flow.indexOf(s) + 1) % flow.length])}>
              Cycle status
            </ButtonLoadingMorph>
            <StatusChip status={chipStatus} />
          </Row>
        </Specimen>
        <Specimen title="BookingTimeline" wide>
          <div className="space-y-6">
            {["CONFIRMED", "STARTED", "COMPLETED", "CANCELLED"].map((s) => (
              <BookingTimeline key={s} status={s} times={{ PENDING: new Date().toISOString() }} />
            ))}
          </div>
        </Specimen>
        <Specimen title="BookingTimeline (vertical, staff)">
          <BookingTimeline status="NO-SHOW" orientation="vertical" audience="staff" times={{ CONFIRMED: new Date().toISOString() }} />
        </Specimen>
        <Specimen title="QueuePosition · QueueList (live reorder)" wide className="xl:col-span-2">
          <div className="grid gap-4 md:grid-cols-2">
            <QueuePosition position={position} waitMinutes={queue[position - 1]?.waitMinutes} ticket="A14" />
            <QueueList entries={queue} />
          </div>
          <Row className="mt-3">
            <ButtonLoadingMorph size="sm" variant="outline" icon={Shuffle} onClick={() => setQueue((q) => (q.length > 1 ? [...q.slice(1), q[0]].map((e, i) => ({ ...e, status: i === 0 ? "STARTED" : "CONFIRMED" })) : q))}>
              Advance queue
            </ButtonLoadingMorph>
          </Row>
        </Specimen>
        <Specimen title="QueuePosition" state="in service">
          <QueuePosition position={1} status="STARTED" peopleAhead={0} />
        </Specimen>
        <Specimen title="ResponsiveTable (cards below 768px)" wide>
          <ResponsiveTable columns={COLUMNS} rows={demoBookings} caption="Today's bookings" onRowClick={() => {}} />
        </Specimen>
        <Specimen title="ResponsiveTable" state="loading">
          <ResponsiveTable columns={COLUMNS} rows={[]} loading />
        </Specimen>
        <Specimen title="ResponsiveTable" state="empty">
          <ResponsiveTable columns={COLUMNS} rows={[]} empty={<EmptyState compact illustration="calendar" title="No bookings yet" />} />
        </Specimen>
        <Specimen title="Avatar · AvatarGroup">
          <Row>
            {["xs", "sm", "md", "lg", "xl"].map((s, i) => (
              <Avatar key={s} name={["Anita Rao", "Ravi K", "Meera S", "Kavya", "Arjun M"][i]} size={s} status={["online", "busy", "away", undefined, "offline"][i]} />
            ))}
          </Row>
          <AvatarGroup className="mt-3" people={["Anita", "Ravi", "Meera", "Kavya", "Arjun", "Sneha"].map((name) => ({ name }))} />
        </Specimen>
        <Specimen title="IconLabel · IconButton">
          <div className="space-y-3">
            <IconLabel icon={Scissors} label="Haircut & style" sub="45 min" />
            <IconLabel icon={Ticket} label="2 offers" tone="gold" size="sm" />
            <Row>
              <IconButton icon={Bell} label="Notifications" badge={3} />
              <IconButton icon={Plus} label="Add" variant="solid" />
              <IconButton icon={Settings} label="Settings" variant="soft" />
              <IconButton icon={Trash2} label="Delete" variant="danger" size="sm" />
              <IconButton icon={Star} label="Favourite" variant="outline" active />
              <IconButton icon={Settings} label="Disabled" disabled />
            </Row>
          </div>
        </Specimen>
        <Specimen title="PriceTag · Rating · formatters">
          <div className="space-y-3">
            <PriceTag amount={899} listPrice={1199} />
            <PriceTag amount={1450} member size="lg" />
            <PriceTag amount={49900} paise from size="sm" />
            <Rating value={4.5} showValue count={128} />
            <Rating value={rating} onChange={setRating} size="lg" label="Rate your visit" />
            <p className="text-caption text-ink-neutral">
              {formatPhone("9876543210")} · {formatMoney(1234567, { compact: true })} · {formatMoney(12345, { paise: true, decimals: true })}
            </p>
            <Row>
              {["Haircut", "Hair colour", "Facial", "Nails", "Spa massage", "Bridal makeup", "Kids grooming", "Beard"].map((c) => {
                const Icon = iconForCategory(c);
                return <IconLabel key={c} icon={Icon} label={c} size="sm" />;
              })}
            </Row>
          </div>
        </Specimen>
      </Grid>
    </Section>
  );
}

export function Rewards() {
  const [invite, setInvite] = useState(false);
  const [key, setKey] = useState(0);
  const link = buildReferralLink("SAHA7Q2");
  return (
    <Section id="rewards" title="Rewards & referral" icon={Gift}>
      <Grid>
        <Specimen title="RewardReveal (scratch card)">
          <RewardReveal key={key} reward={{ title: "Free hair spa", subtitle: "Valid for 30 days", icon: Gift }} />
          <button type="button" className="mt-2 h-9 rounded-full bg-muted px-3 text-caption font-semibold" onClick={() => setKey((k) => k + 1)}>
            Reset
          </button>
        </Specimen>
        <Specimen title="ReferralShareCard (demo values)">
          <ReferralShareCard code="SAHA7Q2" link={link} walletBalance={350} pendingCredit={100} progress={{ current: 2, target: 3, label: "Friends who visited" }} onInvite={() => setInvite(true)} />
        </Specimen>
        <Specimen title="InviteSheet">
          <ButtonLoadingMorph variant="outline" onClick={() => setInvite(true)}>
            Open invite sheet
          </ButtonLoadingMorph>
          <InviteSheet open={invite} onOpenChange={setInvite} link={link} code="SAHA7Q2" />
        </Specimen>
      </Grid>
    </Section>
  );
}

export function States() {
  return (
    <Section id="states" title="Empty, error & offline states" icon={Ticket}>
      <Grid>
        {[
          ["calendar", "No upcoming visits", "Book your next look in a few taps.", "Book now"],
          ["search", "No matches", "Try a different word.", null],
          ["queue", "Queue is empty", "Walk right in.", null],
          ["gift", "No rewards yet", "Invite a friend to start earning.", "Invite"],
          ["bag", "Nothing in your cart", "Pick a service to begin.", "Browse"],
        ].map(([ill, title, desc, cta]) => (
          <Specimen key={ill} title={`EmptyState · ${ill}`}>
            <EmptyState illustration={ill} title={title} description={desc} action={cta ? <ButtonLoadingMorph size="sm">{cta}</ButtonLoadingMorph> : null} compact />
          </Specimen>
        ))}
        <Specimen title="EmptyState (legacy icon API)">
          <EmptyState icon={Users} title="No staff yet" description="Add your first stylist." compact />
        </Specimen>
        <Specimen title="ErrorState · retry">
          <ErrorState compact onRetry={() => wait(1200)} description="We couldn't load your bookings." />
        </Specimen>
        <Specimen title="ErrorState · offline">
          <ErrorState compact offline onRetry={() => wait(800)} />
        </Specimen>
      </Grid>
    </Section>
  );
}
