import { Button } from "@/components/ui/button";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import React from "react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionText?: string;
  actionHref?: string;
  onActionClick?: () => void;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionText,
  actionHref,
  onActionClick,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center p-8 border border-dashed rounded-lg bg-card/50">
      <Icon className="w-16 h-16 text-muted-foreground mb-4" />
      <h3 className="text-xl font-semibold text-primary mb-2">{title}</h3>
      <p className="text-muted-foreground mb-6 max-w-sm">{description}</p>
      {actionText && (actionHref || onActionClick) && (
        actionHref ? (
          <Link href={actionHref}>
            <Button className="bg-accent hover:bg-accent/90 text-accent-foreground">{actionText}</Button>
          </Link>
        ) : (
          <Button onClick={onActionClick} className="bg-accent hover:bg-accent/90 text-accent-foreground">{actionText}</Button>
        )
      )}
    </div>
  );
}
