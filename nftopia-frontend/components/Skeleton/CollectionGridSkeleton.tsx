"use client";

import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface CollectionGridSkeletonProps {
  count?: number;
  className?: string;
}

export function CollectionCardSkeleton() {
  return (
    <div className="bg-[#1E1A45] rounded-xl overflow-hidden border border-purple-900/30 p-4 space-y-4">
      {/* Banner / Main Image */}
      <Skeleton className="h-48 w-full rounded-lg" />

      {/* Info Section */}
      <div className="space-y-3">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        
        {/* Preview Thumbnails */}
        <div className="flex gap-2 pt-2">
          <Skeleton className="h-16 w-16 rounded-lg" />
          <Skeleton className="h-16 w-16 rounded-lg" />
          <Skeleton className="h-16 w-16 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

export function CollectionGridSkeleton({
  count = 3,
  className,
}: CollectionGridSkeletonProps) {
  return (
    <div
      role="status"
      aria-label="Loading collections"
      className={cn(
        "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8",
        className
      )}
    >
      <span className="sr-only">Loading collections...</span>
      {Array.from({ length: count }).map((_, index) => (
        <CollectionCardSkeleton key={index} />
      ))}
    </div>
  );
}

export default CollectionGridSkeleton;
