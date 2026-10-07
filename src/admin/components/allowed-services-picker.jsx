"use client";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { ButtonLoadingMorph } from "@/components/kit";
import { ToggleChip } from "./toggle-chip";

const categoryOf = (service) => `${service.category ?? ""}`.trim() || "General";

/** Shared by Team and Permissions: allowed services grouped by category, with add/remove-all per group. */
export function AllowedServicesPicker({ services, selected, onChange }) {
  const [q, setQ] = useState("");
  const grouped = useMemo(() => {
    const query = q.trim().toLowerCase();
    const groups = new Map();
    for (const service of services) {
      if (query && !`${service.name ?? ""} ${service.category ?? ""}`.toLowerCase().includes(query)) continue;
      groups.set(categoryOf(service), [...(groups.get(categoryOf(service)) ?? []), service]);
    }
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [services, q]);
  if (!services.length) return <p className="rounded-2xl border border-dashed border-border py-5 text-center text-caption text-ink-neutral">Add services first</p>;
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <label className="relative block min-w-0 flex-1">
          <span className="sr-only">Filter services</span>
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-neutral" aria-hidden />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter services" className="h-11 w-full rounded-control bg-muted/60 pr-3 pl-10 text-sm outline-none placeholder:text-ink-neutral focus-visible:ring-2 focus-visible:ring-portal" />
        </label>
        <span className="shrink-0 rounded-full bg-portal/12 px-3 py-1.5 text-caption font-bold text-portal tabular-nums">
          {selected.length}/{services.length}
        </span>
      </div>
      <div className="flex gap-2">
        <ButtonLoadingMorph size="sm" variant="outline" onClick={() => onChange(services.map((s) => s.id))}>
          All
        </ButtonLoadingMorph>
        <ButtonLoadingMorph size="sm" variant="ghost" onClick={() => onChange([])}>
          None
        </ButtonLoadingMorph>
      </div>
      {grouped.map(([category, list]) => {
        const ids = list.map((s) => s.id);
        const all = ids.every((id) => selected.includes(id));
        return (
          <div key={category} className="rounded-2xl bg-muted/40 p-3 ring-1 ring-inset ring-border/60">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-micro font-semibold uppercase text-ink-neutral">
                {category} · {ids.filter((id) => selected.includes(id)).length}/{ids.length}
              </p>
              <button type="button" className="tap text-caption font-semibold text-portal hover:underline" onClick={() => onChange(all ? selected.filter((id) => !ids.includes(id)) : Array.from(new Set([...selected, ...ids])))}>
                {all ? "Remove all" : "Add all"}
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {list.map((service) => (
                <ToggleChip key={service.id} size="sm" selected={selected.includes(service.id)} onClick={() => onChange(selected.includes(service.id) ? selected.filter((id) => id !== service.id) : [...selected, service.id])}>
                  {service.name}
                </ToggleChip>
              ))}
            </div>
          </div>
        );
      })}
      {!grouped.length ? <p className="py-3 text-center text-caption text-ink-neutral">No matches</p> : null}
    </div>
  );
}

