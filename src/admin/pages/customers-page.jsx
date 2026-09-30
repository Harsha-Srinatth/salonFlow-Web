"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AvatarBadge } from "@/admin/components/avatar-badge";
import { EmptyState } from "@/admin/components/empty-state";
import { StatusPill } from "@/admin/components/status-pill";
import { useRevealOnReady } from "@/admin/lib/motion";
import { Users } from "lucide-react";
import { useSelector } from "react-redux";
import { AdminLayout } from "../portal/admin-layout";

export default function AdminCustomersPage() {
    const customers = useSelector((state) => state.adminPortal.customers);
    const listRef = useRevealOnReady([customers.length], { selector: ":scope > *" });
    return (<AdminLayout pageTitle="Customers" description="Client roster, visit frequency, and lifetime spend.">
      <Card className="admin-shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="size-5"/>
            Customer List
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!customers.length ? (
            <EmptyState
              icon={Users}
              title="Customer directory is coming soon"
              description="Once customer analytics are wired up, every client's visit history and spend will show here."
            />
          ) : (
            <>
              {/* Table — sm and up */}
              <div ref={listRef} className="hidden overflow-x-auto rounded-lg border sm:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead className="text-center">Visits</TableHead>
                      <TableHead className="text-right">Spent</TableHead>
                      <TableHead className="text-right">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customers.map(customer => (<TableRow key={customer.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2.5">
                            <AvatarBadge name={customer.name} size="sm" />
                            <span>{customer.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">{customer.visits}</TableCell>
                        <TableCell className="text-right">${customer.totalSpent}</TableCell>
                        <TableCell className="text-right">
                          <StatusPill status={customer.status === "vip" ? "VIP" : customer.status} tone={customer.status === "vip" ? "accent" : "neutral"} />
                        </TableCell>
                      </TableRow>))}
                  </TableBody>
                </Table>
              </div>

              {/* Card list — mobile */}
              <div className="space-y-2.5 sm:hidden">
                {customers.map((customer) => (
                  <div key={customer.id} className="admin-shadow-sm rounded-xl border border-border/70 bg-card p-3.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <AvatarBadge name={customer.name} size="sm" />
                        <p className="truncate text-sm font-semibold">{customer.name}</p>
                      </div>
                      <StatusPill status={customer.status === "vip" ? "VIP" : customer.status} tone={customer.status === "vip" ? "accent" : "neutral"} />
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                      <span>{customer.visits} visits</span>
                      <span className="font-medium text-foreground">${customer.totalSpent}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </AdminLayout>);
}
