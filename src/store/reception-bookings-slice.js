import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { connectReceptionBookingsSocket, disconnectReceptionBookingsSocket } from "@/lib/realtime/admin-bookings-socket";
import { decryptPayloadEnvelope, encryptPayloadEnvelope, isPayloadEncryptionEnabled } from "@/lib/security/payload-envelope";
import { computeOfferPriceSummary } from "@/lib/offers/offer-pricing";
import { toApiUrl } from "@/lib/api-base";
import { staffApiFetch } from "@/lib/staff-auth-client";

async function apiFetch(path, init) {
  const headers = {
    ...(init?.headers ?? {}),
  };
  let body = init?.body;
  if (body && isPayloadEncryptionEnabled()) {
    headers["x-payload-encrypted"] = "1";
    const parsed = typeof body === "string" ? JSON.parse(body) : body;
    const encrypted = await encryptPayloadEnvelope(parsed);
    body = JSON.stringify({ encrypted });
  }
  return staffApiFetch(path, {
    ...init,
    body,
    headers,
  });
}

async function parseApiResponse(res) {
  const data = await res.json().catch(() => ({}));
  if (data?.encrypted && isPayloadEncryptionEnabled()) {
    const decrypted = await decryptPayloadEnvelope(data.encrypted).catch(() => null);
    return decrypted ?? {};
  }
  return data;
}

export const fetchReceptionOffers = createAsyncThunk(
  "receptionBookings/fetchOffers",
  async (membershipSegment, { rejectWithValue }) => {
    try {
      const segment = `${membershipSegment ?? "FREE"}`.trim().toUpperCase() || "FREE";
      const res = await apiFetch(toApiUrl(`/api/reception/offers?membershipSegment=${encodeURIComponent(segment)}`), {
        headers: isPayloadEncryptionEnabled() ? { "x-payload-encrypted": "1" } : undefined,
      });
      const data = await parseApiResponse(res);
      if (!res.ok) return rejectWithValue(data.error ?? "Could not load offers");
      return data;
    } catch {
      return rejectWithValue("Could not load offers");
    }
  }
);

export const fetchReceptionBookings = createAsyncThunk("receptionBookings/fetchBookings", async (_, { rejectWithValue }) => {
  try {
    const res = await apiFetch(toApiUrl("/api/reception/bookings?sort=proximity&limit=100"), {
      headers: isPayloadEncryptionEnabled() ? { "x-payload-encrypted": "1" } : undefined,
    });
    const data = await parseApiResponse(res);
    if (!res.ok) return rejectWithValue(data.error ?? "Could not load bookings");
    return data.bookings ?? [];
  } catch {
    return rejectWithValue("Could not load bookings");
  }
});

export const fetchReceptionStylists = createAsyncThunk("receptionBookings/fetchStylists", async (_, { rejectWithValue }) => {
  try {
    const res = await apiFetch(toApiUrl("/api/reception/stylists"), {
      headers: isPayloadEncryptionEnabled() ? { "x-payload-encrypted": "1" } : undefined,
    });
    const data = await parseApiResponse(res);
    if (!res.ok) return rejectWithValue(data.error ?? "Could not load stylists");
    return data.stylists ?? [];
  } catch {
    return rejectWithValue("Could not load stylists");
  }
});

export const fetchReceptionServices = createAsyncThunk("receptionBookings/fetchServices", async (_, { rejectWithValue }) => {
  try {
    const res = await apiFetch(toApiUrl("/api/reception/services"), {
      headers: isPayloadEncryptionEnabled() ? { "x-payload-encrypted": "1" } : undefined,
    });
    const data = await parseApiResponse(res);
    if (!res.ok) return rejectWithValue(data.error ?? "Could not load services");
    return data.services ?? [];
  } catch {
    return rejectWithValue("Could not load services");
  }
});

