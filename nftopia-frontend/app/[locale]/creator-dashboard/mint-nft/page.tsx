"use client";

import { useState, FormEvent, useEffect } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud, AlertTriangle } from "lucide-react";
import { FileDropZone } from "@/lib";
import { FileWithMeta } from "@/lib/interfaces";
import { uploadToFirebase } from "@/lib/firebase/uploadtofirebase";
import { getCookie } from "@/lib/CSRFTOKEN";
import { Collection } from "@/lib/interfaces";
import { API_CONFIG } from "@/lib/config";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useTranslation } from "@/hooks/useTranslation";
import { getValidationFieldMessage } from "@/utils/fetchUtils";

interface ValidationErrors {
  title?: string;
  description?: string;
  price?: string;
  collection?: string;
  files?: string;
}

export default function MintNFTPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("STK");
  const [files, setFiles] = useState<FileWithMeta[]>([]);
  const [loading, setLoading] = useState(false);
  const [globalError, setGlobalError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<ValidationErrors>({});
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedCollectionId, setSelectedCollectionId] = useState("");

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/auth/login");
    }
  }, [isAuthenticated, router]);

  // Fetch user's collections when user is available
  useEffect(() => {
    if (user?.sub) {
      fetch(`${API_CONFIG.baseUrl}/collections/user/${user.sub}`)
        .then((res) => {
          if (!res.ok) throw new Error("Could not acquire parent scopes.");
          return res.json();
        })
        .then((data) => {
          if (data?.data?.collections?.length > 0) {
            setCollections(data.data.collections);
            setSelectedCollectionId(data.data.collections[0]?.id);
          } else if (data?.data?.data?.collections?.length > 0) {
            setCollections(data.data.data.collections);
            setSelectedCollectionId(data.data.data.collections[0]?.id);
          }
        })
        .catch((err) => console.error("Error fetching collections:", err));
    }
  }, [user?.sub]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFieldErrors({});
    setGlobalError("");

    if (!user?.sub) {
      setGlobalError(t("mintNFT.errors.userNotAuthenticated"));
      return;
    }
    if (files.length === 0) {
      setFieldErrors((prev) => ({
        ...prev,
        files: t("mintNFT.errors.uploadImage"),
      }));
      return;
    }
    if (!selectedCollectionId) {
      setFieldErrors((prev) => ({
        ...prev,
        collection: t("mintNFT.errors.selectCollection"),
      }));
      return;
    }

    setLoading(true);

    try {
      const csrfToken = await getCookie();
      const firebaseUrl = await uploadToFirebase(files[0].file);

      const mintData = {
        imageUrl: firebaseUrl,
        price,
        currency,
        title,
        description,
        metadata: {
          name: title,
          description,
          image: firebaseUrl,
          attributes: [],
        },
      };

      const res = await fetch(
        `${API_CONFIG.baseUrl}/nfts/mint/${user.sub}/${selectedCollectionId}`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-Token": csrfToken,
          },
          body: JSON.stringify(mintData),
        },
      );

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));

        // Extract validation diagnostics from structured error response
        const titleErr = getValidationFieldMessage(errorData, "title");
        const descErr = getValidationFieldMessage(errorData, "description");
        const priceErr = getValidationFieldMessage(errorData, "price");

        if (titleErr || descErr || priceErr) {
          setFieldErrors({
            title: titleErr,
            description: descErr,
            price: priceErr,
          });
        }
        throw new Error(errorData.message || t("mintNFT.errors.mintingFailed"));
      }

      router.push("/creator-dashboard/my-nfts");
    } catch (err: any) {
      console.error("Mint error context:", err);
      setGlobalError(err.message || t("mintNFT.errors.errorMinting"));
    }
    compression: {
      setLoading(false);
    }
  };

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-6">
      <form
        onSubmit={handleSubmit}
        className="bg-nftopia-card p-8 rounded-2xl shadow-lg w-full max-w-md border border-nftopia-border space-y-4"
      >
        <h1 className="text-3xl font-bold text-center text-nftopia-text">
          {t("mintNFT.title")}
        </h1>

        {globalError && (
          <div className="p-3 bg-red-900/40 text-red-300 rounded-lg text-xs flex items-start gap-2 border border-red-500/20">
            <AlertTriangle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
            <span>{globalError}</span>
          </div>
        )}

        {collections.length > 0 ? (
          <div>
            <label className="block text-sm text-nftopia-subtext mb-1">
              {t("mintNFT.collection")}
            </label>
            <select
              value={selectedCollectionId}
              onChange={(e) => setSelectedCollectionId(e.target.value)}
              className="w-full px-4 py-2 rounded bg-nftopia-background text-nftopia-text border border-nftopia-border focus:outline-none focus:ring-1 focus:ring-nftopia-primary text-sm"
              required
            >
              {collections.map((collection) => (
                <option key={collection.id} value={collection.id}>
                  {collection.name}
                </option>
              ))}
            </select>
            {fieldErrors.collection && (
              <p className="text-xs text-red-400 mt-1 font-medium">
                {fieldErrors.collection}
              </p>
            )}
          </div>
        ) : (
          <div className="p-3 bg-amber-950/40 text-amber-300 border border-amber-500/20 rounded-lg text-xs">
            No smart asset collections found. Please construct a parent
            collection pipeline before minting digital properties.
          </div>
        )}

        <div>
          <label className="block text-sm text-nftopia-subtext mb-1">
            {t("mintNFT.title")} *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={`w-full px-4 py-2 rounded bg-nftopia-background text-nftopia-text border text-sm focus:outline-none focus:ring-1 ${
              fieldErrors.title
                ? "border-red-500 focus:ring-red-500"
                : "border-nftopia-border focus:ring-nftopia-primary"
            }`}
            required
          />
          {fieldErrors.title && (
            <p className="text-xs text-red-400 mt-1 font-medium">
              {fieldErrors.title}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm text-nftopia-subtext mb-1">
            {t("mintNFT.description")} *
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={`w-full px-4 py-2 rounded bg-nftopia-background text-nftopia-text border text-sm focus:outline-none focus:ring-1 ${
              fieldErrors.description
                ? "border-red-500 focus:ring-red-500"
                : "border-nftopia-border focus:ring-nftopia-primary"
            }`}
            required
            rows={3}
          />
          {fieldErrors.description && (
            <p className="text-xs text-red-400 mt-1 font-medium">
              {fieldErrors.description}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-nftopia-subtext mb-1">
              {t("mintNFT.price")} *
            </label>
            <input
              type="number"
              step="0.00001"
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className={`w-full px-4 py-2 rounded bg-nftopia-background text-nftopia-text border text-sm focus:outline-none focus:ring-1 ${
                fieldErrors.price
                  ? "border-red-500 focus:ring-red-500"
                  : "border-nftopia-border focus:ring-nftopia-primary"
              }`}
              required
            />
            {fieldErrors.price && (
              <p className="text-xs text-red-400 mt-1 font-medium">
                {fieldErrors.price}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm text-nftopia-subtext mb-1">
              {t("mintNFT.currency")}
            </label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full px-4 py-2 rounded bg-nftopia-background text-nftopia-text border border-nftopia-border text-sm focus:outline-none focus:ring-1 focus:ring-nftopia-primary"
            >
              <option value="STK">STK</option>
              <option value="XLM">XLM</option>
              <option value="USDC">USDC</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm text-nftopia-subtext mb-2">
            {t("mintNFT.nftImage")} *
          </label>
          <FileDropZone
            onFilesSelected={setFiles}
            accept={["image/*"]}
            maxSizeMB={10}
            className="border border-nftopia-border rounded-lg bg-nftopia-background hover:border-nftopia-primary transition-colors"
            dropZoneText={t("mintNFT.dragDropText")}
            dropZoneTextClass="text-nftopia-subtext"
          />
          {fieldErrors.files && (
            <p className="text-xs text-red-400 mt-1 font-medium">
              {fieldErrors.files}
            </p>
          )}
          {files.length > 0 && (
            <p className="mt-2 text-xs text-nftopia-primary truncate">
              Ready: {files[0].file.name} (
              {(files[0].file.size / 1024 / 1024).toFixed(2)} MB)
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={
            loading ||
            !isAuthenticated ||
            files.length === 0 ||
            collections.length === 0
          }
          className="w-full flex items-center justify-center gap-2 bg-nftopia-primary text-nftopia-text py-2.5 px-4 rounded-lg hover:bg-nftopia-hover transition font-medium disabled:opacity-40 text-sm"
        >
          <UploadCloud size={16} className={loading ? "animate-pulse" : ""} />
          {loading ? "Minting Asset Properties..." : t("mintNFT.mintNFT")}
        </button>
      </form>
    </div>
  );
}
