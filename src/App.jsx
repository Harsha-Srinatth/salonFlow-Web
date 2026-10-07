import { AuthProvider } from "@/components/auth/auth-provider"
import { GuestOnlyRoute } from "@/components/auth/guest-only-route"
import { RequireRole } from "@/components/auth/require-role"
import { ThemeProvider } from "@/components/theme-provider"
import { KitProvider } from "@/components/kit/kit-provider"
import { RouteLoader } from "@/components/kit/route-loader"
import { lazy, Suspense } from "react"
import { Route, Routes, useLocation } from "react-router-dom"
import { Provider } from "react-redux"
import { store } from "@/store"
import { LoadingOrb } from "@/components/shared/loading-orb";
import { PublicErrorBoundary } from "@/landing/components/public-error-boundary"

// Each page is its own chunk: a visitor on the landing page no longer downloads the admin,
// reception and stylist portals (and a customer never downloads the other three).
const AdminAppointmentsPage = lazy(() => import("@/admin/pages/appointments-page"))
const AdminCustomersPage = lazy(() => import("@/admin/pages/customers-page"))
const CreateStaffPage = lazy(() => import("@/admin/pages/create-staff-page"))
const AdminDashboardPage = lazy(() => import("@/admin/pages/dashboard-page"))
const AdminReportsPage = lazy(() => import("@/admin/pages/reports-page"))
const AdminSettingsPage = lazy(() => import("@/admin/pages/settings-page"))
const AdminServicesPage = lazy(() => import("@/admin/pages/services-page"))
const AdminStaffPermissionsPage = lazy(() => import("@/admin/pages/staff-permissions-page"))
const AdminStaffPayrollPage = lazy(() => import("@/admin/pages/staff-payroll-page"))
const AdminTeamPage = lazy(() => import("@/admin/pages/staff-team-page"))
const AdminStylistLiveMonitorPage = lazy(() => import("@/admin/pages/stylist-live-monitor-page"))
const OfferCenterPage = lazy(() => import("@/admin/pages/offer-center-page"))
const AdminMembershipPage = lazy(() => import("@/admin/pages/membership-page"))
const AdminFeedbackPage = lazy(() => import("@/admin/pages/feedback-page"))
const AdminLoyaltyPage = lazy(() => import("@/admin/pages/loyalty-page"))
const EmployeeAppointmentsPage = lazy(() => import("@/employee/pages/appointments-page"))
const EmployeeDashboardPage = lazy(() => import("@/employee/pages/dashboard-page"))
const EmployeeProfilePage = lazy(() => import("@/employee/pages/profile-page"))
const LoginPage = lazy(() => import("@/auth/pages/LoginPage"))
const SignupPage = lazy(() => import("@/auth/pages/SignupPage"))
const AuthEmailVerifiedPage = lazy(() => import("@/auth/pages/auth-email-verified-page"))
const AuthResetPasswordPage = lazy(() => import("@/auth/pages/auth-reset-password-page"))
const StaffSetPasswordPage = lazy(() => import("@/auth/pages/staff-set-password-page"))
const StaffVerifyOtpPage = lazy(() => import("@/auth/pages/staff-verify-otp-page"))
const LandingPage = lazy(() => import("@/landing/pages/LandingPage"))
const NotFoundPage = lazy(() => import("@/landing/pages/NotFoundPage"))
const ReceptionAppointmentsPage = lazy(() => import("@/receptionist/pages/appointments-page"))
const ReceptionDashboardPage = lazy(() => import("@/receptionist/pages/dashboard-page"))
const ReceptionProfilePage = lazy(() => import("@/receptionist/pages/profile-page"))
const ReceptionWalkInPage = lazy(() => import("@/receptionist/pages/walk-in-page"))
const UserAppointmentsPage = lazy(() => import("@/user/pages/appointments-page"))
const UserBookingHistoryPage = lazy(() => import("@/user/pages/booking-history-page"))
const UserOffersPage = lazy(() => import("@/user/pages/offers-page"))
const UserDashboardPage = lazy(() => import("@/user/pages/dashboard-page"))
const UserMembershipPage = lazy(() => import("@/user/pages/membership-page"))
const UserLoyaltyPage = lazy(() => import("@/user/pages/loyalty-page"))
const UserProfilePage = lazy(() => import("@/user/pages/profile-page"))
const UserQueuePage = lazy(() => import("@/user/pages/queue-page"))

const lazyLayout = (loader, name) => lazy(() => loader().then((m) => ({ default: m[name] })))
const AdminLayout = lazyLayout(() => import("@/admin/portal/admin-layout"), "AdminLayout")
const AdminFrame = lazyLayout(() => import("@/admin/portal/admin-frame"), "AdminFrame")
const EmployeeLayout = lazyLayout(() => import("@/employee/portal/employee-layout"), "EmployeeLayout")
const ReceptionLayout = lazyLayout(() => import("@/receptionist/portal/reception-layout"), "ReceptionLayout")
const UserLayout = lazyLayout(() => import("@/user/portal/user-layout"), "UserLayout")

