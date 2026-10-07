import { createSelector } from "@reduxjs/toolkit";

/**
 * Memoized list of loaded bookings. The store's `selectAdminAppointments` builds a new array on
 * every call, which re-renders any subscriber (the persistent shell included) on every store change.
 */
export const selectAppointmentsList = createSelector(
  [(state) => state.adminPortal.appointmentIds, (state) => state.adminPortal.appointmentsById],
  (ids, byId) => ids.map((id) => byId[id]).filter(Boolean)
);
