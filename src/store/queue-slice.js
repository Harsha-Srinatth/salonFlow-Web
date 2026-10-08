import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { createDedupedThunk } from "./in-flight";
import { getFirebaseIdToken } from "@/lib/auth/id-token";
import {
  connectCustomerBookingsSocket,
  disconnectCustomerBookingsSocket,
  removeQueueSnapshotListener,
} from "@/lib/realtime/admin-bookings-socket";
import { fetchLiveQueueBoard, fetchMyQueuePosition } from "@/lib/queue-api";
import { mergeMyEntriesWithBoard, pickActiveEntry } from "@/lib/queue-utils";

/**
 * Live queue state (SRS 4.7).
 *
 * The read pattern here is deliberate, because this is the screen a customer
 * leaves open while they wait: two requests when the page opens, then nothing.
 * Every subsequent update arrives on the websocket as one anonymised board that
 * the server serialises once for everyone, and the customer's own row is
 * refreshed locally by matching their ticket against it.
 *
 * The only case that re-hits the API is a booking of the customer's own changing
 * (which needs new ticket data) or their ticket falling outside the capped
 * board — both rare, both per-user rather than per-broadcast.
 */

const SNAPSHOT_CALLBACK = { current: null };

export const fetchQueueBoard = createDedupedThunk("queue/fetchBoard", async (_, { rejectWithValue }) => {
  try {
    return await fetchLiveQueueBoard();
  } catch (error) {
    return rejectWithValue(error?.message ?? "Could not load the live queue");
  }
});

export const fetchMyQueueStatus = createDedupedThunk("queue/fetchMine", async (_, { rejectWithValue }) => {
  try {
    return await fetchMyQueuePosition();
  } catch (error) {
    return rejectWithValue(error?.message ?? "Could not load your queue position");
  }
});

export const connectQueueRealtime = createAsyncThunk(
  "queue/connectRealtime",
  async ({ userId } = {}, { dispatch, rejectWithValue }) => {
    try {
      const token = await getFirebaseIdToken().catch(() => null);
      // One stable callback reference for the app's lifetime: re-subscribing adds
      // it to a Set, so a remount can never register a duplicate listener.
      if (!SNAPSHOT_CALLBACK.current) {
        SNAPSHOT_CALLBACK.current = (board) => dispatch(queueSnapshotReceived(board));
      }
      await connectCustomerBookingsSocket({
        token,
        owner: "queue",
        onConnect: () => dispatch(setQueueRealtimeConnected(true)),
        onDisconnect: () => dispatch(setQueueRealtimeConnected(false)),
        onQueueSnapshot: SNAPSHOT_CALLBACK.current,
        onBookingUpdated: (booking) => {
          // Booking events reach every connected customer, so refetching for all
          // of them would turn one salon action into a request per viewer. Only
          // the customer whose own booking moved needs fresh ticket data.
          if (userId && booking?.createdBy === userId) void dispatch(fetchMyQueueStatus());
        },
      });
      return true;
    } catch {
      return rejectWithValue("Could not connect to the live queue");
    }
  }
);

export const disconnectQueueRealtime = createAsyncThunk("queue/disconnectRealtime", async () => {
  if (SNAPSHOT_CALLBACK.current) removeQueueSnapshotListener("customer", SNAPSHOT_CALLBACK.current);
  disconnectCustomerBookingsSocket();
  return true;
});

function applyBoardToMine(state, board) {
  if (!state.mine) return;
  const entries = mergeMyEntriesWithBoard(state.mine.entries ?? [], board);
  state.mine = {
    ...state.mine,
    summary: board.summary ?? state.mine.summary,
    generatedAt: board.generatedAt ?? state.mine.generatedAt,
    entries,
    current: pickActiveEntry(entries),
  };
  const tickets = new Set((board.entries ?? []).map((entry) => entry.ticket));
  // Missing from a capped board means "further down the queue than the board
  // shows", not "finished" — hold the last values and let the page top up slowly.
  state.mineStale = Boolean(
    entries.length && board.truncated && !entries.some((entry) => tickets.has(entry.ticket))
  );
}

const queueSlice = createSlice({
  name: "queue",
  initialState: {
    board: null,
    boardLoading: false,
    boardError: null,
    mine: null,
    mineLoading: false,
    mineError: null,
    mineStale: false,
    realtimeConnected: false,
    lastUpdatedAt: null,
  },
  reducers: {
    setQueueRealtimeConnected(state, action) {
      state.realtimeConnected = Boolean(action.payload);
    },
    queueSnapshotReceived(state, action) {
      const board = action.payload;
      if (!board?.generatedAt) return;
      state.board = board;
      state.lastUpdatedAt = board.generatedAt;
      applyBoardToMine(state, board);
    },
  },
  extraReducers(builder) {
    builder
      .addCase(fetchQueueBoard.pending, (state) => {
        state.boardLoading = true;
        state.boardError = null;
      })
      .addCase(fetchQueueBoard.fulfilled, (state, action) => {
        state.boardLoading = false;
        state.board = action.payload;
        state.lastUpdatedAt = action.payload?.generatedAt ?? state.lastUpdatedAt;
        if (action.payload) applyBoardToMine(state, action.payload);
      })
      .addCase(fetchQueueBoard.rejected, (state, action) => {
        state.boardLoading = false;
        state.boardError = action.payload ?? "Could not load the live queue";
      })
      .addCase(fetchMyQueueStatus.pending, (state) => {
        state.mineLoading = true;
        state.mineError = null;
      })
      .addCase(fetchMyQueueStatus.fulfilled, (state, action) => {
        state.mineLoading = false;
        state.mine = action.payload ?? null;
        state.mineStale = false;
        if (state.board) applyBoardToMine(state, state.board);
      })
      .addCase(fetchMyQueueStatus.rejected, (state, action) => {
        state.mineLoading = false;
        state.mineError = action.payload ?? "Could not load your queue position";
      })
      .addCase(connectQueueRealtime.rejected, (state) => {
        state.realtimeConnected = false;
      })
      .addCase(disconnectQueueRealtime.fulfilled, (state) => {
        state.realtimeConnected = false;
      });
  },
});

export const { setQueueRealtimeConnected, queueSnapshotReceived } = queueSlice.actions;
export const queueReducer = queueSlice.reducer;
