"use client";

import { fetchStaffMe, peekStaffMe } from "@/lib/staff-auth-client";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export function useReceptionSession() {
  const navigate = useNavigate();
  // The staff user is cached for the session, so tabs after the first render immediately.
  const [user, setUser] = useState(() => (peekStaffMe()?.role === "RECEPTIONIST" ? peekStaffMe() : null));
  const [loading, setLoading] = useState(() => !user);

  useEffect(() => {
    if (user) return undefined;
    let cancelled = false;
    void (async () => {
      const me = await fetchStaffMe();
      if (cancelled) return;
      setLoading(false);
      if (!me || me.role !== "RECEPTIONIST") {
        navigate("/auth/login", { replace: true });
        return;
      }
      setUser(me);
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return { loading, user };
}
