"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CalendarDays, CreditCard, UserPlus } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

const actions = [
  {
    label: "New walk-in",
    description: "Customer & services",
    href: "/reception-dashboard/walk-in",
    icon: UserPlus,
    variant: "default",
  },
  {
    label: "Today's schedule",
    description: "All bookings",
    href: "/reception-dashboard/appointments",
    icon: CalendarDays,
    variant: "outline",
  },
  {
    label: "Collect payment",
    description: "Cash or UPI",
    href: "/reception-dashboard#collect-payment",
    icon: CreditCard,
    variant: "outline",
  },
];

export function ReceptionQuickActions({ className }) {
  const { pathname } = useLocation();

  return (
    <div className={cn("flex flex-wrap gap-2 sm:gap-3", className)}>
      {actions.map((action) => {
        const Icon = action.icon;
        const isHashLink = action.href.includes("#");
        const basePath = action.href.split("#")[0];
        const isActive =
          !isHashLink &&
          (pathname === action.href || (basePath !== "/reception-dashboard" && pathname.startsWith(action.href)));

        if (isHashLink) {
          return (
            <Button
              key={action.label}
              asChild
              variant={pathname === "/reception-dashboard" ? "secondary" : action.variant}
              className="h-auto min-h-11 flex-1 basis-[calc(50%-0.25rem)] flex-col items-start gap-0.5 px-4 py-3 text-left sm:flex-none sm:flex-row sm:items-center sm:gap-2 sm:py-2"
            >
              <Link to={action.href}>
                <Icon className="size-4 shrink-0" />
                <span>
                  <span className="block font-semibold leading-tight">{action.label}</span>
                  <span className="block text-xs font-normal opacity-80">{action.description}</span>
                </span>
              </Link>
            </Button>
          );
        }

        return (
          <Button
            key={action.label}
            asChild
            variant={isActive ? "default" : action.variant}
            className="h-auto min-h-11 flex-1 basis-[calc(50%-0.25rem)] flex-col items-start gap-0.5 px-4 py-3 text-left sm:flex-none sm:flex-row sm:items-center sm:gap-2 sm:py-2"
          >
            <Link to={action.href}>
              <Icon className="size-4 shrink-0" />
              <span>
                <span className="block font-semibold leading-tight">{action.label}</span>
                <span className="block text-xs font-normal opacity-80">{action.description}</span>
              </span>
            </Link>
          </Button>
        );
      })}
    </div>
  );
}
