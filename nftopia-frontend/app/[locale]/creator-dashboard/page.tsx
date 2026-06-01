"use client";

import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "@/hooks/useTranslation";
import { TrendingUp, Users, DollarSign, Package, AlertCircle, ShoppingBag, Plus } from "lucide-react";
import Link from "next/link";
import { useTheme } from "@/lib/stores/preferences-store";
import { useLocalizedRoute } from "@/lib/routing";
import { useExperimentVariant } from '@/hooks/useExperiment';
import { useAuth } from "@/lib/stores/auth-store";
import { API_CONFIG } from "@/lib/config";
import { fetchWithAuth } from "@/lib/api/fetchWithAuth";
import { telemetry } from '@/lib/telemetry';
import { sanitizeTelemetryPayload } from '@/lib/telemetry/sanitizer';
import { EVENT_NAMES } from '@/lib/telemetry/events';

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHr / 24);

  if (diffSec < 60) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDays === 1) return "1 day ago";
  return `${diffDays} days ago`;
}

export interface CreatorActivity {
  id: string;
  action: string;
  amount: string;
  time: Date;
  type: "sale" | "purchase" | "collection" | "mint";
}

export interface CreatorDashboardViewModel {
  totalNfts: number;
  totalCollections: number;
  totalEarnings: string;
  totalTransactions: number;
  recentActivities: CreatorActivity[];
}

function extractArray(val: any): any[] {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  if (Array.isArray(val.data)) return val.data;
  if (val.data && typeof val.data === "object") {
    return extractArray(val.data);
  }
  if (Array.isArray(val.nfts)) return val.nfts;
  if (Array.isArray(val.collections)) return val.collections;
  if (Array.isArray(val.transactions)) return val.transactions;
  return [];
}

function extractTotal(val: any, fallbackLength: number): number {
  if (!val) return fallbackLength;
  if (typeof val.total === "number") return val.total;
  if (val.data && typeof val.data === "object") {
    return extractTotal(val.data, fallbackLength);
  }
  return fallbackLength;
}

