import { ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

/** Section title row: icon chip, title, optional "See all" link or custom trailing node. */
export function SectionHeading({ icon: Icon, title, to, linkLabel = "See all", trailing, className, as: Tag = "h2" }) {
  return (
    <div className={cn("mb-3 flex items-center gap-2.5", className)}>
      {Icon ? (
        <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-portal/12 text-portal">
          <Icon className="size-[18px]" aria-hidden />
        </span>
      ) : null}
      <Tag className="min-w-0 flex-1 truncate font-display text-headline font-semibold">{title}</Tag>
      {trailing}
      {to ? (
        <Link to={to} className="tap inline-flex h-9 items-center gap-0.5 rounded-full px-3 text-caption font-semibold text-portal hover:bg-portal/10">
          {linkLabel} <ChevronRight className="size-4" aria-hidden />
        </Link>
      ) : null}
    </div>
  );
}
