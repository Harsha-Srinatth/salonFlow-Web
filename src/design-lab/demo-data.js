// Demo data for the design lab ONLY. Never import from product code.
import { addDaysIso, salonDateIso } from "@/lib/salon-date";

export function demoAvailability(days = 30) {
  const today = salonDateIso(0);
  const states = ["free", "free", "limited", "free", "busy", "free", "closed"];
  return Object.fromEntries(Array.from({ length: days }, (_, i) => [addDaysIso(today, i), states[(i * 3 + 1) % states.length]]));
}

/** Slots for a salon day 9:00–20:30 every 30 min, as ISO instants in IST (+05:30). */
export function demoSlots(dateIso = salonDateIso(1)) {
  const out = [];
  for (let m = 9 * 60; m <= 20 * 60 + 30; m += 30) {
    const hh = String(Math.floor(m / 60)).padStart(2, "0");
    const mm = String(m % 60).padStart(2, "0");
    const i = out.length;
    const availability = i % 7 === 3 ? "busy" : i % 5 === 2 ? "limited" : i === 1 ? "unavailable" : "free";
    out.push({
      startsAt: new Date(`${dateIso}T${hh}:${mm}:00+05:30`).toISOString(),
      availability,
      seatsLeft: availability === "limited" ? 1 + (i % 2) : undefined,
      reason: availability === "unavailable" ? "Stylist on break" : undefined,
    });
  }
  return out;
}

export const demoQueue = [
  { ticket: "A12", name: "Priya Raman", status: "STARTED", waitMinutes: 0 },
  { ticket: "A13", name: "Arjun Mehta", status: "CONFIRMED", waitMinutes: 15 },
  { ticket: "A14", name: "You", status: "CONFIRMED", waitMinutes: 35, highlight: true },
  { ticket: "A15", name: "Kavya Iyer", status: "PENDING", waitMinutes: 50 },
];

export const demoBookings = [
  { id: "b1", customer: "Priya Raman", service: "Hair spa", stylist: "Anita", time: "10:30 am", amount: 1450, status: "CONFIRMED" },
  { id: "b2", customer: "Arjun Mehta", service: "Beard trim", stylist: "Ravi", time: "11:00 am", amount: 350, status: "STARTED" },
  { id: "b3", customer: "Kavya Iyer", service: "Bridal makeup trial", stylist: "Meera", time: "12:15 pm", amount: 4200, status: "PENDING" },
  { id: "b4", customer: "Rahul Das", service: "Haircut", stylist: "Ravi", time: "9:30 am", amount: 400, status: "COMPLETED" },
  { id: "b5", customer: "Sneha Pillai", service: "Pedicure", stylist: "Anita", time: "9:00 am", amount: 700, status: "NO-SHOW" },
  { id: "b6", customer: "Vikram Rao", service: "Facial", stylist: "Meera", time: "8:30 am", amount: 1200, status: "CANCELLED" },
];
