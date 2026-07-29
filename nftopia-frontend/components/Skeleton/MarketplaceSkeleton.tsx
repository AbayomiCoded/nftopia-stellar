"use client";

import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { CollectionGridSkeleton } from "./CollectionGridSkeleton";
import { cn } from "@/lib/utils";

interface MarketplaceSkeletonProps {
  className?: string;
}

export function MarketplaceSkeleton({ className }: MarketplaceSkeletonProps) {
  return (
    <div
      role="status"
      aria-label="Loading marketplace page"
      className={cn("space-y-16 py-8", className)}
    >
      <span className="sr-only">Loading marketplace...</span>

      {/* Live Auctions Section Skeleton */}
      <section className="py-8 space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-28" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="bg-[#1E1A45] rounded-2xl overflow-hidden border border-purple-900/30 p-4 space-y-3"
            >
              <Skeleton className="h-[240px] w-full rounded-xl" />
              <Skeleton className="h-6 w-3/4" />
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-6 w-6 rounded-full" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <Skeleton className="h-4 w-16" />
              </div>
              <div className="pt-2 border-t border-purple-900/30 flex justify-between items-center">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-7 w-20 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Top Sellers Section Skeleton */}
      <section className="py-8 space-y-6">
        <div className="flex flex-col items-center mb-8">
          <Skeleton className="h-10 w-48 mb-2" />
          <Skeleton className="h-1 w-32" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl p-4 bg-gray-900/80 border border-gray-800/50 flex items-center gap-3"
            >
              <Skeleton className="w-12 h-12 rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Today's Picks Section Skeleton */}
      <section className="py-8 space-y-6">
        {/* Filter bar placeholder */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-gray-900/40 p-4 rounded-xl border border-gray-800/50">
          <Skeleton className="h-10 w-full sm:w-64 rounded-lg" />
          <div className="flex gap-2 w-full sm:w-auto">
            <Skeleton className="h-10 w-28 rounded-lg" />
            <Skeleton className="h-10 w-28 rounded-lg" />
          </div>
        </div>

        {/* 8 NFT Grid Items */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="bg-[#1E1A45] rounded-2xl overflow-hidden border border-purple-900/30 p-4 space-y-3"
            >
              <Skeleton className="h-[240px] w-full rounded-xl" />
              <Skeleton className="h-6 w-3/4" />
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-6 w-6 rounded-full" />
                  <Skeleton className="h-4 w-20" />
                </div>
                <Skeleton className="h-4 w-16" />
              </div>
              <div className="pt-2 border-t border-purple-900/30 flex justify-between items-center">
                <Skeleton className="h-7 w-20 rounded-full" />
                <Skeleton className="h-7 w-20 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Popular Collections Section Skeleton */}
      <section className="py-8 space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-28" />
        </div>
        <CollectionGridSkeleton count={3} />
      </section>
    </div>
  );
}

export default MarketplaceSkeleton;
