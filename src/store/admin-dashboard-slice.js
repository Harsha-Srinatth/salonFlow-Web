import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { getFirebaseIdToken } from "@/lib/auth/id-token";
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

export const fetchAdminDashboardData = createAsyncThunk("adminDashboard/fetchData", async (_, { rejectWithValue }) => {
  try {
    const [salonsRes, staffRes, servicesRes] = await Promise.all([
      apiFetch(toApiUrl("/api/admin/salons")),
      apiFetch(toApiUrl("/api/admin/staff")),
      apiFetch(toApiUrl("/api/admin/services")),
    ]);
    if (!salonsRes.ok || !staffRes.ok || !servicesRes.ok) {
      return rejectWithValue("Could not load admin dashboard data");
    }
    const salonsData = await salonsRes.json();
    const staffData = await staffRes.json();
    const servicesData = await servicesRes.json();
    return {
      salons: salonsData.salons ?? [],
      staff: staffData.staff ?? [],
      services: servicesData.services ?? [],
    };
  } catch {
    return rejectWithValue("Could not load admin dashboard data");
  }
});

export const createSalonAsync = createAsyncThunk("adminDashboard/createSalon", async (payload, { rejectWithValue }) => {
  try {
    const res = await apiFetch(toApiUrl("/api/admin/salons"), {
      method: "POST",
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return rejectWithValue(data.error ?? "Could not create salon");
    }
    return data.salon;
  } catch {
    return rejectWithValue("Could not create salon");
  }
});

export const updateStaffAsync = createAsyncThunk("adminDashboard/updateStaff", async ({ id, payload }, { rejectWithValue }) => {
  try {
    const res = await apiFetch(toApiUrl(`/api/admin/staff/${id}`), {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return rejectWithValue(data.error ?? "Update failed");
    }
    return data.user ?? null;
  } catch {
    return rejectWithValue("Update failed");
  }
});

export const deleteStaffAsync = createAsyncThunk("adminDashboard/deleteStaff", async (id, { rejectWithValue }) => {
  try {
    const res = await apiFetch(toApiUrl(`/api/admin/staff/${id}`), { method: "DELETE" });
    if (!res.ok) return rejectWithValue("Delete failed");
    return id;
  } catch {
    return rejectWithValue("Delete failed");
  }
});

const adminDashboardSlice = createSlice({
  name: "adminDashboard",
  initialState: {
    staff: [],
    salons: [],
    servicesCatalog: [],
    newSalon: {
      name: "",
      buildingNumber: "",
      streetName: "",
      areaName: "",
      cityName: "",
      stateName: "",
      countryName: "",
      pincode: "",
    },
    editId: null,
    editForm: {
      name: "",
      email: "",
      phone: "",
      role: "STAFF",
      genderType: "UNISEX",
      allowedServiceIds: [],
      workingHours: {},
      isActive: true,
    },
    loading: false,
    mutating: false,
    error: null,
  },
  reducers: {
    setNewSalonField(state, action) {
      const { field, value } = action.payload;
      state.newSalon[field] = value;
    },
    resetNewSalon(state) {
      state.newSalon = {
        name: "",
        buildingNumber: "",
        streetName: "",
        areaName: "",
        cityName: "",
        stateName: "",
        countryName: "",
        pincode: "",
      };
    },
    startEditStaff(state, action) {
      const staff = action.payload;
      state.editId = staff.id;
      state.editForm = {
        name: staff.name ?? "",
        email: staff.email ?? "",
        phone: staff.phone ?? "",
        role: staff.role === "RECEPTIONIST" ? "RECEPTIONIST" : "STAFF",
        genderType: staff.genderType ?? "UNISEX",
        allowedServiceIds: Array.isArray(staff.allowedServiceIds) ? staff.allowedServiceIds : [],
        workingHours: staff.workingHours ?? {},
        isActive: staff.isActive ?? true,
      };
    },
    setEditFormField(state, action) {
      const { field, value } = action.payload;
      state.editForm[field] = value;
    },
    clearEditStaff(state) {
      state.editId = null;
      state.editForm = {
        name: "",
        email: "",
        phone: "",
        role: "STAFF",
        genderType: "UNISEX",
        allowedServiceIds: [],
        workingHours: {},
        isActive: true,
      };
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAdminDashboardData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAdminDashboardData.fulfilled, (state, action) => {
        state.loading = false;
        state.staff = action.payload.staff;
        state.salons = action.payload.salons;
        state.servicesCatalog = action.payload.services;
      })
      .addCase(fetchAdminDashboardData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? "Could not load dashboard";
      })
      .addCase(createSalonAsync.pending, (state) => {
        state.mutating = true;
        state.error = null;
      })
      .addCase(createSalonAsync.fulfilled, (state, action) => {
        state.mutating = false;
        if (action.payload) state.salons.unshift(action.payload);
      })
      .addCase(createSalonAsync.rejected, (state, action) => {
        state.mutating = false;
        state.error = action.payload ?? "Could not create salon";
      })
      .addCase(updateStaffAsync.pending, (state) => {
        state.mutating = true;
        state.error = null;
      })
      .addCase(updateStaffAsync.fulfilled, (state) => {
        state.mutating = false;
      })
      .addCase(updateStaffAsync.rejected, (state, action) => {
        state.mutating = false;
        state.error = action.payload ?? "Update failed";
      })
      .addCase(deleteStaffAsync.pending, (state) => {
        state.mutating = true;
        state.error = null;
      })
      .addCase(deleteStaffAsync.fulfilled, (state, action) => {
        state.mutating = false;
        state.staff = state.staff.filter((member) => member.id !== action.payload);
      })
      .addCase(deleteStaffAsync.rejected, (state, action) => {
        state.mutating = false;
        state.error = action.payload ?? "Delete failed";
      });
  },
});

export const { setNewSalonField, resetNewSalon, startEditStaff, setEditFormField, clearEditStaff } = adminDashboardSlice.actions;
export const adminDashboardReducer = adminDashboardSlice.reducer;