export default function CreatorDashboardPage() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { user } = useAuth();
  const localizedRoute = useLocalizedRoute();
  
  const copyAssignment = useExperimentVariant('creator-onboarding-copy-2026-q2');
  const exposureSentRef = useRef(false);
  const exposureSessionIdRef = useRef<string | null>(null);
  const exposureTimestampRef = useRef<number | null>(null);

  const [viewModel, setViewModel] = useState<CreatorDashboardViewModel>({
    totalNfts: 0,
    totalCollections: 0,
    totalEarnings: "0.0000000",
    totalTransactions: 0,
    recentActivities: [],
  });
  
  const [loading, setLoading] = useState({
    stats: true,
    activities: true,
  });
  const [errors, setErrors] = useState({
    stats: "",
    activities: "",
  });

  useEffect(() => {
    if (!copyAssignment || exposureSentRef.current) return;
    const exposureSessionId = crypto.randomUUID();
    exposureSessionIdRef.current = exposureSessionId;
    exposureTimestampRef.current = Date.now();
    telemetry.track(
      EVENT_NAMES.experimentExposed,
      sanitizeTelemetryPayload({
        experiment_id: copyAssignment.experiment_id,
        experiment_name: 'Creator Onboarding Copy Variants',
        variant_id: copyAssignment.variant_id,
        variant_name: copyAssignment.variant_name,
        variant_version: 1,
        surface: 'creator_dashboard_cta',
        placement_category: 'inline_card',
        cta_label: copyAssignment.variant_name,
        assigned_at_timestamp_ms: copyAssignment.assigned_at_timestamp_ms,
        is_control: copyAssignment.is_control,
        target_user_segment: 'creators_only',
        rollout_percentage: 100,
        exposure_session_id: exposureSessionId,
        experiment_session_id: '',
      })
    );
    exposureSentRef.current = true;
  }, [copyAssignment]);

  const handleCreateCollectionClick = () => {
    if (!copyAssignment || !exposureSessionIdRef.current || !exposureTimestampRef.current) return;
    telemetry.track(
      EVENT_NAMES.experimentInteraction,
      sanitizeTelemetryPayload({
        experiment_id: copyAssignment.experiment_id,
        variant_id: copyAssignment.variant_id,
        interaction_type: 'click',
        interaction_timestamp_ms: Date.now(),
        time_to_interaction_ms: Date.now() - exposureTimestampRef.current,
        surface: 'creator_dashboard_cta',
        placement_category: 'inline_card',
        is_control: copyAssignment.is_control,
        exposure_session_id: exposureSessionIdRef.current,
        interaction_sequence: 1,
      })
    );
  };

  useEffect(() => {
    if (!user?.id) return;

    setLoading({ stats: true, activities: true });
    setErrors({ stats: "", activities: "" });

    Promise.allSettled([
      fetchWithAuth(`${API_CONFIG.baseUrl}/collections?creatorId=${user.id}`).then(r => r.json()),
      fetchWithAuth(`${API_CONFIG.baseUrl}/nfts?creatorId=${user.id}`).then(r => r.json()),
      fetchWithAuth(`${API_CONFIG.baseUrl}/users/me/earnings`).then(r => r.json()),
      fetchWithAuth(`${API_CONFIG.baseUrl}/transactions`).then(r => r.json()),
    ]).then(([collectionsRes, nftsRes, earningsRes, txsRes]) => {
      let totalCollections = 0;
      let totalNfts = 0;
      let totalEarnings = "0.0000000";
      let totalTransactions = 0;

      if (collectionsRes.status === "fulfilled") {
        const colVal = collectionsRes.value;
        const colArray = extractArray(colVal);
        totalCollections = extractTotal(colVal, colArray.length);
      }

      if (nftsRes.status === "fulfilled") {
        const nftVal = nftsRes.value;
        const nftArray = extractArray(nftVal);
        totalNfts = extractTotal(nftVal, nftArray.length);
      }

      if (earningsRes.status === "fulfilled") {
        const earnVal = earningsRes.value;
        totalEarnings = earnVal.data?.data?.earnings ?? earnVal.earnings ?? "0.0000000";
      }

      if (txsRes.status === "fulfilled") {
        const txVal = txsRes.value;
        const txArray = extractArray(txVal);
        totalTransactions = txArray.filter((tx: any) => tx.sellerId === user.id && (tx.state === "completed" || tx.state === "COMPLETED")).length;
      }

      const recentActivities: CreatorActivity[] = [];

      if (txsRes.status === "fulfilled") {
        const txVal = txsRes.value;
        const txArray = extractArray(txVal);
        txArray.forEach((tx: any) => {
          if (tx.state === "completed" || tx.state === "COMPLETED") {
            const isSale = tx.sellerId === user.id;
            recentActivities.push({
              id: `tx-${tx.id}`,
              action: isSale ? `NFT #${tx.nftTokenId || 'Unknown'} sold` : `NFT #${tx.nftTokenId || 'Unknown'} purchased`,
              amount: `${parseFloat(tx.amount).toFixed(2)} ${tx.currency || 'STRK'}`,
              time: new Date(Number(tx.completedAt || tx.createdAt) * 1000),
              type: isSale ? "sale" : "purchase",
            });
          }
        });
      }

      if (collectionsRes.status === "fulfilled") {
        const colVal = collectionsRes.value;
        const colArray = extractArray(colVal);
        colArray.forEach((col: any) => {
          recentActivities.push({
            id: `col-${col.id}`,
            action: `New collection created`,
            amount: col.name,
            time: new Date(col.createdAt),
            type: "collection",
          });
        });
      }

      if (nftsRes.status === "fulfilled") {
        const nftVal = nftsRes.value;
        const nftArray = extractArray(nftVal);
        nftArray.forEach((nft: any) => {
          recentActivities.push({
            id: `nft-${nft.id}`,
            action: `NFT #${nft.tokenId} minted`,
            amount: nft.name,
            time: new Date(nft.mintedAt || nft.createdAt),
            type: "mint",
          });
        });
      }

      recentActivities.sort((a, b) => b.time.getTime() - a.time.getTime());

      setViewModel({
        totalNfts,
        totalCollections,
        totalEarnings,
        totalTransactions,
        recentActivities: recentActivities.slice(0, 5),
      });
      setLoading({ stats: false, activities: false });
    }).catch(err => {
      console.error("Error fetching dashboard statistics:", err);
      setErrors({ stats: "Failed to load dashboard statistics.", activities: "Failed to load recent activity feed." });
      setLoading({ stats: false, activities: false });
    });

  }, [user?.id]);

  const dashboardCards = [
    {
      label: t("creatorDashboard.totalNFTs") || "Total NFTs",
      value: loading.stats ? "..." : String(viewModel.totalNfts),
      change: viewModel.totalNfts > 0 ? "+100%" : "0%",
      icon: Package,
      color: "text-purple-400",
    },
    {
      label: t("creatorDashboard.totalCollections") || "Collections",
      value: loading.stats ? "..." : String(viewModel.totalCollections),
      change: viewModel.totalCollections > 0 ? "+100%" : "0%",
      icon: Users,
      color: "text-blue-400",
    },
    {
      label: t("creatorDashboard.totalEarnings") || "Total Earnings",
      value: loading.stats ? "..." : `${parseFloat(viewModel.totalEarnings).toFixed(2)} STRK`,
      change: parseFloat(viewModel.totalEarnings) > 0 ? "+100%" : "0%",
      icon: DollarSign,
      color: "text-green-400",
    },
    {
      label: t("creatorDashboard.totalTransactions") || "Total Sales",
      value: loading.stats ? "..." : String(viewModel.totalTransactions),
      change: viewModel.totalTransactions > 0 ? "+100%" : "0%",
      icon: TrendingUp,
      color: "text-red-400",
    },
  ];

  return (
    <div className="p-6 lg:p-8 bg-background min-h-screen">
      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            {t("creatorDashboard.title") || "Creator Dashboard"}
          </h1>
          <p className="text-muted-foreground">
            {t("creatorDashboard.subtitle") || "Manage your NFTs and track your earnings"}
          </p>
        </div>
        {user && (
          <div className="flex items-center space-x-3 bg-card border border-border/80 px-4 py-2.5 rounded-xl shadow-sm backdrop-blur-sm">
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt="avatar" className="w-9 h-9 rounded-full border border-border object-cover" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary">
                {user.username?.slice(0, 2).toUpperCase() || "US"}
              </div>
            )}
            <div>
              <div className="text-sm font-semibold text-foreground">{user.username || "Creator"}</div>
              <div className="text-xs text-muted-foreground font-mono">{user.walletAddress?.slice(0, 6)}...{user.walletAddress?.slice(-4)}</div>
            </div>
          </div>
        )}
      </div>

      {errors.stats ? (
        <div className="flex flex-col items-center justify-center p-8 text-center bg-red-500/10 border border-red-500/20 rounded-xl mb-8">
          <AlertCircle className="w-10 h-10 text-red-400 mb-2 animate-bounce" />
          <span className="text-sm font-semibold text-red-200">{errors.stats}</span>
        </div>
      ) : loading.stats ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-card/50 border border-border/80 text-card-foreground rounded-xl p-6 animate-pulse backdrop-blur-md">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-lg bg-muted" />
                <div className="w-12 h-6 bg-muted rounded-full" />
              </div>
              <div className="w-24 h-8 bg-muted rounded mb-2" />
              <div className="w-16 h-4 bg-muted rounded" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {dashboardCards.map((card) => {
            const IconComponent = card.icon;
            return (
              <div
                key={card.label}
                className="bg-card border border-border text-card-foreground rounded-xl p-6 hover:shadow-lg hover:border-border/100 transition-all duration-300 backdrop-blur-md"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-2 rounded-lg bg-muted ${card.color}`}>
                    <IconComponent className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-semibold text-green-400 bg-green-400/10 px-2.5 py-1 rounded-full">
                    {card.change}
                  </span>
                </div>
                <div className="text-3xl font-extrabold text-card-foreground mb-1 font-mono tracking-tight">{card.value}</div>
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{card.label}</div>
              </div>
            );
          })}
        </div>
      )}

      <div className="bg-card border border-border rounded-xl p-6 mb-8 backdrop-blur-md">
        <div className="flex justify-between items-center mb-6">
          <div className="text-xl font-bold text-card-foreground">
            {t("creatorDashboard.recentActivity") || "Recent Activity"}
          </div>
          <Link 
            href={localizedRoute("/creator-dashboard/sales")} 
            className="text-sm font-semibold text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
          >
            {t("creatorDashboard.viewAll") || "View All"}
          </Link>
        </div>
        
        {errors.activities ? (
          <div className="flex flex-col items-center justify-center p-6 text-center bg-red-500/10 border border-red-500/20 rounded-xl">
            <AlertCircle className="w-8 h-8 text-red-400 mb-2" />
            <span className="text-sm font-semibold text-red-200">{errors.activities}</span>
          </div>
        ) : loading.activities ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between p-4 rounded-lg bg-muted/40 animate-pulse">
                <div className="flex items-center space-x-3 w-2/3">
                  <div className="w-3.5 h-3.5 rounded-full bg-muted" />
                  <div className="space-y-2 w-full">
                    <div className="w-1/2 h-5 bg-muted rounded" />
                    <div className="w-1/4 h-4 bg-muted rounded" />
                  </div>
                </div>
                <div className="w-16 h-6 bg-muted rounded" />
              </div>
            ))}
          </div>
        ) : viewModel.recentActivities.length === 0 ? (
          <div className="text-center py-12 bg-muted/10 border border-dashed border-border rounded-xl">
            <Package className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground font-semibold">No recent activities found.</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Start minting NFTs or listing them for sale to populate this feed.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {viewModel.recentActivities.map((activity, index) => (
              <div
                key={activity.id}
                className={`flex items-center justify-between p-4 rounded-xl border border-border/40 transition-all duration-300 hover:bg-muted/10 ${
                  index % 2 === 0 ? "bg-card/60" : "bg-background/40"
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-3.5 h-3.5 rounded-full border border-background/20 ${
                    activity.type === "sale" ? "bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.4)]" :
                    activity.type === "purchase" ? "bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.4)]" :
                    activity.type === "collection" ? "bg-purple-400 shadow-[0_0_8px_rgba(192,132,252,0.4)]" :
                    "bg-pink-400 shadow-[0_0_8px_rgba(244,114,182,0.4)]"
                  }`} />
                  <div>
                    <div className="text-card-foreground font-semibold text-sm md:text-base">{activity.action}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{formatRelativeTime(activity.time)}</div>
                  </div>
                </div>
                <div className="text-card-foreground font-bold font-mono text-sm md:text-base bg-muted/30 px-3 py-1 rounded-lg border border-border/20">{activity.amount}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-xl p-6 backdrop-blur-md flex flex-col justify-between hover:border-border/80 transition-all duration-300">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-card-foreground">
                {t("creatorDashboard.mintNewNFT") || "Mint New NFT"}
              </h3>
              <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center border border-primary/20">
                <Plus className="h-5 w-5 text-primary" />
              </div>
            </div>
            <p className="text-muted-foreground text-sm mb-6">
              {t("creatorDashboard.singleOrBatch") || "Upload dynamic illustrative artworks and mint immediately to collection."}
            </p>
          </div>
          <Link
            href={localizedRoute("/creator-dashboard/mint-nft")}
            className="inline-flex items-center justify-center px-4 py-2.5 bg-primary text-primary-foreground rounded-lg font-bold hover:bg-primary/90 transition-colors mt-auto w-fit"
          >
            {t("creatorDashboard.goToMint") || "Go to Mint"}
          </Link>
        </div>

        <div className="bg-card border border-border rounded-xl p-6 backdrop-blur-md flex flex-col justify-between hover:border-border/80 transition-all duration-300">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-card-foreground">
                {t("creatorDashboard.createCollection") || "Create Collection"}
              </h3>
              <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center border border-primary/20">
                <Users className="h-5 w-5 text-primary" />
              </div>
            </div>
            <p className="text-muted-foreground text-sm mb-6">
              {t("creatorDashboard.collectionDescription") || "Configure smart contract properties and deployment options for collections."}
            </p>
          </div>
          <Link
            href={localizedRoute("/creator-dashboard/create-your-collection")}
            className="inline-flex items-center justify-center px-4 py-2.5 bg-primary text-primary-foreground rounded-lg font-bold hover:bg-primary/90 transition-colors mt-auto w-fit"
            onClick={handleCreateCollectionClick}
          >
            {t("createCollection.createCollection") || "Create Collection"}
          </Link>
        </div>
      </div>
    </div>
  );
}