export const lookupReceptionCustomerAsync = createAsyncThunk(
  "receptionBookings/lookupCustomer",
  async ({ email, phone }, { rejectWithValue }) => {
    try {
      const query = new URLSearchParams();
      if (email) query.set("email", email);
      if (phone) query.set("phone", phone);
      const res = await apiFetch(toApiUrl(`/api/reception/customers/lookup?${query.toString()}`), {
        headers: isPayloadEncryptionEnabled() ? { "x-payload-encrypted": "1" } : undefined,
      });
      const data = await parseApiResponse(res);
      if (!res.ok) return rejectWithValue(data.error ?? "Could not lookup customer");
      return {
        status: data.status ?? "NEW_CUSTOMER",
        customer: data.customer ?? null,
      };
    } catch {
      return rejectWithValue("Could not lookup customer");
    }
  }
);

export const createReceptionBookingAsync = createAsyncThunk(
  "receptionBookings/createBooking",
  async (payload, { rejectWithValue }) => {
    try {
      const res = await apiFetch(toApiUrl("/api/reception/bookings"), {
        method: "POST",
        body: JSON.stringify(payload),
      });
      const data = await parseApiResponse(res);
      if (!res.ok) return rejectWithValue(data.error ?? "Could not create booking");
      return data.booking ?? null;
    } catch {
      return rejectWithValue("Could not create booking");
    }
  }
);

export const fetchReceptionQueue = createAsyncThunk("receptionBookings/fetchQueue", async (_, { rejectWithValue }) => {
  try {
    const res = await apiFetch(toApiUrl("/api/reception/queue?limit=100"), {
      headers: isPayloadEncryptionEnabled() ? { "x-payload-encrypted": "1" } : undefined,
    });
    const data = await parseApiResponse(res);
    if (!res.ok) return rejectWithValue(data.error ?? "Could not load queue");
    return data.queue ?? [];
  } catch {
    return rejectWithValue("Could not load queue");
  }
});

