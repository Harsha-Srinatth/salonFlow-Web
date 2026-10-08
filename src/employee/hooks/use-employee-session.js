"use client";

import { fetchStaffMe } from "@/lib/staff-auth-client";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export function useEmployeeSession() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const me = await fetchStaffMe();
      if (cancelled) return;
      setLoading(false);
      if (!me || me.role !== "STAFF") {
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
