import React from "react";
import { CircuitBackground } from "@/components/circuit-background";
import { NftDetailSkeleton } from "./NFTDetailClient";

export default function NFTDetailLoading() {
  return (
    <main className="min-h-screen relative text-white overflow-hidden">
      <CircuitBackground />
      <div className="relative z-10">
        <NftDetailSkeleton />
      </div>
    </main>
  );
}
