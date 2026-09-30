"use client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusPill } from "@/admin/components/status-pill";
import { useEntrance } from "@/admin/lib/motion";
import { Mail, Save, Store } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AdminLayout } from "../portal/admin-layout";

export default function AdminSettingsPage() {
    const [displayName, setDisplayName] = useState("");
    const [supportEmail, setSupportEmail] = useState("");
    const cardRef = useEntrance({ distance: 12 });

    function saveSettings(event) {
        event.preventDefault();
        toast.info("Salon settings will save automatically once backend wiring lands — your changes are safe for now.");
    }

    return (<AdminLayout pageTitle="Settings" description="Salon profile and support details.">
      <div ref={cardRef} className="max-w-2xl">
      <Card className="admin-shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2">
              <Store className="size-5 text-primary" />
              Salon Settings
            </CardTitle>
            <StatusPill status="Coming soon" tone="warning" />
          </div>
          <CardDescription>UI-ready settings form for the admin portal.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={saveSettings}>
            <div className="space-y-2">
              <Label htmlFor="salon-display-name" className="flex items-center gap-1.5">
                <Store className="size-3.5" /> Display name
              </Label>
              <Input id="salon-display-name" placeholder="Sahasra Salon" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="support-email" className="flex items-center gap-1.5">
                <Mail className="size-3.5" /> Support email
              </Label>
              <Input id="support-email" type="email" placeholder="support@example.com" value={supportEmail} onChange={(e) => setSupportEmail(e.target.value)} />
            </div>
            <Button type="submit">
              <Save className="size-4" />
              Save settings
            </Button>
          </form>
        </CardContent>
      </Card>
      </div>
    </AdminLayout>);
}