export const updateReceptionBookingAsync = createAsyncThunk(
  "receptionBookings/updateBooking",
  async ({ bookingId, action, startsAt, stylistId }, { rejectWithValue }) => {
    try {
      const body = { action };
      if (startsAt) body.startsAt = startsAt;
      if (stylistId) body.stylistId = stylistId;
      const res = await apiFetch(toApiUrl(`/api/reception/bookings/${bookingId}`), {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      const data = await parseApiResponse(res);
      if (!res.ok) return rejectWithValue(data.error ?? "Could not update booking");
      return data.booking ?? null;
    } catch {
      return rejectWithValue("Could not update booking");
    }
  }
);

export const recordReceptionPaymentAsync = createAsyncThunk(
  "receptionBookings/recordPayment",
  async (payload, { rejectWithValue }) => {
    try {
      const res = await apiFetch(toApiUrl("/api/reception/payments"), {
        method: "POST",
        body: JSON.stringify(payload),
      });
      const data = await parseApiResponse(res);
      if (!res.ok) return rejectWithValue(data.error ?? "Could not record payment");
      return data.payment ?? null;
    } catch {
      return rejectWithValue("Could not record payment");
    }
  }
);

export const fetchReceptionSlots = createAsyncThunk(
  "receptionBookings/fetchSlots",
  async ({ serviceIds, date, customerGender }, { rejectWithValue }) => {
    try {
      const query = new URLSearchParams({ serviceIds: (serviceIds ?? []).join(","), date });
      // Without this the backend would fall back to the *receptionist's* gender
      // when picking which stylists can take the slot.
      if (customerGender) query.set("customerGender", customerGender);
      const res = await apiFetch(toApiUrl(`/api/reception/slots?${query.toString()}`), {
        headers: isPayloadEncryptionEnabled() ? { "x-payload-encrypted": "1" } : undefined,
      });
      const data = await parseApiResponse(res);
      if (!res.ok) return rejectWithValue(data.error ?? "Could not load slots");
      return data.slots ?? [];
    } catch {
      return rejectWithValue("Could not load slots");
    }
  }
);

export const connectReceptionRealtime = createAsyncThunk(
  "receptionBookings/connectRealtime",
  async (_, { dispatch, getState, rejectWithValue }) => {
    try {
      await connectReceptionBookingsSocket({
        token: null,
        onConnect: () => {
          dispatch(setReceptionRealtimeConnected(true));
          void dispatch(fetchReceptionBookings());
          void dispatch(fetchReceptionQueue());
          void dispatch(fetchReceptionServices());
        },
        onDisconnect: () => dispatch(setReceptionRealtimeConnected(false)),
        onBookingUpdated: booking => {
          dispatch(receptionBookingPatchedFromRealtime(booking));
          void dispatch(fetchReceptionQueue());
          const state = getState();
          const serviceIds = state?.receptionBookings?.bookingForm?.serviceIds ?? [];
          const bookingDate = state?.receptionBookings?.bookingForm?.bookingDate;
          const customerGender = state?.receptionBookings?.bookingForm?.customerGender;
          if (serviceIds.length && bookingDate) {
            void dispatch(fetchReceptionSlots({ serviceIds, date: bookingDate, customerGender }));
          }
        },
        onServiceCatalogUpdated: () => {
          void dispatch(fetchReceptionServices());
        },
      });
      return true;
    } catch {
      return rejectWithValue("Could not connect reception realtime");
    }
  }
);

export const disconnectReceptionRealtime = createAsyncThunk("receptionBookings/disconnectRealtime", async () => {
  disconnectReceptionBookingsSocket();
  return true;
});

const initialBookingForm = {
  customerName: "",
  customerEmail: "",
  customerPhone: "",
  // Empty, not "OTHER": the walk-in account inherits this, and a defaulted
  // gender is what fed customers the wrong services and reward cards.
  customerGender: "",
  bookingDate: "",
  serviceIds: [],
  stylistId: "",
  startsAt: "",
  paymentMode: "OFFLINE_CASH",
  comboId: "",
  membershipSegment: "FREE",
};

function recomputeReceptionPriceSummary(state) {
  state.priceSummary = computeOfferPriceSummary({
    serviceIds: state.bookingForm.serviceIds ?? [],
    comboId: state.bookingForm.comboId,
    services: state.services,
    offers: state.offers,
  });
}

const receptionBookingsSlice = createSlice({
  name: "receptionBookings",
  initialState: {
    bookings: [],
    queue: [],
    queueLoading: false,
    stylists: [],
    services: [],
    servicesLoading: false,
    servicesError: null,
    offers: null,
    offersLoading: false,
    slots: [],
    bookingForm: initialBookingForm,
    priceSummary: {
      totalAmount: 0,
      discountAmount: 0,
      payableAmount: 0,
      offerLabel: null,
    },
    loading: false,
    mutating: false,
    updatingBookingId: null,
    paymentMutating: false,
    customerLookupLoading: false,
    customerLookup: {
      status: "NEW_CUSTOMER",
      customer: null,
    },
    error: null,
    realtimeConnected: false,
  },
  reducers: {
    setReceptionBookingFormField(state, action) {
      const { field, value } = action.payload;
      state.bookingForm[field] = value;
      if (field === "serviceIds") {
        const ids = Array.isArray(value) ? value : [];
        state.bookingForm.serviceIds = ids;
        state.bookingForm.startsAt = "";
        state.bookingForm.stylistId = "";
        state.slots = [];
        const combo = state.offers?.combos?.find((item) => item.id === state.bookingForm.comboId);
        const comboKey = combo ? [...combo.serviceIds].sort().join(",") : "";
        const selectedKey = [...ids].sort().join(",");
        if (!combo || comboKey !== selectedKey) {
          state.bookingForm.comboId = "";
        }
        recomputeReceptionPriceSummary(state);
        return;
      }
      // Gender decides which stylists may take the slot, so an already-picked
      // slot/stylist can stop being valid the moment it changes.
      if (field === "bookingDate" || field === "customerGender") {
        state.bookingForm.startsAt = "";
        state.bookingForm.stylistId = "";
        state.slots = [];
      }
      if (field === "startsAt") {
        state.bookingForm.stylistId = "";
      }
    },
    resetReceptionBookingForm(state) {
      state.bookingForm = { ...initialBookingForm };
      state.slots = [];
      state.priceSummary = { totalAmount: 0, discountAmount: 0, payableAmount: 0, offerLabel: null };
      state.customerLookup = {
        status: "NEW_CUSTOMER",
        customer: null,
      };
    },
    applyReceptionComboOffer(state, action) {
      const combo = action.payload;
      if (!combo?.id || !Array.isArray(combo.serviceIds)) return;
      state.bookingForm.comboId = combo.id;
      state.bookingForm.serviceIds = [...combo.serviceIds];
      state.bookingForm.startsAt = "";
      state.bookingForm.stylistId = "";
      state.slots = [];
      recomputeReceptionPriceSummary(state);
    },
    clearReceptionComboOffer(state) {
      state.bookingForm.comboId = "";
      recomputeReceptionPriceSummary(state);
    },
    setReceptionMembershipSegment(state, action) {
      const segment = `${action.payload ?? "FREE"}`.trim().toUpperCase() || "FREE";
      state.bookingForm.membershipSegment = segment;
      state.bookingForm.comboId = "";
      recomputeReceptionPriceSummary(state);
    },
    setReceptionRealtimeConnected(state, action) {
      state.realtimeConnected = Boolean(action.payload);
    },
    receptionBookingPatchedFromRealtime(state, action) {
      const booking = action.payload;
      if (!booking?.id) return;
      const index = state.bookings.findIndex(item => item.id === booking.id);
      if (index >= 0) {
        state.bookings[index] = booking;
      } else {
        state.bookings.push(booking);
      }
      const queueIndex = state.queue.findIndex(item => item.id === booking.id);
      const inQueue = ["PENDING", "CONFIRMED", "STARTED"].includes(booking.status);
      if (inQueue) {
        if (queueIndex >= 0) state.queue[queueIndex] = booking;
        else state.queue.push(booking);
      } else if (queueIndex >= 0) {
        state.queue.splice(queueIndex, 1);
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchReceptionBookings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchReceptionBookings.fulfilled, (state, action) => {
        state.loading = false;
        state.bookings = action.payload;
      })
      .addCase(fetchReceptionBookings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? "Could not load bookings";
      })
      .addCase(fetchReceptionStylists.fulfilled, (state, action) => {
        state.stylists = action.payload;
      })
      .addCase(fetchReceptionStylists.rejected, (state, action) => {
        state.error = action.payload ?? "Could not load stylists";
      })
      .addCase(fetchReceptionServices.pending, (state) => {
        state.servicesLoading = true;
        state.servicesError = null;
      })
      .addCase(fetchReceptionServices.fulfilled, (state, action) => {
        state.servicesLoading = false;
        state.services = action.payload;
        recomputeReceptionPriceSummary(state);
      })
      .addCase(fetchReceptionSlots.fulfilled, (state, action) => {
        state.slots = action.payload;
      })
      .addCase(fetchReceptionServices.rejected, (state, action) => {
        state.servicesLoading = false;
        state.services = [];
        state.servicesError = action.payload ?? "Could not load services";
        state.error = state.servicesError;
      })
      .addCase(lookupReceptionCustomerAsync.pending, (state) => {
        state.customerLookupLoading = true;
      })
      .addCase(lookupReceptionCustomerAsync.fulfilled, (state, action) => {
        state.customerLookupLoading = false;
        state.customerLookup = action.payload;
        const segment =
          action.payload.status === "EXISTING_CUSTOMER"
            ? action.payload.customer?.membershipSegment ?? "FREE"
            : "FREE";
        state.bookingForm.membershipSegment = segment;
        state.bookingForm.comboId = "";
      })
      .addCase(fetchReceptionOffers.pending, (state) => {
        state.offersLoading = true;
      })
      .addCase(fetchReceptionOffers.fulfilled, (state, action) => {
        state.offersLoading = false;
        state.offers = action.payload;
        if (action.payload?.membershipSegment) {
          state.bookingForm.membershipSegment = action.payload.membershipSegment;
        }
        recomputeReceptionPriceSummary(state);
      })
      .addCase(fetchReceptionOffers.rejected, (state, action) => {
        state.offersLoading = false;
        state.error = action.payload ?? "Could not load offers";
      })
      .addCase(lookupReceptionCustomerAsync.rejected, (state, action) => {
        state.customerLookupLoading = false;
        state.error = action.payload ?? "Could not lookup customer";
      })
      .addCase(createReceptionBookingAsync.pending, (state) => {
        state.mutating = true;
        state.error = null;
      })
      .addCase(createReceptionBookingAsync.fulfilled, (state, action) => {
        state.mutating = false;
        if (action.payload) state.bookings.push(action.payload);
      })
      .addCase(fetchReceptionQueue.pending, (state) => {
        state.queueLoading = true;
      })
      .addCase(fetchReceptionQueue.fulfilled, (state, action) => {
        state.queueLoading = false;
        state.queue = action.payload;
      })
      .addCase(fetchReceptionQueue.rejected, (state) => {
        state.queueLoading = false;
      })
      .addCase(updateReceptionBookingAsync.pending, (state, action) => {
        state.updatingBookingId = action.meta.arg.bookingId;
      })
      .addCase(updateReceptionBookingAsync.fulfilled, (state, action) => {
        state.updatingBookingId = null;
        if (!action.payload?.id) return;
        const index = state.bookings.findIndex(item => item.id === action.payload.id);
        if (index >= 0) state.bookings[index] = action.payload;
        const queueIndex = state.queue.findIndex(item => item.id === action.payload.id);
        if (queueIndex >= 0) state.queue[queueIndex] = action.payload;
        else if (["PENDING", "CONFIRMED", "STARTED"].includes(action.payload.status)) {
          state.queue.push(action.payload);
        }
      })
      .addCase(updateReceptionBookingAsync.rejected, (state, action) => {
        state.updatingBookingId = null;
        state.error = action.payload ?? "Could not update booking";
      })
      .addCase(recordReceptionPaymentAsync.pending, (state) => {
        state.paymentMutating = true;
      })
      .addCase(recordReceptionPaymentAsync.fulfilled, (state) => {
        state.paymentMutating = false;
      })
      .addCase(recordReceptionPaymentAsync.rejected, (state, action) => {
        state.paymentMutating = false;
        state.error = action.payload ?? "Could not record payment";
      })
      .addCase(createReceptionBookingAsync.rejected, (state, action) => {
        state.mutating = false;
        state.error = action.payload ?? "Could not create booking";
      })
      .addCase(connectReceptionRealtime.rejected, (state, action) => {
        state.realtimeConnected = false;
        state.error = action.payload ?? "Could not connect reception realtime";
      })
      .addCase(disconnectReceptionRealtime.fulfilled, (state) => {
        state.realtimeConnected = false;
      });
  },
});

export const {
  setReceptionBookingFormField,
  resetReceptionBookingForm,
  applyReceptionComboOffer,
  clearReceptionComboOffer,
  setReceptionMembershipSegment,
  setReceptionRealtimeConnected,
  receptionBookingPatchedFromRealtime,
} = receptionBookingsSlice.actions;
export const receptionBookingsReducer = receptionBookingsSlice.reducer;
