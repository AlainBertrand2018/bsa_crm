
import React from 'react';
import { cn } from '@/lib/utils';
import { APP_NAME } from '@/lib/constants';

interface LogoProps {
    className?: string;
    iconOnly?: boolean;
    businessName?: string;
}

export const Logo = React.memo(({ className, iconOnly = false, businessName }: LogoProps) => {
    return (
        <div className={cn("flex items-center gap-2", className)}>
            <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-8 w-8 text-primary shrink-0"
                aria-label={`${businessName || APP_NAME} Logo`}
            >
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
            </svg>
            {!iconOnly && (
                <span className="font-bold text-lg text-primary font-headline truncate max-w-[200px] sm:max-w-none">
                    {businessName || APP_NAME}
                </span>
            )}
        </div>
    );
});

Logo.displayName = "Logo";
