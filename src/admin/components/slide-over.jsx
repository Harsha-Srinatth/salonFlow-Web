"use client";
import { ResponsiveModal } from "@/components/kit";

/**
 * Long admin forms and detail views: the kit's ResponsiveModal (spring bottom sheet with
 * a close button on phones (drag from the handle only, so scrolling a long form never closes it),
 * morphing dialog on ≥768px). Kept under the old name so callers read
 * the same; children scroll inside the kit's padded body.
 * @param {{ open: boolean, onOpenChange: (o:boolean)=>void, title: string, description?: string, icon?: any,
 *   tone?: string, size?: "sm"|"md"|"lg"|"xl", footer?: React.ReactNode, layoutId?: string, children: React.ReactNode }} props
 */
export function SlideOver({ open, onOpenChange, title, description, icon, tone, size = "lg", footer, layoutId, className, children }) {
  return (
    <ResponsiveModal open={open} onOpenChange={onOpenChange} title={title ?? ""} description={description} icon={icon} tone={tone} size={size} footer={footer} layoutId={layoutId} handleOnly className={className}>
      {children}
    </ResponsiveModal>
  );
}
