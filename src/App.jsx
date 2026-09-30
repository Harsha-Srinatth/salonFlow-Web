import { AuthProvider } from "@/components/auth/auth-provider"
import { GuestOnlyRoute } from "@/components/auth/guest-only-route"
import { RequireRole } from "@/components/auth/require-role"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/sonner"
import AdminAppointmentsPage from "@/admin/pages/appointments-page"
import AdminCustomersPage from "@/admin/pages/customers-page"
import CreateStaffPage from "@/admin/pages/create-staff-page"
import AdminDashboardPage from "@/admin/pages/dashboard-page"
import AdminReportsPage from "@/admin/pages/reports-page"
import AdminSettingsPage from "@/admin/pages/settings-page"
import AdminServicesPage from "@/admin/pages/services-page"
import AdminStaffPermissionsPage from "@/admin/pages/staff-permissions-page"
import AdminStaffPayrollPage from "@/admin/pages/staff-payroll-page"
import AdminStylistLiveMonitorPage from "@/admin/pages/stylist-live-monitor-page"
import OfferCenterPage from "@/admin/pages/offer-center-page"
import AdminMembershipPage from "@/admin/pages/membership-page"
import AdminFeedbackPage from "@/admin/pages/feedback-page"
import AdminLoyaltyPage from "@/admin/pages/loyalty-page"
import EmployeeAppointmentsPage from "@/employee/pages/appointments-page"
import EmployeeDashboardPage from "@/employee/pages/dashboard-page"
import EmployeeProfilePage from "@/employee/pages/profile-page"
import LoginPage from "@/auth/pages/LoginPage"
import SignupPage from "@/auth/pages/SignupPage"
import AuthEmailVerifiedPage from "@/auth/pages/auth-email-verified-page"
import AuthResetPasswordPage from "@/auth/pages/auth-reset-password-page"
import StaffSetPasswordPage from "@/auth/pages/staff-set-password-page"
import StaffVerifyOtpPage from "@/auth/pages/staff-verify-otp-page"
import LandingPage from "@/landing/pages/LandingPage"
import ReceptionAppointmentsPage from "@/receptionist/pages/appointments-page"
import ReceptionDashboardPage from "@/receptionist/pages/dashboard-page"
import ReceptionProfilePage from "@/receptionist/pages/profile-page"
import ReceptionWalkInPage from "@/receptionist/pages/walk-in-page"
import UserAppointmentsPage from "@/user/pages/appointments-page"
import UserBookingHistoryPage from "@/user/pages/booking-history-page"
import UserOffersPage from "@/user/pages/offers-page"
import UserDashboardPage from "@/user/pages/dashboard-page"
import UserMembershipPage from "@/user/pages/membership-page"
import UserLoyaltyPage from "@/user/pages/loyalty-page"
import UserProfilePage from "@/user/pages/profile-page"
import UserQueuePage from "@/user/pages/queue-page"
import { Navigate, Route, Routes } from "react-router-dom"
import { Provider } from "react-redux"
import { store } from "@/store"

function App() {
  return (
    <ThemeProvider>
      <Provider store={store}>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<GuestOnlyRoute><LandingPage /></GuestOnlyRoute>} />
            <Route path="/auth/login" element={<GuestOnlyRoute><LoginPage /></GuestOnlyRoute>} />
            <Route path="/auth/signup" element={<GuestOnlyRoute><SignupPage /></GuestOnlyRoute>} />
            <Route path="/auth/reset-password" element={<AuthResetPasswordPage />} />
            {/* Not guest-only: the signup tab holds a Firebase session while it waits
                for this click, and in the same browser that would bounce the reader
                to a dashboard they have no account for yet. */}
            <Route path="/auth/verified" element={<AuthEmailVerifiedPage />} />
            <Route path="/staff/verify-otp" element={<StaffVerifyOtpPage />} />
            <Route path="/staff/set-password" element={<StaffSetPasswordPage />} />

            <Route element={<RequireRole roles={["ADMIN"]} />}>
              <Route path="/admin-dashboard" element={<AdminDashboardPage />} />
              <Route path="/admin-dashboard/appointments" element={<AdminAppointmentsPage />} />
              <Route path="/admin-dashboard/services" element={<AdminServicesPage />} />
              <Route path="/admin-dashboard/customers" element={<AdminCustomersPage />} />
              <Route path="/admin-dashboard/reports" element={<AdminReportsPage />} />
              <Route path="/admin-dashboard/settings" element={<AdminSettingsPage />} />
              <Route path="/admin-dashboard/staff/new" element={<CreateStaffPage />} />
              <Route path="/admin-dashboard/staff/permissions" element={<AdminStaffPermissionsPage />} />
              <Route path="/admin-dashboard/staff/payroll" element={<AdminStaffPayrollPage />} />
              <Route path="/admin-dashboard/staff/live-monitor" element={<AdminStylistLiveMonitorPage />} />
              <Route path="/admin-dashboard/offers" element={<OfferCenterPage />} />
              <Route path="/admin-dashboard/membership" element={<AdminMembershipPage />} />
              <Route path="/admin-dashboard/feedback" element={<AdminFeedbackPage />} />
              <Route path="/admin-dashboard/loyalty" element={<AdminLoyaltyPage />} />
            </Route>

            <Route element={<RequireRole roles={["STAFF"]} />}>
              <Route path="/employee-dashboard" element={<EmployeeDashboardPage />} />
              <Route path="/employee-dashboard/appointments" element={<EmployeeAppointmentsPage />} />
              <Route path="/employee-dashboard/profile" element={<EmployeeProfilePage />} />
            </Route>

            <Route element={<RequireRole roles={["RECEPTIONIST"]} />}>
              <Route path="/reception-dashboard" element={<ReceptionDashboardPage />} />
              <Route path="/reception-dashboard/walk-in" element={<ReceptionWalkInPage />} />
              <Route path="/reception-dashboard/appointments" element={<ReceptionAppointmentsPage />} />
              <Route path="/reception-dashboard/profile" element={<ReceptionProfilePage />} />
            </Route>

            <Route element={<RequireRole roles={["USER"]} />}>
              <Route path="/user-dashboard" element={<UserDashboardPage />} />
              <Route path="/user-dashboard/appointments" element={<UserAppointmentsPage />} />
              <Route path="/user-dashboard/queue" element={<UserQueuePage />} />
              <Route path="/user-dashboard/offers" element={<UserOffersPage />} />
              <Route path="/user-dashboard/membership" element={<UserMembershipPage />} />
              <Route path="/user-dashboard/loyalty" element={<UserLoyaltyPage />} />
              <Route path="/user-dashboard/booking-history" element={<UserBookingHistoryPage />} />
              <Route path="/user-dashboard/profile" element={<UserProfilePage />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <Toaster />
        </AuthProvider>
      </Provider>
    </ThemeProvider>
  )
}

export default App
