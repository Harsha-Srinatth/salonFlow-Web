"use client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "react-router-dom";
import { AdminLayout } from "../portal/admin-layout";
export default function AdminSettingsPage() {
    return (<AdminLayout pageTitle="Settings" actions={<Button asChild variant="outline" size="sm">
          <Link to="/admin-dashboard">Dashboard</Link>
        </Button>}>
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Salon Settings</CardTitle>
          <CardDescription>UI-ready settings form for admin portal.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="salon-display-name">Display name</Label>
            <Input id="salon-display-name" placeholder="Sahasra Salon"/>
          </div>
          <div className="space-y-2">
            <Label htmlFor="support-email">Support email</Label>
            <Input id="support-email" type="email" placeholder="support@example.com"/>
          </div>
          <Button>Save settings</Button>
        </CardContent>
      </Card>
    </AdminLayout>);
}
