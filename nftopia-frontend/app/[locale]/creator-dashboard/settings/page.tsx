"use client";

import { useAuthContext } from "@/lib/context/AuthContext";
import { useState } from "react";
import { connectFreighter } from "@/lib/stellar/wallet/freighter";

export default function SettingsPage() {
  // Use safe fallbacks to prevent errors if the outer authentication context is initialization-blocked
  const context = useAuthContext() || {};
  const { wallets = [], linkWallet, unlinkWallet, isLoading = false } = context;

  const [linking, setLinking] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleLinkFreighter = async () => {
    setError("");
    setSuccess("");
    setLinking(true);
    try {
      if (typeof linkWallet !== "function") {
        throw new Error(
          "Wallet link management service is currently unavailable.",
        );
      }
      const address = await connectFreighter();
      await linkWallet(address, "freighter");
      setSuccess("Wallet linked successfully!");
    } catch (e: any) {
      setError(e.message || "Failed to link wallet");
    } finally {
      setLinking(false);
    }
  };

  const handleUnlink = async (walletAddress: string) => {
    setError("");
    setSuccess("");
    try {
      if (typeof unlinkWallet !== "function") {
        throw new Error(
          "Wallet unlink management service is currently unavailable.",
        );
      }
      await unlinkWallet(walletAddress);
      setSuccess("Wallet unlinked successfully!");
    } catch (e: any) {
      setError(e.message || "Failed to unlink wallet");
    }
  };

  return (
    <div className="max-w-xl mx-auto py-10 px-4">
      <h1 className="text-3xl font-bold text-white mb-4">Settings</h1>
      <div className="mb-8 bg-neutral-900/40 p-6 rounded-xl border border-neutral-800">
        <h2 className="text-xl font-semibold mb-4 text-white">
          Linked Stellar Wallets
        </h2>

        {isLoading ? (
          <div className="text-sm text-neutral-400 animate-pulse">
            Loading connected profiles...
          </div>
        ) : wallets.length === 0 ? (
          <div className="text-sm text-neutral-500 mb-4">
            No cryptographic keys linked.
          </div>
        ) : (
          <ul className="mb-6 space-y-3">
            {wallets.map((w: any) => (
              <li
                key={w.walletAddress}
                className="flex items-center justify-between py-2 border-b border-neutral-800 text-sm"
              >
                <span className="text-neutral-300 font-mono text-xs truncate max-w-[70%]">
                  {w.walletAddress}{" "}
                  <span className="text-neutral-500 font-sans">
                    ({w.walletProvider})
                  </span>{" "}
                  {w.isPrimary && (
                    <span className="ml-2 text-[10px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded">
                      Primary
                    </span>
                  )}
                </span>
                <button
                  className="ml-4 px-2.5 py-1 text-xs bg-red-500/20 text-red-400 rounded border border-red-500/30 hover:bg-red-500/30 transition-colors"
                  onClick={() => handleUnlink(w.walletAddress)}
                  disabled={linking}
                >
                  Unlink
                </button>
              </li>
            ))}
          </ul>
        )}

        <button
          className="px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 font-medium"
          onClick={handleLinkFreighter}
          disabled={linking}
        >
          {linking ? "Linking..." : "Link Freighter Wallet"}
        </button>

        {error && (
          <div className="text-red-400 text-xs mt-3 bg-red-950/20 border border-red-500/20 p-2.5 rounded">
            {error}
          </div>
        )}
        {success && (
          <div className="text-green-400 text-xs mt-3 bg-green-950/20 border border-green-500/20 p-2.5 rounded">
            {success}
          </div>
        )}
      </div>
    </div>
  );
}
