import { selectAppointmentsList } from "@/admin/lib/selectors";
import { CalendarClock, Gift, Moon, Plus, Scissors, Store, Sun, UserPlus, UserRound, Users } from "lucide-react";
import { useMemo } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { useAppThemeToggle } from "@/components/theme-provider";
import { formatMoney } from "@/lib/format";
import { salonRelativeDayLabel, salonDateOf, salonTimeLabel } from "@/lib/salon-date";
import { adminNavGroups } from "./nav-config";

const MAX_PER_GROUP = 40;

/**
 * Groups for the admin command palette (⌘K). Everything comes from data the store already holds
 * (bookings, services, staff); nothing is fetched here. Selecting an entity deep-links to its page
 * with a query param the page understands (?q= search, ?edit= open editor, ?booking= open details).
 */
export function useAdminCommands() {
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useAppThemeToggle();
  const appointments = useSelector(selectAppointmentsList);
  const portalServices = useSelector((state) => state.adminPortal.services);
  const { staff, servicesCatalog } = useSelector((state) => state.adminDashboard);

  return useMemo(() => {
    const services = portalServices.length ? portalServices : servicesCatalog;
    const go = (href) => () => navigate(href);

    const groups = adminNavGroups.map((group) => ({
      heading: group.label,
      items: group.items.map((item) => ({ id: `nav:${item.href}`, label: item.label, icon: item.icon, hint: item.description, keywords: [item.description, group.label], onSelect: go(item.href) })),
    }));

    groups.unshift({
      heading: "Quick actions",
      items: [
        { id: "act:service", label: "Add a service", icon: Plus, keywords: ["new", "create", "menu"], onSelect: go("/admin-dashboard/services?new=1") },
        { id: "act:staff", label: "Create staff account", icon: UserPlus, keywords: ["new", "employee", "receptionist"], onSelect: go("/admin-dashboard/staff/new") },
        { id: "act:offer", label: "Create an offer", icon: Gift, keywords: ["new", "discount", "combo"], onSelect: go("/admin-dashboard/offers?new=1") },
        { id: "act:salon", label: "Add a salon location", icon: Store, keywords: ["branch", "address"], onSelect: go("/admin-dashboard/settings?section=salons") },
        { id: "act:theme", label: isDark ? "Switch to light mode" : "Switch to dark mode", icon: isDark ? Sun : Moon, keywords: ["theme", "dark", "light"], onSelect: toggleTheme },
      ],
    });

    if (appointments.length) {
      groups.push({
        heading: "Bookings",
        items: appointments.slice(0, MAX_PER_GROUP).map((b) => ({
          id: `booking:${b.id}`,
          label: `${b.customer ?? "Customer"} · ${b.service ?? "Service"}`,
          icon: CalendarClock,
          hint: b.startsAt ? `${salonRelativeDayLabel(salonDateOf(b.startsAt))} ${salonTimeLabel(b.startsAt)}` : undefined,
          keywords: [b.customerPhone, b.customerEmail, b.stylistName, b.status].filter(Boolean),
          onSelect: go(`/admin-dashboard/appointments?q=${encodeURIComponent(b.customer ?? "")}&booking=${encodeURIComponent(b.id)}`),
        })),
      });
      const seen = new Map();
      for (const b of appointments) {
        const key = `${b.customer ?? ""}|${b.customerPhone ?? ""}`;
        if (b.customer && !seen.has(key)) seen.set(key, b);
      }
      if (seen.size) {
        groups.push({
          heading: "Customers",
          items: [...seen.values()].slice(0, MAX_PER_GROUP).map((b) => ({
            id: `customer:${b.customer}|${b.customerPhone ?? ""}`,
            label: b.customer,
            icon: UserRound,
            hint: "Bookings",
            keywords: [b.customerPhone, b.customerEmail].filter(Boolean),
            onSelect: go(`/admin-dashboard/appointments?q=${encodeURIComponent(b.customer)}`),
          })),
        });
      }
    }

    if (staff.length) {
      groups.push({
        heading: "Staff",
        items: staff.slice(0, MAX_PER_GROUP).map((member) => ({
          id: `staff:${member.id}`,
          label: member.name ?? member.email ?? "Team member",
          icon: Users,
          hint: member.role === "RECEPTIONIST" ? "Receptionist" : "Employee",
          keywords: [member.email, member.phone].filter(Boolean),
          onSelect: go(`/admin-dashboard/staff?edit=${encodeURIComponent(member.id)}`),
        })),
      });
    }

    if (services.length) {
      groups.push({
        heading: "Services",
        items: services.slice(0, MAX_PER_GROUP).map((service) => ({
          id: `service:${service.id}`,
          label: service.name,
          icon: Scissors,
          hint: formatMoney(service.basePrice),
          keywords: [service.category, service.gender].filter(Boolean),
          onSelect: go(`/admin-dashboard/services?edit=${encodeURIComponent(service.id)}`),
        })),
      });
    }

    return groups;
  }, [appointments, isDark, navigate, portalServices, servicesCatalog, staff, toggleTheme]);
}
