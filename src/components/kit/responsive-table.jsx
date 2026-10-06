import { motion, useReducedMotion } from "motion/react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMediaQuery } from "@/lib/use-media-query";
import { spring } from "@/components/motion/presets";
import { SkeletonList, SkeletonTable } from "@/components/motion/skeleton-shimmer";

/**
 * Table on ≥768px, stacked cards on phones (no horizontal scroll, ever).
 * Column: { key, header, cell?: (row)=>node, align?: "left"|"right"|"center", primary?: bool (card title),
 *   secondary?: bool (card subtitle), trailing?: bool (card top-right, e.g. StatusChip), hideOnMobile?: bool, width?: string }
 * @param {{ columns: object[], rows: object[], rowKey?: (row)=>string, onRowClick?: (row)=>void, loading?: boolean,
 *   empty?: React.ReactNode, caption?: string, mobileCard?: (row)=>React.ReactNode, className?: string }} props
 */
export function ResponsiveTable({ columns, rows = [], rowKey = (r) => r.id, onRowClick, loading = false, empty = null, caption, mobileCard, className }) {
  const desktop = useMediaQuery("(min-width: 768px)");
  const reduce = useReducedMotion();
  const val = (col, row) => (col.cell ? col.cell(row) : row[col.key]);

  if (loading && !rows.length) return desktop ? <SkeletonTable cols={Math.min(columns.length, 5)} className={className} /> : <SkeletonList className={className} />;
  if (!rows.length) return empty;

  if (desktop) {
    return (
      <div className={cn("overflow-hidden rounded-card border border-border/60 bg-card shadow-soft", className)}>
        <table className="w-full border-collapse text-sm">
          {caption ? <caption className="sr-only">{caption}</caption> : null}
          <thead className="sticky top-0 z-[1] bg-muted/60 backdrop-blur">
            <tr>
              {columns.map((col) => (
                <th key={col.key} scope="col" style={{ width: col.width }} className={cn("px-4 py-3 text-left text-micro font-semibold uppercase text-ink-neutral", col.align === "right" && "text-right", col.align === "center" && "text-center")}>
                  {col.header}
                </th>
              ))}
              {onRowClick ? <th aria-hidden className="w-10" /> : null}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <motion.tr
                key={rowKey(row)}
                initial={reduce ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...spring.soft, delay: Math.min(i, 10) * 0.02 }}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                onKeyDown={onRowClick ? (e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onRowClick(row)) : undefined}
                tabIndex={onRowClick ? 0 : undefined}
                className={cn("border-t border-border/50 transition-colors", onRowClick && "cursor-pointer hover:bg-muted/50 focus-visible:bg-muted/60")}
              >
                {columns.map((col) => (
                  <td key={col.key} className={cn("px-4 py-3 align-middle", col.align === "right" && "text-right tabular-nums", col.align === "center" && "text-center")}>
                    {val(col, row)}
                  </td>
                ))}
                {onRowClick ? (
                  <td className="pr-3 text-ink-neutral">
                    <ChevronRight className="size-4" aria-hidden />
                  </td>
                ) : null}
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  const primary = columns.find((c) => c.primary) ?? columns[0];
  const secondary = columns.find((c) => c.secondary);
  const trailing = columns.find((c) => c.trailing);
  const rest = columns.filter((c) => c !== primary && c !== secondary && c !== trailing && !c.hideOnMobile);
  return (
    <ul className={cn("space-y-2.5", className)} aria-label={caption}>
      {rows.map((row, i) => {
        const Comp = onRowClick ? motion.button : motion.div;
        return (
          <li key={rowKey(row)}>
            <Comp
              type={onRowClick ? "button" : undefined}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              initial={reduce ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              whileTap={onRowClick && !reduce ? { scale: 0.98 } : undefined}
              transition={{ ...spring.soft, delay: Math.min(i, 10) * 0.03 }}
              className="block w-full rounded-2xl border border-border/60 bg-card p-4 text-left shadow-soft"
            >
              {mobileCard ? (
                mobileCard(row)
              ) : (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate font-semibold">{val(primary, row)}</div>
                      {secondary ? <div className="mt-0.5 truncate text-caption text-ink-neutral">{val(secondary, row)}</div> : null}
                    </div>
                    {trailing ? <div className="shrink-0">{val(trailing, row)}</div> : null}
                  </div>
                  {rest.length ? (
                    <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-border/50 pt-3">
                      {rest.map((col) => (
                        <div key={col.key} className="min-w-0">
                          <dt className="text-micro font-semibold uppercase text-ink-neutral">{col.header}</dt>
                          <dd className="mt-0.5 truncate text-sm">{val(col, row)}</dd>
                        </div>
                      ))}
                    </dl>
                  ) : null}
                </>
              )}
            </Comp>
          </li>
        );
      })}
    </ul>
  );
}
