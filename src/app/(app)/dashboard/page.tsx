
"use client";
import React, { useEffect, useState, useMemo } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/dashboard/StatCard';
import { DollarSign, FileText, AlertTriangle, CheckCircle, BarChartBig, Users, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import type { Quotation, Invoice, ClientDetails, Product } from '@/lib/types';
import { quotationsService, invoicesService, clientsService, productsService } from '@/lib/firestore';
import { useAuth } from '@/context/AuthContext';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from "recharts";
import { FullPageLoading } from '@/components/shared/LoadingSpinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function DashboardPage() {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<ClientDetails[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const { currentUser } = useAuth();

  useEffect(() => {
    async function fetchData() {
      if (!currentUser) return;

      try {
        const [quotationsData, invoicesData, clientsData, productsData] = await Promise.all([
          quotationsService.getAll(currentUser.id, currentUser.role, currentUser.companyId),
          invoicesService.getAll(currentUser.id, currentUser.role, currentUser.companyId),
          clientsService.getAll(currentUser.id, currentUser.role, currentUser.companyId),
          productsService.getAll(currentUser.id, currentUser.role, currentUser.companyId),
        ]);
        setQuotations(quotationsData as Quotation[]);
        setInvoices(invoicesData as Invoice[]);
        setClients(clientsData as ClientDetails[]);
        setProducts(productsData as Product[]);
      } catch (error) {
        console.error("Dashboard data fetch error:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [currentUser]);

  const stats = useMemo(() => {
    if (loading) {
      return {
        totalQuotationsValue: 0,
        quotationsCount: 0,
        totalInvoicesValue: 0,
        invoicesCount: 0,
        openQuotations: 0,
        unpaidInvoices: 0,
        clientsCount: 0,
        productsCount: 0
      };
    }
    return {
      totalQuotationsValue: quotations.reduce((sum, q) => sum + q.grandTotal, 0),
      quotationsCount: quotations.length,
      totalInvoicesValue: invoices.reduce((sum, inv) => sum + inv.grandTotal, 0),
      invoicesCount: invoices.length,
      openQuotations: quotations.filter(q => q.status === 'Sent').length,
      unpaidInvoices: invoices.filter(inv => inv.status === 'Sent' || inv.status === 'Partly Paid').length,
      clientsCount: clients.length,
      productsCount: products.length
    };
  }, [quotations, invoices, clients, products, loading]);

  const productAvailabilityData = useMemo(() => {
    if (loading) return [];

    // Use products from Firestore (user_products)
    // If no products in Firestore yet, show empty or placeholder state
    return products
      .filter(p => p.type === "Physical")
      .map(product => {
        const soldCount = quotations.filter(q =>
          q.status === 'Won' &&
          q.items.some(item => item.productTypeId === product.id)
        ).length;

        return {
          name: product.name,
          available: product.inventory ?? product.available ?? 0,
          sold: soldCount
        };
      });
  }, [quotations, products, loading]);

  const chartConfig = useMemo(() => ({
    available: { label: "Available", color: "hsl(var(--chart-2))" },
    sold: { label: "Sold", color: "hsl(var(--chart-1))" },
  }), []) satisfies import("@/components/ui/chart").ChartConfig;

  if (loading) {
    return <FullPageLoading message="Loading dashboard data..." />;
  }

  return (
    <>
      <PageHeader
        title="Dashboard Overview"
        description="Welcome to BSA CRM Systems. Here's a summary of your activities."
        actions={
          <Link href="/quotations/new">
            <Button className="bg-accent hover:bg-accent/90 text-accent-foreground">
              <FileText className="mr-2 h-4 w-4" /> Create New Quotation
            </Button>
          </Link>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-8">
        <StatCard title="Total Quotations Value" value={formatCurrency(stats.totalQuotationsValue)} icon={DollarSign} description={`${stats.quotationsCount} quotations generated`} />
        <StatCard title="Total Invoices Value" value={formatCurrency(stats.totalInvoicesValue)} icon={CheckCircle} description={`${stats.invoicesCount} invoices issued`} />
        <StatCard title="Total Clients" value={stats.clientsCount} icon={Users} description="Registered in database" />
        <StatCard title="Open Quotations" value={stats.openQuotations} icon={AlertTriangle} description="Awaiting client response" />
        <StatCard title="Unpaid Invoices" value={stats.unpaidInvoices} icon={FileText} description="Pending payments" />
        <StatCard title="Products/Services" value={stats.productsCount} icon={Package} description="Defined in your profile" />
      </div>

      <div className="grid gap-8 lg:grid-cols-2 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChartBig className="h-5 w-5 text-primary" />
              Product Availability
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
                <BarChart accessibilityLayer data={productAvailabilityData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis
                    dataKey="name"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tickFormatter={(value) =>
                      value && typeof value === 'string' && value.length > 15 ? `${value.substring(0, 12)}...` : value
                    }
                  />
                  <YAxis tickLine={false} axisLine={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar dataKey="available" fill="var(--color-available)" radius={4} />
                  <Bar dataKey="sold" fill="var(--color-sold)" radius={4} />
                </BarChart>
              </ChartContainer>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="quotations" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="quotations">Recent Quotations</TabsTrigger>
                <TabsTrigger value="invoices">Recent Invoices</TabsTrigger>
              </TabsList>
              <TabsContent value="quotations">
                <RecentDataTable type="quotation" data={quotations.slice(0, 5)} />
              </TabsContent>
              <TabsContent value="invoices">
                <RecentDataTable type="invoice" data={invoices.slice(0, 5)} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </>
  );
}


const RecentDataTable = React.memo(({ type, data }: { type: 'quotation' | 'invoice', data: (Quotation | Invoice)[] }) => {
  if (data.length === 0) {
    return <p className="text-muted-foreground text-center py-4">No recent {type}s.</p>;
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>ID</TableHead>
          <TableHead>Client</TableHead>
          <TableHead className="text-right">Amount</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((item) => (
          <TableRow key={item.id}>
            <TableCell className="font-medium">
              <Link href={`/${type}s/${item.id}`} className="hover:underline text-primary">
                {item.id.length > 20 ? `${item.id.substring(0, 8)}...${item.id.slice(-4)}` : item.id}
              </Link>
            </TableCell>
            <TableCell>{item.clientName}</TableCell>
            <TableCell className="text-right">{formatCurrency(item.grandTotal, item.currency)}</TableCell>
            <TableCell>
              <Badge variant={
                type === 'quotation' ?
                  ((item as Quotation).status === 'Won' ? 'default' : (item as Quotation).status === 'Sent' ? 'secondary' : 'destructive') :
                  ((item as Invoice).status === 'Fully Paid' ? 'default' : (item as Invoice).status === 'Partly Paid' ? 'secondary' : 'destructive')
              }
                className="capitalize"
              >
                {type === 'quotation' ? (item as Quotation).status : (item as Invoice).status}
              </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
});

RecentDataTable.displayName = 'RecentDataTable';
