import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { getFirebaseIdToken } from "@/lib/auth/auth-client";
import { connectAdminBookingsSocket, disconnectAdminBookingsSocket } from "@/lib/realtime/admin-bookings-socket";
import { decryptPayloadEnvelope, encryptPayloadEnvelope, isPayloadEncryptionEnabled } from "@/lib/security/payload-envelope";
import { toApiUrl } from "@/lib/api-base";
import { handleUnauthorizedStatus } from "@/lib/auth/session-manager";

async function apiFetch(path, init) {
  const token = await getFirebaseIdToken().catch(() => null);
  const headers = {
    "Content-Type": "application/json",
    ...(init?.headers ?? {}),
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  let body = init?.body;
  if (body && isPayloadEncryptionEnabled()) {
    headers["x-payload-encrypted"] = "1";
    const parsed = typeof body === "string" ? JSON.parse(body) : body;
    const encrypted = await encryptPayloadEnvelope(parsed);
    body = JSON.stringify({ encrypted });
  }
  const response = await fetch(path, {
    ...init,
    body,
    credentials: "include",
    headers,
  });
  handleUnauthorizedStatus(response.status);
  return response;
}

async function parseApiResponse(res) {
  const data = await res.json().catch(() => ({}));
  if (data?.encrypted && isPayloadEncryptionEnabled()) {
    const decrypted = await decryptPayloadEnvelope(data.encrypted).catch(() => null);
    return decrypted ?? {};
  }
  return data;
}

let bookingsRealtimeTimer = null;
let reportsRealtimeTimer = null;

function buildAppointmentsFetchParams(state) {
  const { appointmentsFilter, appointmentsPagination, appointmentsQuery } = state.adminPortal;
  return {
    status: appointmentsFilter.status === "ALL" ? undefined : appointmentsFilter.status,
    search: appointmentsQuery.search || undefined,
    from: appointmentsQuery.from || undefined,
    to: appointmentsQuery.to || undefined,
    limit: appointmentsPagination.limit,
    offset: appointmentsPagination.offset,
    sort: appointmentsQuery.sort ?? "latest",
  };
}

function buildReportsFetchParams(state) {
  const { reportsFilter, paymentsPagination } = state.adminPortal;
  return {
    month: reportsFilter.month,
    paymentMode: reportsFilter.paymentMode,
    from: reportsFilter.from || undefined,
    to: reportsFilter.to || undefined,
    limit: paymentsPagination.limit,
    offset: paymentsPagination.offset,
  };
}

function scheduleBookingsRealtimeRefresh(dispatch, getState) {
  if (bookingsRealtimeTimer) window.clearTimeout(bookingsRealtimeTimer);
  bookingsRealtimeTimer = window.setTimeout(() => {
    void dispatch(fetchAdminBookings({ ...buildAppointmentsFetchParams(getState()), silent: true }));
  }, 350);
}

function scheduleReportsRealtimeRefresh(dispatch, getState) {
  if (reportsRealtimeTimer) window.clearTimeout(reportsRealtimeTimer);
  reportsRealtimeTimer = window.setTimeout(() => {
    void dispatch(fetchAdminRevenueReport({ ...buildReportsFetchParams(getState()), silent: true }));
  }, 350);
}

export const fetchAdminBookings = createAsyncThunk("adminPortal/fetchAdminBookings", async (params = {}, { rejectWithValue }) => {
  try {
    const query = new URLSearchParams();
    if (params.status) query.set("status", params.status);
    if (params.search) query.set("search", params.search);
    if (params.from) query.set("from", params.from);
    if (params.to) query.set("to", params.to);
    if (params.limit) query.set("limit", `${params.limit}`);
    if (params.offset) query.set("offset", `${params.offset}`);
    query.set("sort", params.sort ?? "latest");
    const suffix = query.toString() ? `?${query.toString()}` : "";
    const res = await apiFetch(toApiUrl(`/api/admin/bookings${suffix}`), {
      headers: isPayloadEncryptionEnabled() ? { "x-payload-encrypted": "1" } : undefined,
    });
    const data = await parseApiResponse(res);
    if (!res.ok) return rejectWithValue(data.error ?? "Could not load bookings");
    return {
      bookings: data.bookings ?? [],
      pagination: data.pagination ?? { total: 0, limit: 25, offset: 0 },
    };
  } catch {
    return rejectWithValue("Could not load bookings");
  }
});

export const updateAdminBookingStatus = createAsyncThunk(
  "adminPortal/updateAdminBookingStatus",
  async ({ bookingId, status, refundPercent }, { rejectWithValue }) => {
    try {
      const res = await apiFetch(toApiUrl(`/api/admin/bookings/${bookingId}/status`), {
        method: "PATCH",
        body: JSON.stringify(refundPercent === undefined ? { status } : { status, refundPercent }),
      });
      const data = await parseApiResponse(res);
      if (!res.ok) return rejectWithValue(data.error ?? "Could not update booking status");
      return data.booking ?? null;
    } catch {
      return rejectWithValue("Could not update booking status");
    }
  }
);

export const fetchAdminCancellationPreviewAsync = createAsyncThunk(
  "adminPortal/cancellationPreview",
  async (bookingId, { rejectWithValue }) => {
    try {
      const res = await apiFetch(toApiUrl(`/api/admin/bookings/${bookingId}/cancellation-preview`));
      const data = await parseApiResponse(res);
      if (!res.ok) return rejectWithValue(data.error ?? "Could not load cancellation details");
      return data;
    } catch {
      return rejectWithValue("Could not load cancellation details");
    }
  }
);

export const fetchAdminServices = createAsyncThunk("adminPortal/fetchAdminServices", async (_, { rejectWithValue }) => {
  try {
    const res = await apiFetch(toApiUrl("/api/admin/services"), {
      headers: isPayloadEncryptionEnabled() ? { "x-payload-encrypted": "1" } : undefined,
    });
    const data = await parseApiResponse(res);
    if (!res.ok) return rejectWithValue(data.error ?? "Could not load services");
    return data.services ?? [];
  } catch {
    return rejectWithValue("Could not load services");
  }
});

export const updateAdminServiceDiscounts = createAsyncThunk(
  "adminPortal/updateAdminServiceDiscounts",
  async (services, { rejectWithValue }) => {
    try {
      const res = await apiFetch(toApiUrl("/api/admin/services/discounts"), {
        method: "PATCH",
        body: JSON.stringify({ services }),
      });
      const data = await parseApiResponse(res);
      if (!res.ok) return rejectWithValue(data.error ?? "Could not update discounts");
      return data.services ?? [];
    } catch {
      return rejectWithValue("Could not update discounts");
    }
  }
);

export const createAdminServiceAsync = createAsyncThunk(
  "adminPortal/createAdminService",
  async (payload, { rejectWithValue }) => {
    try {
      const res = await apiFetch(toApiUrl("/api/admin/services"), {
        method: "POST",
        body: JSON.stringify(payload),
      });
      const data = await parseApiResponse(res);
      if (!res.ok) return rejectWithValue(data.error ?? "Could not create service");
      return data.service ?? null;
    } catch {
      return rejectWithValue("Could not create service");
    }
  }
);

export const updateAdminServiceAsync = createAsyncThunk(
  "adminPortal/updateAdminService",
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      const res = await apiFetch(toApiUrl(`/api/admin/services/${id}`), {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      const data = await parseApiResponse(res);
      if (!res.ok) return rejectWithValue(data.error ?? "Could not update service");
      return data.service ?? null;
    } catch {
      return rejectWithValue("Could not update service");
    }
  }
);

export const uploadAdminServiceImageAsync = createAsyncThunk(
  "adminPortal/uploadAdminServiceImage",
  async ({ imageDataUri }, { rejectWithValue }) => {
    try {
      const res = await apiFetch(toApiUrl("/api/admin/services/upload-image"), {
        method: "POST",
        body: JSON.stringify({ imageDataUri }),
      });
      const data = await parseApiResponse(res);
      if (!res.ok) return rejectWithValue(data.error ?? "Could not upload image");
      return {
        imageUrl: data.imageUrl ?? "",
        publicId: data.publicId ?? "",
      };
    } catch {
      return rejectWithValue("Could not upload image");
    }
  }
);

export const fetchAdminRevenueReport = createAsyncThunk(
  "adminPortal/fetchAdminRevenueReport",
  async ({ month, paymentMode, from, to, limit, offset } = {}, { rejectWithValue }) => {
    try {
      const query = new URLSearchParams();
      if (month) query.set("month", month);
      if (paymentMode && paymentMode !== "ALL") query.set("paymentMode", paymentMode);
      if (from) query.set("from", from);
      if (to) query.set("to", to);
      if (limit) query.set("limit", `${limit}`);
      if (offset) query.set("offset", `${offset}`);
      const suffix = query.toString() ? `?${query.toString()}` : "";
      const res = await apiFetch(toApiUrl(`/api/admin/reports/payments${suffix}`), {
        headers: isPayloadEncryptionEnabled() ? { "x-payload-encrypted": "1" } : undefined,
      });
      const data = await parseApiResponse(res);
      if (!res.ok) return rejectWithValue(data.error ?? "Could not load revenue report");
      const summary = data.summary ?? {};
      const asInr = (value) => `Rs ${Number(value ?? 0).toFixed(2)}`;
      return {
        month: data.month ?? month ?? "",
        reportCards: [
          { title: "Today Net Income", icon: "DollarSign", value: asInr(summary.dayTotal), change: "live" },
          { title: "This Week Net", icon: "TrendingUp", value: asInr(summary.weekTotal), change: "live" },
          { title: "This Month Net", icon: "BarChart3", value: asInr(summary.monthTotal), change: "live" },
          { title: "This Year Net", icon: "Users", value: asInr(summary.yearTotal), change: "live" },
          { title: "Previous Week Net", icon: "TrendingUp", value: asInr(summary.prevWeekTotal), change: "comparison" },
        ],
        reportSummary: {
          dayTotal: Number(summary.dayTotal ?? 0),
          weekTotal: Number(summary.weekTotal ?? 0),
          monthTotal: Number(summary.monthTotal ?? 0),
          yearTotal: Number(summary.yearTotal ?? 0),
          prevWeekTotal: Number(summary.prevWeekTotal ?? 0),
        },
        latestPayments: data.latestPayments ?? [],
        paymentsPagination: data.pagination ?? { total: 0, limit: 100, offset: 0 },
      };
    } catch {
      return rejectWithValue("Could not load revenue report");
    }
  }
);

export const connectAdminRealtime = createAsyncThunk(
  "adminPortal/connectAdminRealtime",
  async (_, { dispatch, getState, rejectWithValue }) => {
    try {
      const token = await getFirebaseIdToken().catch(() => null);
      await connectAdminBookingsSocket({
        token,
        onConnect: () => {
          dispatch(setRealtimeConnected(true));
          scheduleBookingsRealtimeRefresh(dispatch, getState);
          scheduleReportsRealtimeRefresh(dispatch, getState);
        },
        onDisconnect: () => dispatch(setRealtimeConnected(false)),
        onBookingUpdated: booking => {
          if (booking?.id) dispatch(bookingPatchedFromRealtime(booking));
          scheduleBookingsRealtimeRefresh(dispatch, getState);
        },
        onServiceCatalogUpdated: () => {
          void dispatch(fetchAdminServices());
        },
        onPaymentUpdated: payment => {
          if (payment?.id) dispatch(paymentPatchedFromRealtime(payment));
          scheduleReportsRealtimeRefresh(dispatch, getState);
        },
      });
      return true;
    } catch {
      return rejectWithValue("Could not connect realtime stream");
    }
  }
);

export const disconnectAdminRealtime = createAsyncThunk("adminPortal/disconnectAdminRealtime", async () => {
  disconnectAdminBookingsSocket();
  return true;
});

function upsertBooking(state, booking) {
  if (!booking?.id) return;
  if (!state.appointmentsById[booking.id]) state.appointmentIds.push(booking.id);
  state.appointmentsById[booking.id] = booking;
}

const initialState = {
  appointmentsById: {},
  appointmentIds: [],
  appointmentsPagination: {
    total: 0,
    limit: 25,
    offset: 0,
  },
  appointmentsFilter: {
    status: "ALL",
  },
  appointmentsQuery: {
    search: "",
    from: "",
    to: "",
    sort: "latest",
  },
  reportsFilter: {
    month: new Date().toISOString().slice(0, 7),
    paymentMode: "ALL",
    from: "",
    to: "",
  },
  appointmentsLoading: false,
  appointmentsMutating: false,
  appointmentsError: null,
  reportsLoading: false,
  realtimeConnected: false,
  customers: [],
  reportCards: [],
  reportSummary: {
    dayTotal: 0,
    weekTotal: 0,
    monthTotal: 0,
    yearTotal: 0,
    prevWeekTotal: 0,
  },
  latestPayments: [],
  paymentsPagination: { total: 0, limit: 100, offset: 0 },
  reportMonth: "",
  services: [],
  serviceDraft: {
    name: "",
    category: "",
    gender: "UNISEX",
    basePrice: "",
    duration: "45",
    description: "",
    image: "",
  },
};

const adminPortalSlice = createSlice({
  name: "adminPortal",
  initialState,
  reducers: {
    setAppointmentsStatusFilter(state, action) {
      state.appointmentsFilter.status = action.payload ?? "ALL";
    },
    setAppointmentsQuery(state, action) {
      state.appointmentsQuery = { ...state.appointmentsQuery, ...action.payload };
    },
    setReportsFilter(state, action) {
      state.reportsFilter = { ...state.reportsFilter, ...action.payload };
    },
    setRealtimeConnected(state, action) {
      state.realtimeConnected = Boolean(action.payload);
    },
    bookingPatchedFromRealtime(state, action) {
      upsertBooking(state, action.payload);
    },
    paymentPatchedFromRealtime(state, action) {
      const payment = action.payload;
      if (!payment?.id) return;
      const { reportsFilter, paymentsPagination } = state;
      if (paymentsPagination.offset !== 0) return;
      if (reportsFilter.paymentMode !== "ALL" && reportsFilter.paymentMode !== payment.paymentMode) return;
      const collectedAt = new Date(payment.collectedAt);
      if (Number.isNaN(collectedAt.getTime())) return;
      const paymentMonth = collectedAt.toISOString().slice(0, 7);
      if (reportsFilter.month && paymentMonth !== reportsFilter.month) return;
      const existingIndex = state.latestPayments.findIndex(item => item.id === payment.id);
      if (existingIndex >= 0) {
        state.latestPayments[existingIndex] = { ...state.latestPayments[existingIndex], ...payment };
        return;
      }
      state.latestPayments.unshift(payment);
      if (state.latestPayments.length > paymentsPagination.limit) {
        state.latestPayments.length = paymentsPagination.limit;
      }
      state.paymentsPagination.total += 1;
    },
    setServiceDiscountField(state, action) {
      const { id, value } = action.payload;
      state.services = state.services.map((service) =>
        service.id === id ? { ...service, discountPercent: value } : service
      );
    },
    setServiceField(state, action) {
      const { id, field, value } = action.payload;
      state.services = state.services.map((service) =>
        service.id === id ? { ...service, [field]: value } : service
      );
    },
    setServiceDraftField(state, action) {
      const { field, value } = action.payload;
      state.serviceDraft[field] = value;
    },
    resetServiceDraft(state) {
      state.serviceDraft = {
        name: "",
        category: "",
        gender: "UNISEX",
        basePrice: "",
        duration: "45",
        description: "",
        image: "",
      };
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAdminBookings.pending, (state, action) => {
        if (!action.meta.arg?.silent) state.appointmentsLoading = true;
        state.appointmentsError = null;
      })
      .addCase(fetchAdminBookings.fulfilled, (state, action) => {
        state.appointmentsLoading = false;
        state.appointmentsById = {};
        state.appointmentIds = [];
        action.payload.bookings.forEach(booking => upsertBooking(state, booking));
        state.appointmentsPagination = action.payload.pagination;
      })
      .addCase(fetchAdminBookings.rejected, (state, action) => {
        state.appointmentsLoading = false;
        state.appointmentsError = action.payload ?? "Could not load bookings";
      })
      .addCase(fetchAdminRevenueReport.pending, (state, action) => {
        if (!action.meta.arg?.silent) state.reportsLoading = true;
        state.appointmentsError = null;
      })
      .addCase(fetchAdminRevenueReport.fulfilled, (state, action) => {
        state.reportsLoading = false;
        state.reportCards = action.payload.reportCards;
        state.reportSummary = action.payload.reportSummary;
        state.latestPayments = action.payload.latestPayments;
        state.paymentsPagination = action.payload.paymentsPagination;
        state.reportMonth = action.payload.month;
      })
      .addCase(fetchAdminRevenueReport.rejected, (state, action) => {
        state.reportsLoading = false;
        state.appointmentsError = action.payload ?? "Could not load revenue report";
      })
      .addCase(updateAdminBookingStatus.pending, (state) => {
        state.appointmentsMutating = true;
        state.appointmentsError = null;
      })
      .addCase(updateAdminBookingStatus.fulfilled, (state, action) => {
        state.appointmentsMutating = false;
        if (!action.payload) return;
        upsertBooking(state, action.payload);
      })
      .addCase(updateAdminBookingStatus.rejected, (state, action) => {
        state.appointmentsMutating = false;
        state.appointmentsError = action.payload ?? "Could not update booking status";
      })
      .addCase(fetchAdminServices.fulfilled, (state, action) => {
        state.services = action.payload;
      })
      .addCase(fetchAdminServices.rejected, (state, action) => {
        state.appointmentsError = action.payload ?? "Could not load services";
      })
      .addCase(updateAdminServiceDiscounts.fulfilled, (state, action) => {
        state.services = action.payload;
      })
      .addCase(updateAdminServiceDiscounts.rejected, (state, action) => {
        state.appointmentsError = action.payload ?? "Could not update discounts";
      })
      .addCase(createAdminServiceAsync.pending, (state) => {
        state.appointmentsMutating = true;
        state.appointmentsError = null;
      })
      .addCase(createAdminServiceAsync.fulfilled, (state, action) => {
        state.appointmentsMutating = false;
        if (action.payload) {
          state.services.push(action.payload);
          state.services.sort((a, b) => a.name.localeCompare(b.name));
        }
      })
      .addCase(createAdminServiceAsync.rejected, (state, action) => {
        state.appointmentsMutating = false;
        state.appointmentsError = action.payload ?? "Could not create service";
      })
      .addCase(updateAdminServiceAsync.pending, (state) => {
        state.appointmentsMutating = true;
        state.appointmentsError = null;
      })
      .addCase(updateAdminServiceAsync.fulfilled, (state, action) => {
        state.appointmentsMutating = false;
        if (!action.payload) return;
        state.services = state.services.map((service) => (service.id === action.payload.id ? action.payload : service));
      })
      .addCase(updateAdminServiceAsync.rejected, (state, action) => {
        state.appointmentsMutating = false;
        state.appointmentsError = action.payload ?? "Could not update service";
      })
      .addCase(uploadAdminServiceImageAsync.pending, (state) => {
        state.appointmentsMutating = true;
        state.appointmentsError = null;
      })
      .addCase(uploadAdminServiceImageAsync.fulfilled, (state) => {
        state.appointmentsMutating = false;
      })
      .addCase(uploadAdminServiceImageAsync.rejected, (state, action) => {
        state.appointmentsMutating = false;
        state.appointmentsError = action.payload ?? "Could not upload image";
      })
      .addCase(connectAdminRealtime.rejected, (state, action) => {
        state.realtimeConnected = false;
        state.appointmentsError = action.payload ?? "Could not connect realtime stream";
      })
      .addCase(disconnectAdminRealtime.fulfilled, (state) => {
        state.realtimeConnected = false;
      });
  },
});

export const {
  setAppointmentsStatusFilter,
  setAppointmentsQuery,
  setReportsFilter,
  setRealtimeConnected,
  bookingPatchedFromRealtime,
  paymentPatchedFromRealtime,
  setServiceDiscountField,
  setServiceField,
  setServiceDraftField,
  resetServiceDraft,
} = adminPortalSlice.actions;
export const selectAdminAppointments = (state) => state.adminPortal.appointmentIds.map((id) => state.adminPortal.appointmentsById[id]);
export const adminPortalReducer = adminPortalSlice.reducer;