// Shown inside each portal's own shell, so the sidebar/header stay put while a page chunk loads.
function ContentLoading() {
  return <LoadingOrb />
}
const portalFallback = (Layout) => (
  <Layout pageTitle="">
    <ContentLoading />
  </Layout>
)
const adminFallback = portalFallback(AdminLayout)
const employeeFallback = portalFallback(EmployeeLayout)
const receptionFallback = portalFallback(ReceptionLayout)
const userFallback = portalFallback(UserLayout)

function PageFallback() {
  return <RouteLoader fullScreen />
}

// Dev-only component gallery (src/DESIGN.md). `import.meta.env.DEV` is false in production builds,
// so the lab and its chunk are dropped entirely.
const DesignLab = import.meta.env.DEV ? lazy(() => import("@/design-lab/design-lab")) : null

function App() {
  const { pathname } = useLocation()
  // The lab renders outside Redux/Auth so it needs no backend or Firebase session.
  if (DesignLab && pathname.startsWith("/design-lab")) {
    return (
      <ThemeProvider>
        <KitProvider>
          <Suspense fallback={<PageFallback />}>
            <Routes>
              <Route path="/design-lab/*" element={<DesignLab />} />
            </Routes>
          </Suspense>
        </KitProvider>
      </ThemeProvider>
    )
  }
  return (
    <ThemeProvider>
     <KitProvider>
      <Provider store={store}>
        <AuthProvider>
         <PublicErrorBoundary resetKey={pathname}>
          <Suspense fallback={<PageFallback />}>
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

            <Route element={<RequireRole roles={["ADMIN"]} fallback={adminFallback} />}>
             {/* One persistent shell for every admin page: the sidebar is never remounted while navigating. */}
             <Route element={<AdminFrame />}>
              <Route path="/admin-dashboard" element={<AdminDashboardPage />} />
              <Route path="/admin-dashboard/appointments" element={<AdminAppointmentsPage />} />
              <Route path="/admin-dashboard/services" element={<AdminServicesPage />} />
              <Route path="/admin-dashboard/customers" element={<AdminCustomersPage />} />
              <Route path="/admin-dashboard/reports" element={<AdminReportsPage />} />
              <Route path="/admin-dashboard/settings" element={<AdminSettingsPage />} />
              <Route path="/admin-dashboard/staff" element={<AdminTeamPage />} />
              <Route path="/admin-dashboard/staff/new" element={<CreateStaffPage />} />
              <Route path="/admin-dashboard/staff/permissions" element={<AdminStaffPermissionsPage />} />
              <Route path="/admin-dashboard/staff/payroll" element={<AdminStaffPayrollPage />} />
              <Route path="/admin-dashboard/staff/live-monitor" element={<AdminStylistLiveMonitorPage />} />
              <Route path="/admin-dashboard/offers" element={<OfferCenterPage />} />
              <Route path="/admin-dashboard/membership" element={<AdminMembershipPage />} />
              <Route path="/admin-dashboard/feedback" element={<AdminFeedbackPage />} />
              <Route path="/admin-dashboard/loyalty" element={<AdminLoyaltyPage />} />
             </Route>
            </Route>

            <Route element={<RequireRole roles={["STAFF"]} fallback={employeeFallback} />}>
              <Route path="/employee-dashboard" element={<EmployeeDashboardPage />} />
              <Route path="/employee-dashboard/appointments" element={<EmployeeAppointmentsPage />} />
              <Route path="/employee-dashboard/profile" element={<EmployeeProfilePage />} />
            </Route>

            <Route element={<RequireRole roles={["RECEPTIONIST"]} fallback={receptionFallback} />}>
              <Route path="/reception-dashboard" element={<ReceptionDashboardPage />} />
              <Route path="/reception-dashboard/walk-in" element={<ReceptionWalkInPage />} />
              <Route path="/reception-dashboard/appointments" element={<ReceptionAppointmentsPage />} />
              <Route path="/reception-dashboard/profile" element={<ReceptionProfilePage />} />
            </Route>

            <Route element={<RequireRole roles={["USER"]} fallback={userFallback} />}>
              <Route path="/user-dashboard" element={<UserDashboardPage />} />
              <Route path="/user-dashboard/appointments" element={<UserAppointmentsPage />} />
              <Route path="/user-dashboard/queue" element={<UserQueuePage />} />
              <Route path="/user-dashboard/offers" element={<UserOffersPage />} />
              <Route path="/user-dashboard/membership" element={<UserMembershipPage />} />
              <Route path="/user-dashboard/loyalty" element={<UserLoyaltyPage />} />
              <Route path="/user-dashboard/booking-history" element={<UserBookingHistoryPage />} />
              <Route path="/user-dashboard/profile" element={<UserProfilePage />} />
            </Route>

            <Route path="*" element={<NotFoundPage />} />
          </Routes>
          </Suspense>
         </PublicErrorBoundary>
        </AuthProvider>
      </Provider>
     </KitProvider>
    </ThemeProvider>
  )
}

export default App
