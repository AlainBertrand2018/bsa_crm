
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  type NavItemType,
} from "@/components/ui/sidebar";
import { LayoutDashboard, FileText, FilePlus, Bot, Settings, LogOut, Users, Package, Receipt, ScrollText, Wrench, type LucideIcon } from "lucide-react";
import { APP_NAME } from "@/lib/constants";
import { useAuth } from "@/context/AuthContext";

const navItems: NavItemType[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/products", label: "Products", icon: Package },
  { href: "/quotations", label: "Quotations", icon: FileText },
  { href: "/quotations/new", label: "New Quotation", icon: FilePlus },
  { href: "/invoices", label: "Invoices", icon: FileText },
  { href: "/receipts", label: "Receipts", icon: Receipt },
  { href: "/statements", label: "Statements", icon: ScrollText },
  { href: "/ai-suggest", label: "AI Suggestion", icon: Bot },
];

const bottomNavItems: NavItemType[] = [
  // { href: "/settings", label: "Settings", icon: Settings },
  // { href: "/logout", label: "Logout", icon: LogOut },
];


export function AppSidebar() {
  const pathname = usePathname();
  const { currentUser } = useAuth();

  return (
    <Sidebar collapsible="icon" variant="sidebar" side="left">
      <SidebarHeader className="p-4 items-center justify-center">
        <Link href="/dashboard" className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center">
          {/* Using an inline SVG for the logo as per guidelines on non-textual code */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-8 w-8 text-primary group-data-[collapsible=icon]:h-6 group-data-[collapsible=icon]:w-6 transition-all"
            aria-label="BSA CRM Systems Logo"
          >
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
          </svg>
          <span className="font-bold text-lg text-primary group-data-[collapsible=icon]:hidden font-headline">
            {currentUser?.businessDetails?.businessName || APP_NAME}
          </span>
        </Link>
      </SidebarHeader>
      <SidebarContent className="p-2">
        <SidebarMenu>
          {[
            ...navItems,
            ...(currentUser?.role === 'Super Admin' || currentUser?.role === 'Admin'
              ? [
                { href: "/users", label: "Users", icon: Users },
                { href: "/tools", label: "Admin Tools", icon: Wrench }
              ]
              : [])
          ].map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                asChild
                isActive={pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href))}
                tooltip={{ children: item.label, className: "bg-primary text-primary-foreground" }}
                className="aria-[current=page]:bg-sidebar-primary aria-[current=page]:text-sidebar-primary-foreground"
                aria-current={pathname.startsWith(item.href) ? "page" : undefined}
              >
                <Link href={item.href}>
                  <item.icon />
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      {bottomNavItems.length > 0 && (
        <SidebarFooter className="p-2 border-t border-sidebar-border mt-auto">
          <SidebarMenu>
            {bottomNavItems.map((item) => <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                asChild
                tooltip={{ children: item.label, className: "bg-primary text-primary-foreground" }}
              >
                <Link href={item.href}>
                  <item.icon />
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            )}
          </SidebarMenu>
        </SidebarFooter>
      )}
    </Sidebar>
  );
}
