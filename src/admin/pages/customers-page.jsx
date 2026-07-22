"use client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users } from "lucide-react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { AdminLayout } from "../portal/admin-layout";
export default function AdminCustomersPage() {
    const customers = useSelector((state) => state.adminPortal.customers);
    return (<AdminLayout pageTitle="Customers" actions={<Button asChild variant="outline" size="sm">
          <Link to="/admin-dashboard">Dashboard</Link>
        </Button>}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="size-5"/>
            Customer List
          </CardTitle>
        </CardHeader>
        <CardContent>
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
                  <TableCell className="font-medium">{customer.name}</TableCell>
                  <TableCell className="text-center">{customer.visits}</TableCell>
                  <TableCell className="text-right">${customer.totalSpent}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant={customer.status === "vip" ? "default" : "secondary"}>{customer.status}</Badge>
                  </TableCell>
                </TableRow>))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AdminLayout>);
}
