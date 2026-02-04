import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";
import React from "react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  className?: string;
}

export const StatCard = React.memo(({ title, value, icon: Icon, description, className }: StatCardProps) => {
  return (
    <Card className={cn("shadow-lg hover:shadow-xl transition-shadow duration-300", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-5 w-5 text-accent" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-primary">{value}</div>
        {description && <p className="text-xs text-muted-foreground pt-1">{description}</p>}
      </CardContent>
    </Card>
  );
});

StatCard.displayName = "StatCard";

// Helper for cn if not globally available in this context (it should be via utils)
// const cn = (...classes: (string | undefined | null | false)[]) => classes.filter(Boolean).join(' ');
import { cn } from "@/lib/utils";
