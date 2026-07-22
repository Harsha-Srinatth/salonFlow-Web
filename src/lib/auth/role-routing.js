const dashboardPathByRole = {
    ADMIN: "/admin-dashboard",
    USER: "/user-dashboard",
    STAFF: "/employee-dashboard",
    RECEPTIONIST: "/reception-dashboard",
};
export function getDashboardPathByRole(role) {
    return dashboardPathByRole[role];
}
