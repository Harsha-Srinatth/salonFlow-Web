"use client";
import { ButtonLoadingMorph, EmptyState as KitEmptyState } from "@/components/kit";

/**
 * Kit EmptyState (illustration, short title, one action) with the admin's older
 * `actionLabel` / `onAction` shorthand. Pass `action` for a custom node instead.
 */
export function EmptyState({ actionLabel, onAction, actionIcon, action, ...props }) {
  return (
    <KitEmptyState
      {...props}
      action={
        action ??
        (actionLabel ? (
          <ButtonLoadingMorph size="md" icon={actionIcon} onClick={onAction}>
            {actionLabel}
          </ButtonLoadingMorph>
        ) : null)
      }
    />
  );
}
