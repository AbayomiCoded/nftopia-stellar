"use client";

import { useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Link2,
  Link2Off,
  Wallet,
} from "lucide-react";
import { connectFreighter } from "@/lib/stellar/wallet/freighter";
import { useAuthContext } from "@/lib/context/AuthContext";
import { LinkedWallet } from "@/lib/services/profile";

export default function SettingsPage() {
  // Tie context smoothly to the active context engine with safe fallbacks
  const context = useAuthContext() || {};
  const { wallets = [], linkWallet, unlinkWallet, isLoading = false } = context;

  // Feedback and loading orchestration states
  const [linking, setLinking] = useState(false);
  const [unlinkingAddress, setUnlinkingAddress] = useState<string | null>(null);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const handleLinkFreighter = async () => {
    setMessage(null);
    setLinking(true);

    try {
      if (typeof linkWallet !== "function") {
        throw new Error(
          "Wallet link management service is currently unavailable.",
        );
      }
      const walletAddress = await connectFreighter();
      await linkWallet(walletAddress, "freighter");
      setMessage({ type: "success", text: "Wallet linked successfully!" });
    } catch (error: any) {
      setMessage({
        type: "error",
        text: error?.message || "Failed to link wallet.",
      });
    } finally {
      setLinking(false);
    }
  };

  const handleUnlink = async (walletAddress: string) => {
    setMessage(null);
    setUnlinkingAddress(walletAddress);

    try {
      if (typeof unlinkWallet !== "function") {
        throw new Error(
          "Wallet unlink management service is currently unavailable.",
        );
      }
      await unlinkWallet(walletAddress);
      setMessage({ type: "success", text: "Wallet unlinked successfully!" });
    } catch (error: any) {
      setMessage({
        type: "error",
        text: error?.message || "Failed to unlink wallet.",
      });
    } finally {
      setUnlinkingAddress(null);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-6 py-10 min-h-screen bg-background">
      <h1 className="mb-6 text-3xl font-bold text-foreground">Settings</h1>

      {message && <StatusMessage type={message.type} text={message.text} />}

      <section className="mt-6 rounded-xl border border-border bg-card p-6">
        <div className="mb-5 flex items-center gap-2">
          <Wallet className="h-5 w-5 text-purple-400" />
          <h2 className="text-xl font-semibold text-card-foreground">
            Linked Stellar Wallets
          </h2>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground animate-pulse">
            Loading connected profiles...
          </p>
        ) : wallets.length === 0 ? (
          <p className="mb-4 text-sm text-muted-foreground">
            No cryptographic keys linked.
          </p>
        ) : (
          <ul className="mb-5 space-y-3">
            {wallets.map((wallet: LinkedWallet) => (
              <li
                key={wallet.walletAddress}
                className="flex items-center justify-between gap-4 rounded-lg border border-border bg-muted/40 p-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-mono text-sm text-foreground">
                      {shortAddress(wallet.walletAddress)}
                    </span>
                    {wallet.isPrimary && (
                      <span className="rounded-full bg-green-500/15 px-2 py-0.5 text-xs text-green-400">
                        Primary
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs capitalize text-muted-foreground">
                    {wallet.walletProvider}
                    {wallet.createdAt
                      ? ` · Linked ${new Date(wallet.createdAt).toLocaleDateString()}`
                      : " · Recently"}
                  </p>
                </div>

                <button
                  className="flex items-center gap-1.5 rounded-lg border border-red-500/30 px-3 py-1.5 text-sm text-red-400 transition-colors hover:bg-red-500/10 disabled:opacity-50"
                  onClick={() => handleUnlink(wallet.walletAddress)}
                  disabled={
                    linking || unlinkingAddress === wallet.walletAddress
                  }
                >
                  <Link2Off className="h-4 w-4" />
                  {unlinkingAddress === wallet.walletAddress
                    ? "Unlinking..."
                    : "Unlink"}
                </button>
              </li>
            ))}
          </ul>
        )}

        <button
          className="flex items-center gap-1.5 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-700 disabled:opacity-50"
          onClick={handleLinkFreighter}
          disabled={linking}
        >
          <Link2 className="h-4 w-4" />
          {linking ? "Linking..." : "Link Freighter Wallet"}
        </button>
      </section>
    </div>
  );
}

function StatusMessage({
  type,
  text,
}: {
  type: "success" | "error";
  text: string;
}) {
  const Icon = type === "success" ? CheckCircle2 : AlertCircle;
  const classes =
    type === "success"
      ? "border-green-500/30 bg-green-900/30 text-green-300"
      : "border-red-500/30 bg-red-900/30 text-red-300";

  return (
    <div
      className={`flex items-start gap-2 rounded-lg border p-3 text-sm ${classes}`}
    >
      <Icon className="mt-0.5 h-4 w-4 flex-shrink-0" />
      <span>{text}</span>
    </div>
  );
}

function shortAddress(value: string): string {
  return `${value.slice(0, 6)}...${value.slice(-6)}`;
}
