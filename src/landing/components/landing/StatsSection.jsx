import { Clock, MessageSquareQuote, Star } from "lucide-react";
import { GOOGLE_RATING } from "@/lib/public-claims";
import { useBusinessInfo } from "@/lib/business-info";
import { Rating } from "@/components/kit/rating";

const formatRating = (n) => n.toFixed(1);

function Tile({ className = "", children }) {
  return <li className={`relative overflow-hidden rounded-card border border-border bg-card p-6 sm:p-7 ${className}`}>{children}</li>;
}

/**
 * Proof band. Only attributable numbers: the Google rating and review count from
 * lib/public-claims (sourced from the salon's Google listing) and opening hours from the salon's
 * own settings. Nothing is estimated or rounded up.
 */
export default function StatsSection() {
  const { info } = useBusinessInfo();
  const hours = info?.hours;
  const rating = Number(GOOGLE_RATING.value);
  const reviews = Number(GOOGLE_RATING.reviews);

  return (
    <section aria-label="Ratings" className="py-8 sm:py-12">
      <ul className={`mx-auto grid w-full max-w-[var(--content-max)] gap-4 px-[var(--gutter)] sm:grid-cols-2 ${hours ? "lg:grid-cols-3" : ""}`}>
        <Tile className={`${hours ? "sm:col-span-2 lg:col-span-1" : ""}`}>
          <p className="flex items-center gap-2 text-caption font-semibold text-ink-neutral">
            <Star className="size-4 fill-gold text-gold" aria-hidden /> Google rating
          </p>
          <p className="mt-3 flex items-end gap-2">
            <span className="font-display text-display-xl font-bold">{formatRating(rating)}</span>
            <span className="pb-2 text-headline font-semibold text-ink-neutral">/ 5</span>
          </p>
          <Rating value={rating} size="md" label="Google rating" className="mt-2" />
        </Tile>
        <Tile>
          <p className="flex items-center gap-2 text-caption font-semibold text-ink-neutral">
            <MessageSquareQuote className="size-4 text-ink-primary" aria-hidden /> Google reviews
          </p>
          <span className="mt-3 block font-display text-display-xl font-bold tabular-nums">{reviews.toLocaleString("en-IN")}</span>
          <p className="mt-2 text-sm text-ink-neutral">On our Google listing</p>
        </Tile>
        {hours ? (
          <Tile>
            <p className="flex items-center gap-2 text-caption font-semibold text-ink-neutral">
              <Clock className="size-4 text-ink-primary" aria-hidden /> Open {hours.days}
            </p>
            <p className="mt-3 font-display text-title font-bold">
              {hours.opens} – {hours.closes}
            </p>
            {hours.lunchBreak ? (
              <p className="mt-2 text-sm text-ink-neutral">
                Lunch {hours.lunchBreak.from} – {hours.lunchBreak.to}
              </p>
            ) : null}
          </Tile>
        ) : null}
      </ul>
    </section>
  );
}
