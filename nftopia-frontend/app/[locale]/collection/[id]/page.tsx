import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getApolloClient } from "@/lib/graphql/client";
import { GET_COLLECTION_BY_ID_QUERY } from "@/lib/graphql/queries/collection.queries";
import { isValidCollectionId } from "@/utils/id-validation";
import { CollectionDetailClient } from "./CollectionDetailClient";

const SUPPORTED_LOCALES = ["en", "fr", "es", "de"] as const;
type Locale = (typeof SUPPORTED_LOCALES)[number];

const fallbacks: Record<Locale, { notFoundTitle: string; notFoundDesc: string; description: string }> = {
  en: {
    notFoundTitle: "Collection Not Found | NFTopia Marketplace",
    notFoundDesc: "The requested collection could not be found or does not exist.",
    description: "View this collection on NFTopia",
  },
  fr: {
    notFoundTitle: "Collection introuvable | NFTopia Marketplace",
    notFoundDesc: "La collection demandée est introuvable ou n'existe pas.",
    description: "Voir cette collection sur NFTopia",
  },
  es: {
    notFoundTitle: "Colección no encontrada | NFTopia Marketplace",
    notFoundDesc: "La colección solicitada no se pudo encontrar o no existe.",
    description: "Ver esta colección en NFTopia",
  },
  de: {
    notFoundTitle: "Sammlung nicht gefunden | NFTopia Marketplace",
    notFoundDesc: "Die angeforderte Sammlung konnte nicht gefunden werden oder existiert nicht.",
    description: "Diese Sammlung auf NFTopia ansehen",
  },
};

function getLocale(locale: string): Locale {
  return SUPPORTED_LOCALES.includes(locale as Locale) ? (locale as Locale) : "en";
}

async function fetchCollection(collectionId: string) {
  const client = getApolloClient();
  try {
    const { data } = await client.query({
      query: GET_COLLECTION_BY_ID_QUERY,
      variables: { id: collectionId },
      fetchPolicy: "network-only",
    });
    return data?.collection;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: { id: string; locale: string };
}): Promise<Metadata> {
  const { id, locale } = params;
  const collection = await fetchCollection(id);
  const resolvedLocale = getLocale(locale);
  const tFallback = fallbacks[resolvedLocale];

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const pageUrl = `${baseUrl}/${resolvedLocale}/collection/${id}`;

  if (!collection) {
    return {
      title: tFallback.notFoundTitle,
      description: tFallback.notFoundDesc,
      robots: { index: false, follow: false },
      alternates: {
        canonical: pageUrl,
        languages: Object.fromEntries(
          SUPPORTED_LOCALES.map((loc) => [loc, `${baseUrl}/${loc}/collection/${id}`])
        ),
      },
      openGraph: {
        title: tFallback.notFoundTitle,
        description: tFallback.notFoundDesc,
        url: pageUrl,
        type: "website",
      },
      twitter: {
        card: "summary",
        title: tFallback.notFoundTitle,
        description: tFallback.notFoundDesc,
      },
    };
  }

  const title = `${collection.name} | NFTopia Marketplace`;
  const description = collection.description || tFallback.description;
  const ogImage = collection.image || `${baseUrl}/nftopia-03.png`;

  return {
    title,
    description,
    keywords: [`${collection.name}`, "NFT", "collection", "digital art", "NFTopia"],
    robots: { index: true, follow: true },
    alternates: {
      canonical: pageUrl,
      languages: Object.fromEntries(
        SUPPORTED_LOCALES.map((loc) => [loc, `${baseUrl}/${loc}/collection/${id}`])
      ),
    },
    openGraph: {
      title,
      description,
      url: pageUrl,
      type: "website",
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: collection.name,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}

export default async function CollectionDetailPage({
  params,
}: {
  params: { id: string; locale: string };
}) {
  const { id, locale } = params;

  if (!isValidCollectionId(id)) {
    notFound();
  }

  const collection = await fetchCollection(id);

  if (!collection) {
    notFound();
  }

  // Structured Data (JSON-LD Collection Schema)
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Collection",
    "name": collection.name,
    "description": collection.description || undefined,
    "image": collection.image || undefined,
    "url": `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/${locale}/collection/${id}`,
    ...(collection.creator
      ? {
          "creator": {
            "@type": "Person",
            "name": collection.creator.username || collection.creator.walletAddress,
            "url": collection.creator.username
              ? `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/${locale}/creator/${collection.creator.username}`
              : undefined,
          },
        }
      : {}),
    ...(collection.totalSupply != null
      ? { "size": collection.totalSupply }
      : {}),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <CollectionDetailClient collection={collection} locale={locale} />
    </>
  );
}
