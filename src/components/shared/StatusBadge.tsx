
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { STATUS_COLORS } from '@/lib/constants';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
    status: string;
    className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
    // Get color from mapping or fallback to muted
    const colorClass = STATUS_COLORS[status] || 'bg-muted text-muted-foreground';

    return (
        <Badge className={cn("font-medium px-2.5 py-0.5 rounded-full border-0 capitalize text-xs shadow-sm", colorClass, className)}>
            {status}
        </Badge>
    );
}
