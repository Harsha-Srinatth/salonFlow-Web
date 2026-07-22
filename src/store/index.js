import { configureStore } from "@reduxjs/toolkit";
import { adminDashboardReducer } from "./admin-dashboard-slice";
import { adminPortalReducer } from "./admin-portal-slice";
import { customerBookingsReducer } from "./customer-bookings-slice";
import { receptionBookingsReducer } from "./reception-bookings-slice";

export const store = configureStore({
  reducer: {
    adminDashboard: adminDashboardReducer,
    adminPortal: adminPortalReducer,
    customerBookings: customerBookingsReducer,
    receptionBookings: receptionBookingsReducer,
  },
});
