"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface CreatorCardSkeletonProps {
  className?: string;
}

export function CreatorCardSkeleton({ className }: CreatorCardSkeletonProps) {
  return (
    <Card className={cn("border-gray-800/50 bg-gray-900/30", className)} role="status" aria-label="Loading creator info">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4 rounded-full" />
          <Skeleton className="h-4 w-20" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-5 w-32" />
        </div>
        <Skeleton className="h-3 w-28" />
      </CardContent>
    </Card>
  );
}

export default CreatorCardSkeleton;
