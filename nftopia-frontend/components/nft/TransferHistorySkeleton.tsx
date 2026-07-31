"use client";

import React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface TransferHistorySkeletonProps {
  count?: number;
  showHeader?: boolean;
  className?: string;
}

export function EventRowSkeleton() {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3 px-4 border-b border-gray-800/50 last:border-0 overflow-hidden">
      {/* Event Badge */}
      <div className="sm:w-28 flex-shrink-0">
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>

      {/* From / To Addresses */}
      <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center gap-2 overflow-hidden">
        <Skeleton className="h-4 w-28 max-w-[120px] sm:max-w-none flex-shrink" />
        <Skeleton className="h-3 w-3 hidden sm:block rounded-full flex-shrink-0" />
        <Skeleton className="h-4 w-28 max-w-[120px] sm:max-w-none flex-shrink" />
      </div>

      {/* Price, Timestamp & Tx */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <Skeleton className="h-4 w-12 sm:w-16" />
        <Skeleton className="h-3 w-12 sm:w-16" />
        <Skeleton className="h-4 w-12 sm:w-14" />
      </div>
    </div>
  );
}

export function TransferHistorySkeleton({
  count = 5,
  showHeader = true,
  className,
}: TransferHistorySkeletonProps) {
  return (
    <Card
      role="status"
      aria-label="Loading transfer history"
      className={cn(
        "border-gray-800/50 bg-gray-900/30 backdrop-blur-sm overflow-hidden w-full",
        className
      )}
    >
      <span className="sr-only">Loading transfer history...</span>
      {showHeader && (
        <CardHeader>
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-24" />
          </div>
        </CardHeader>
      )}
      <CardContent className="p-0 divide-y divide-gray-800/50">
        {Array.from({ length: count }).map((_, index) => (
          <EventRowSkeleton key={index} />
        ))}
      </CardContent>
    </Card>
  );
}

export default TransferHistorySkeleton;
