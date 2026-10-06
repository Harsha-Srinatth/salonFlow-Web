"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useReceptionSession } from "@/receptionist/hooks/use-reception-session";
import { ReceptionLayout } from "@/receptionist/portal/reception-layout";
import { staffLogout } from "@/lib/staff-auth-client";
import { motion } from "motion/react";
import { LogOut, Mail, Shield, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { LoadingOrb } from "@/components/shared/loading-orb";

export default function ReceptionProfilePage() {
  const navigate = useNavigate();
  const { loading, user } = useReceptionSession();

  if (loading) {
    return (
      <LoadingOrb fullScreen label="Loading profile…" />
    );
  }

  if (!user) return null;

  const initial = user.name?.charAt(0)?.toUpperCase() ?? "R";

  return (
    <ReceptionLayout
      pageTitle="Profile"
      pageSubtitle="Your reception desk account"
      hideQuickActions
      actions={
        <Button
          variant="destructive"
          className="gap-2"
          onClick={async () => {
            await staffLogout();
            navigate("/auth/login", { replace: true });
          }}
        >
          <LogOut className="size-4" />
          Sign out
        </Button>
      }
    >
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="mx-auto max-w-2xl space-y-6"
      >
        <Card className="overflow-hidden border-primary/20">
          <div className="h-24 bg-gradient-to-r from-primary/10 via-secondary/5 to-accent/10" />
          <CardContent className="relative px-6 pb-6 pt-0">
            <div className="-mt-12 flex flex-col gap-6 sm:flex-row sm:items-end">
              <div className="flex size-24 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent text-4xl font-bold text-primary-foreground shadow-lg ring-4 ring-card">
                {initial}
              </div>
              <div className="flex-1 pb-1">
                <h1 className="font-serif text-3xl font-bold">{user.name}</h1>
                <p className="mt-1 flex items-center gap-2 text-muted-foreground">
                  <Mail className="size-4" />
                  {user.email}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="grid gap-4 p-6 sm:grid-cols-2">
            <div className="flex items-start gap-3 rounded-xl border bg-muted/20 p-4">
              <User className="mt-0.5 size-5 text-primary" />
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Display name</p>
                <p className="font-semibold">{user.name}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-xl border bg-muted/20 p-4">
              <Shield className="mt-0.5 size-5 text-primary" />
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Role</p>
                <p className="font-semibold">Receptionist</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </ReceptionLayout>
  );
}
