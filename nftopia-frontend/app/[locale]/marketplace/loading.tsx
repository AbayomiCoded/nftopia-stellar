import React from "react";
import { CircuitBackground } from "@/components/circuit-background";
import { MarketplaceSkeleton } from "@/components/Skeleton/MarketplaceSkeleton";

export default function MarketplaceLoading() {
  return (
    <main className="min-h-[100svh] relative text-white overflow-hidden contain-layout">
      <CircuitBackground />
      <div className="relative z-10 max-w-screen-xl mx-auto px-2 sm:px-4 md:px-8 lg:px-12 pt-12">
        <MarketplaceSkeleton />
      </div>
    </main>
  );
}
