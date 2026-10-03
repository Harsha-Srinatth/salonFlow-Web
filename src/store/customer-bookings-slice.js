import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { getFirebaseIdToken } from "@/lib/auth/auth-client";
import { connectCustomerBookingsSocket, disconnectCustomerBookingsSocket } from "@/lib/realtime/admin-bookings-socket";
import { toApiUrl } from "@/lib/api-base";
import { handleUnauthorizedStatus } from "@/lib/auth/session-manager";

async function apiFetch(path, init) {
  const token = await getFirebaseIdToken().catch(() => null);
  const headers = {
    "Content-Type": "application/json",
    ...(init?.headers ?? {}),
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(path, {
    ...init,
    credentials: "include",
    headers,
  });
  handleUnauthorizedStatus(response.status);
  return response;
}

function computeCustomerPriceSummary({ serviceIds, comboId, services, offers }) {
  if (!serviceIds?.length) {
    return { totalAmount: 0, discountAmount: 0, payableAmount: 0, offerLabel: null };
  }

  if (comboId && offers?.combos?.length) {
    const combo = offers.combos.find(item => item.id === comboId);
    const comboKey = combo ? [...combo.serviceIds].sort().join(",") : "";
    const selectedKey = [...serviceIds].sort().join(",");
    if (combo && comboKey === selectedKey) {
      const totalAmount = Number(combo.actualPrice ?? 0);
      const payableAmount = Number(combo.offerPrice ?? 0);
      return {
        totalAmount,
        discountAmount: Math.max(0, totalAmount - payableAmount),
        payableAmount,
        offerLabel: `Combo: ${combo.name}`,
      };
    }
  }

  const pricedById = new Map((offers?.pricedServices ?? []).map(item => [item.serviceId, item]));
  const selected = (services ?? []).filter(service => serviceIds.includes(service.id));
  let totalAmount = 0;
  let payableAmount = 0;
  let offerLabel = null;

  for (const service of selected) {
    const originalPrice = Number(service.basePrice ?? 0);
    const priced = pricedById.get(service.id);
    const finalPrice = Number(priced?.finalPrice ?? originalPrice);
    totalAmount += originalPrice;
    payableAmount += finalPrice;
    if (priced?.source && priced.source !== "NONE" && !offerLabel) {
      if (priced.source === "GLOBAL_DISCOUNT") offerLabel = "Global discount applied";
      else if (priced.source === "SERVICE_DISCOUNT") offerLabel = "Service offer applied";
      else if (priced.source === "MEMBERSHIP_OFFER") offerLabel = "Membership offer applied";
    }
  }

  return {
    totalAmount,
    discountAmount: Math.max(0, totalAmount - payableAmount),
    payableAmount,
    offerLabel,
  };
}

const SERVICES_CACHE_KEY = "sahasra.customerServices.v1";
function readCachedServices() {
  try {
    const value = JSON.parse(sessionStorage.getItem(SERVICES_CACHE_KEY) ?? "null");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}
function cacheServices(services) {
  try {
    sessionStorage.setItem(SERVICES_CACHE_KEY, JSON.stringify(services));
  } catch {
    /* storage can be blocked; the cache is only a speed-up */
  }
}

// The selected services ("cart") survive a page refresh or a trip to another tab of the portal.
// sessionStorage, not localStorage: logout clears it, so a shared device never shows the
// previous customer's picks.
const CART_KEY = "sahasra.customerCart.v1";
function uniqueIds(ids) {
  return Array.from(new Set((Array.isArray(ids) ? ids : []).map((id) => `${id ?? ""}`.trim()).filter(Boolean)));
}
function readCart() {
  try {
    return uniqueIds(JSON.parse(sessionStorage.getItem(CART_KEY) ?? "[]"));
  } catch {
    return [];
  }
}
function writeCart(ids) {
  try {
    if (ids.length) sessionStorage.setItem(CART_KEY, JSON.stringify(ids));
    else sessionStorage.removeItem(CART_KEY);
  } catch {
    /* storage can be blocked; the cart then just lasts for this page view */
  }
}

export const fetchCustomerBookings = createAsyncThunk("customerBookings/fetchBookings", async (_, { rejectWithValue }) => {
  try {
    const res = await apiFetch(toApiUrl("/api/customer/bookings"));
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return rejectWithValue(data.error ?? "Could not load your bookings");
    return data.bookings ?? [];
  } catch {
    return rejectWithValue("Could not load your bookings");
  }
});

export const fetchCustomerStylists = createAsyncThunk("customerBookings/fetchStylists", async (_, { rejectWithValue }) => {
  try {
    const res = await apiFetch(toApiUrl("/api/customer/stylists"));
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return rejectWithValue(data.error ?? "Could not load stylists");
    return data.stylists ?? [];
  } catch {
    return rejectWithValue("Could not load stylists");
  }
});

export const fetchCustomerOffers = createAsyncThunk("customerBookings/fetchOffers", async (_, { rejectWithValue }) => {
  try {
    const res = await apiFetch(toApiUrl("/api/customer/offers"));
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return rejectWithValue(data.error ?? "Could not load offers");
    return data;
  } catch {
    return rejectWithValue("Could not load offers");
  }
});

export const fetchCustomerServices = createAsyncThunk("customerBookings/fetchServices", async (_, { rejectWithValue }) => {
  try {
    const res = await apiFetch(toApiUrl("/api/customer/services"));
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return rejectWithValue(data.error ?? "Could not load services");
    return data.services ?? [];
  } catch {
    return rejectWithValue("Could not load services");
  }
});

export const fetchRecommendedStylists = createAsyncThunk(
  "customerBookings/fetchRecommendedStylists",
  async ({ serviceIds, startsAt, durationMinutes }, { rejectWithValue }) => {
    try {
      const query = new URLSearchParams({
        serviceIds: (serviceIds ?? []).join(","),
        startsAt,
        durationMinutes: `${durationMinutes ?? 45}`,
      });
      const res = await apiFetch(toApiUrl(`/api/customer/stylists/recommendations?${query.toString()}`));
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return rejectWithValue(data.error ?? "Could not load recommendations");
      return data.stylists ?? [];
    } catch {
      return rejectWithValue("Could not load recommendations");
    }
  }
);

export const fetchCustomerSlots = createAsyncThunk(
  "customerBookings/fetchSlots",
  async ({ serviceIds, date }, { rejectWithValue }) => {
    try {
      const query = new URLSearchParams({
        serviceIds: (serviceIds ?? []).join(","),
        date,
      });
      const res = await apiFetch(toApiUrl(`/api/customer/slots?${query.toString()}`));
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return rejectWithValue(data.error ?? "Could not load slots");
      return data.slots ?? [];
    } catch {
      return rejectWithValue("Could not load slots");
    }
  }
);

export const fetchCustomerCancellationPreviewAsync = createAsyncThunk(
  "customerBookings/cancellationPreview",
  async (bookingId, { rejectWithValue }) => {
    try {
      const res = await apiFetch(toApiUrl(`/api/customer/bookings/${bookingId}/cancellation-preview`));
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return rejectWithValue(data.error ?? "Could not load cancellation details");
      return { bookingId, ...data };
    } catch {
      return rejectWithValue("Could not load cancellation details");
    }
  }
);

export const cancelCustomerBookingAsync = createAsyncThunk(
  "customerBookings/cancelBooking",
  async (bookingId, { rejectWithValue }) => {
    try {
      const res = await apiFetch(toApiUrl(`/api/customer/bookings/${bookingId}/cancel`), { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return rejectWithValue(data.error ?? "Could not cancel booking");
      return { bookingId, ...data };
    } catch {
      return rejectWithValue("Could not cancel booking");
    }
  }
);

export const removeCustomerBookingFromHistoryAsync = createAsyncThunk(
  "customerBookings/removeFromHistory",
  async (bookingId, { rejectWithValue }) => {
    try {
      const res = await apiFetch(toApiUrl(`/api/customer/bookings/${bookingId}`), { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return rejectWithValue(data.error ?? "Could not remove booking");
      return { bookingId, ...data };
    } catch {
      return rejectWithValue("Could not remove booking");
    }
  }
);

export const createCustomerBookingAsync = createAsyncThunk(
  "customerBookings/createBooking",
  async (payload, { rejectWithValue }) => {
    try {
      const res = await apiFetch(toApiUrl("/api/customer/bookings"), {
        method: "POST",
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return rejectWithValue({ message: data.error ?? "Could not create booking", alternatives: data.alternatives ?? [] });
      return data.booking ?? null;
    } catch {
      return rejectWithValue({ message: "Could not create booking", alternatives: [] });
    }
  }
);

export const connectCustomerRealtime = createAsyncThunk(
  "customerBookings/connectRealtime",
  async (_, { dispatch, getState, rejectWithValue }) => {
    try {
      const token = await getFirebaseIdToken().catch(() => null);
      await connectCustomerBookingsSocket({
        token,
        onConnect: () => {
          dispatch(setCustomerRealtimeConnected(true));
          void dispatch(fetchCustomerBookings());
          void dispatch(fetchCustomerServices());
          void dispatch(fetchCustomerOffers());
        },
        onDisconnect: () => dispatch(setCustomerRealtimeConnected(false)),
        onBookingUpdated: booking => {
          dispatch(customerBookingPatchedFromRealtime(booking));
          const state = getState();
          const serviceIds = state?.customerBookings?.bookingForm?.serviceIds ?? [];
          const bookingDate = state?.customerBookings?.bookingForm?.bookingDate;
          const startsAt = state?.customerBookings?.bookingForm?.startsAt;
          if (serviceIds.length && bookingDate) {
            void dispatch(fetchCustomerSlots({ serviceIds, date: bookingDate }));
          }
          if (serviceIds.length && startsAt) {
            void dispatch(fetchRecommendedStylists({ serviceIds, startsAt }));
          }
        },
        onServiceCatalogUpdated: () => {
          void dispatch(fetchCustomerServices());
        },
      });
      return true;
    } catch {
      return rejectWithValue("Could not connect customer realtime");
    }
  }
);

export const disconnectCustomerRealtime = createAsyncThunk("customerBookings/disconnectRealtime", async () => {
  disconnectCustomerBookingsSocket();
  return true;
});

const initialCachedServices = readCachedServices();
const initialCart = readCart();

const customerBookingsSlice = createSlice({
  name: "customerBookings",
  initialState: {
    bookings: [],
    stylists: [],
    recommendedStylists: [],
    services: initialCachedServices,
    servicesLoading: false,
    slotsLoading: false,
    offers: null,
    offersLoading: false,
    bookingForm: {
      bookingDate: "",
      startsAt: "",
      serviceIds: initialCart,
      stylistId: "",
      comboId: "",
    },
    slots: [],
    priceSummary: computeCustomerPriceSummary({ serviceIds: initialCart, comboId: "", services: initialCachedServices, offers: null }),
    loading: false,
    mutating: false,
    deletingBookingId: null,
    cancellingBookingId: null,
    cancellationPreview: null,
    cancellationPreviewLoading: false,
    error: null,
    realtimeConnected: false,
  },
  reducers: {
    setCustomerBookingField(state, action) {
      const { field } = action.payload;
      // A service can be in the booking once; duplicates (double taps, assistant suggestions) collapse.
      const value = field === "serviceIds" ? uniqueIds(action.payload.value) : action.payload.value;
      state.bookingForm[field] = value;
      if (field === "serviceIds") {
        writeCart(value);
        state.bookingForm.startsAt = "";
        state.bookingForm.stylistId = "";
        state.slots = [];
        const combo = state.offers?.combos?.find(item => item.id === state.bookingForm.comboId);
        const comboKey = combo ? [...combo.serviceIds].sort().join(",") : "";
        const selectedKey = [...value].sort().join(",");
        if (!combo || comboKey !== selectedKey) {
          state.bookingForm.comboId = "";
        }
        state.priceSummary = computeCustomerPriceSummary({
          serviceIds: value,
          comboId: state.bookingForm.comboId,
          services: state.services,
          offers: state.offers,
        });
      }
      if (field === "bookingDate") {
        state.bookingForm.startsAt = "";
        state.bookingForm.stylistId = "";
        state.slots = [];
      }
      if (field === "startsAt") {
        state.bookingForm.stylistId = "";
      }
    },
    resetCustomerBookingForm(state) {
      writeCart([]);
      state.bookingForm = {
        bookingDate: "",
        startsAt: "",
        serviceIds: [],
        stylistId: "",
        comboId: "",
      };
      state.slots = [];
      state.priceSummary = {
        totalAmount: 0,
        discountAmount: 0,
        payableAmount: 0,
        offerLabel: null,
      };
    },
    applyCustomerComboOffer(state, action) {
      const combo = action.payload;
      if (!combo?.id || !Array.isArray(combo.serviceIds)) return;
      state.bookingForm.comboId = combo.id;
      state.bookingForm.serviceIds = uniqueIds(combo.serviceIds);
      writeCart(state.bookingForm.serviceIds);
      state.bookingForm.startsAt = "";
      state.bookingForm.stylistId = "";
      state.slots = [];
      state.priceSummary = computeCustomerPriceSummary({
        serviceIds: combo.serviceIds,
        comboId: combo.id,
        services: state.services,
        offers: state.offers,
      });
    },
    clearCustomerComboOffer(state) {
      state.bookingForm.comboId = "";
      state.priceSummary = computeCustomerPriceSummary({
        serviceIds: state.bookingForm.serviceIds,
        comboId: "",
        services: state.services,
        offers: state.offers,
      });
    },
    setCustomerRecommendedStylists(state, action) {
      state.recommendedStylists = action.payload ?? [];
    },
    setCustomerRealtimeConnected(state, action) {
      state.realtimeConnected = Boolean(action.payload);
    },
    clearCustomerCancellationPreview(state) {
      state.cancellationPreview = null;
      state.cancellationPreviewLoading = false;
    },
    customerBookingPatchedFromRealtime(state, action) {
      const booking = action.payload;
      if (!booking?.id) return;
      const index = state.bookings.findIndex(item => item.id === booking.id);
      if (index >= 0) {
        state.bookings[index] = booking;
      } else {
        state.bookings.push(booking);
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCustomerBookings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCustomerBookings.fulfilled, (state, action) => {
        state.loading = false;
        state.bookings = action.payload;
      })
      .addCase(fetchCustomerBookings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? "Could not load your bookings";
      })
      .addCase(fetchCustomerStylists.fulfilled, (state, action) => {
        state.stylists = action.payload;
      })
      .addCase(fetchCustomerServices.pending, (state) => {
        state.servicesLoading = true;
      })
      .addCase(fetchCustomerServices.rejected, (state, action) => {
        state.servicesLoading = false;
        state.error = action.payload ?? "Could not load services";
      })
      .addCase(fetchCustomerServices.fulfilled, (state, action) => {
        state.servicesLoading = false;
        state.services = action.payload;
        cacheServices(action.payload);
        // Drop picks that are no longer bookable (deactivated/removed since they were added), so
        // the cart never holds an id the server will reject at checkout.
        const available = new Set(action.payload.map((service) => service.id));
        const kept = state.bookingForm.serviceIds.filter((id) => available.has(id));
        if (kept.length !== state.bookingForm.serviceIds.length) {
          state.bookingForm.serviceIds = kept;
          state.bookingForm.startsAt = "";
          state.bookingForm.stylistId = "";
          state.bookingForm.comboId = "";
          state.slots = [];
          writeCart(kept);
        }
        state.priceSummary = computeCustomerPriceSummary({
          serviceIds: state.bookingForm.serviceIds,
          comboId: state.bookingForm.comboId,
          services: state.services,
          offers: state.offers,
        });
      })
      .addCase(fetchCustomerOffers.pending, (state) => {
        state.offersLoading = true;
      })
      .addCase(fetchCustomerOffers.fulfilled, (state, action) => {
        state.offersLoading = false;
        state.offers = action.payload;
        state.priceSummary = computeCustomerPriceSummary({
          serviceIds: state.bookingForm.serviceIds,
          comboId: state.bookingForm.comboId,
          services: state.services,
          offers: state.offers,
        });
      })
      .addCase(fetchCustomerOffers.rejected, (state) => {
        state.offersLoading = false;
      })
      .addCase(fetchRecommendedStylists.fulfilled, (state, action) => {
        state.recommendedStylists = action.payload;
      })
      .addCase(fetchCustomerSlots.pending, (state) => {
        state.slotsLoading = true;
      })
      .addCase(fetchCustomerSlots.fulfilled, (state, action) => {
        state.slotsLoading = false;
        state.slots = action.payload;
      })
      .addCase(fetchCustomerSlots.rejected, (state, action) => {
        state.slotsLoading = false;
        state.error = action.payload ?? "Could not load slots";
      })
      .addCase(fetchCustomerStylists.rejected, (state, action) => {
        state.error = action.payload ?? "Could not load stylists";
      })
      .addCase(fetchCustomerCancellationPreviewAsync.pending, (state) => {
        state.cancellationPreviewLoading = true;
        state.cancellationPreview = null;
        state.error = null;
      })
      .addCase(fetchCustomerCancellationPreviewAsync.fulfilled, (state, action) => {
        state.cancellationPreviewLoading = false;
        state.cancellationPreview = action.payload;
      })
      .addCase(fetchCustomerCancellationPreviewAsync.rejected, (state, action) => {
        state.cancellationPreviewLoading = false;
        state.error = action.payload ?? "Could not load cancellation details";
      })
      .addCase(cancelCustomerBookingAsync.pending, (state, action) => {
        state.cancellingBookingId = action.meta.arg;
        state.error = null;
      })
      .addCase(cancelCustomerBookingAsync.fulfilled, (state, action) => {
        state.cancellingBookingId = null;
        state.cancellationPreview = null;
        const bookingId = action.payload?.bookingId ?? action.payload?.id ?? action.meta.arg;
        state.bookings = state.bookings.filter(item => item.id !== bookingId);
      })
      .addCase(cancelCustomerBookingAsync.rejected, (state, action) => {
        state.cancellingBookingId = null;
        state.error = action.payload ?? "Could not cancel booking";
      })
      .addCase(removeCustomerBookingFromHistoryAsync.pending, (state, action) => {
        state.deletingBookingId = action.meta.arg;
        state.error = null;
      })
      .addCase(removeCustomerBookingFromHistoryAsync.fulfilled, (state, action) => {
        state.deletingBookingId = null;
        const bookingId = action.payload?.bookingId ?? action.payload?.id ?? action.meta.arg;
        state.bookings = state.bookings.filter(item => item.id !== bookingId);
      })
      .addCase(removeCustomerBookingFromHistoryAsync.rejected, (state, action) => {
        state.deletingBookingId = null;
        state.error = action.payload ?? "Could not remove booking";
      })
      .addCase(createCustomerBookingAsync.pending, (state) => {
        state.mutating = true;
        state.error = null;
      })
      .addCase(createCustomerBookingAsync.fulfilled, (state, action) => {
        state.mutating = false;
        if (action.payload) state.bookings.push(action.payload);
      })
      .addCase(createCustomerBookingAsync.rejected, (state, action) => {
        state.mutating = false;
        state.error = action.payload?.message ?? "Could not create booking";
        state.recommendedStylists = action.payload?.alternatives ?? [];
      })
      .addCase(connectCustomerRealtime.rejected, (state, action) => {
        state.realtimeConnected = false;
        state.error = action.payload ?? "Could not connect customer realtime";
      })
      .addCase(disconnectCustomerRealtime.fulfilled, (state) => {
        state.realtimeConnected = false;
      });
  },
});

export const {
  setCustomerBookingField,
  resetCustomerBookingForm,
  applyCustomerComboOffer,
  clearCustomerComboOffer,
  setCustomerRecommendedStylists,
  setCustomerRealtimeConnected,
  clearCustomerCancellationPreview,
  customerBookingPatchedFromRealtime,
} = customerBookingsSlice.actions;
export const customerBookingsReducer = customerBookingsSlice.reducer;
