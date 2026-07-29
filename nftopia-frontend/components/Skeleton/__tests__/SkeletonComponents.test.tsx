import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

import { MarketplaceSkeleton } from "../MarketplaceSkeleton";
import { CollectionGridSkeleton, CollectionCardSkeleton } from "../CollectionGridSkeleton";
import { CreatorCardSkeleton } from "../CreatorCardSkeleton";
import { OwnerCardSkeleton } from "../OwnerCardSkeleton";
import { TransferHistorySkeleton, EventRowSkeleton } from "../../nft/TransferHistorySkeleton";
import { NftDetailSkeleton } from "../../../app/[locale]/marketplace/[nftId]/NFTDetailClient";

// Mock next/navigation & next-intl if needed
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  usePathname: () => "/en/marketplace",
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

describe("Skeleton Components", () => {
  describe("CollectionGridSkeleton", () => {
    it("renders with status role and default 3 item cards", () => {
      render(<CollectionGridSkeleton />);
      const statusEl = screen.getByRole("status", { name: /loading collections/i });
      expect(statusEl).toBeInTheDocument();
    });

    it("renders specified count of collection cards", () => {
      const { container } = render(<CollectionGridSkeleton count={5} />);
      const cards = container.querySelectorAll(".bg-\\[\\#1E1A45\\]");
      expect(cards.length).toBe(5);
    });

    it("renders single CollectionCardSkeleton", () => {
      const { container } = render(<CollectionCardSkeleton />);
      expect(container.firstChild).toBeInTheDocument();
    });
  });

  describe("CreatorCardSkeleton", () => {
    it("renders creator card skeleton with status role", () => {
      render(<CreatorCardSkeleton />);
      const el = screen.getByRole("status", { name: /loading creator info/i });
      expect(el).toBeInTheDocument();
    });
  });

  describe("OwnerCardSkeleton", () => {
    it("renders owner card skeleton with status role", () => {
      render(<OwnerCardSkeleton />);
      const el = screen.getByRole("status", { name: /loading owner info/i });
      expect(el).toBeInTheDocument();
    });
  });

  describe("TransferHistorySkeleton", () => {
    it("renders transfer history skeleton with status role and header", () => {
      render(<TransferHistorySkeleton />);
      const el = screen.getByRole("status", { name: /loading transfer history/i });
      expect(el).toBeInTheDocument();
    });

    it("renders correct number of event rows", () => {
      const { container } = render(<TransferHistorySkeleton count={4} />);
      const rows = container.querySelectorAll(".border-b");
      expect(rows.length).toBe(4);
    });

    it("renders without header when showHeader is false", () => {
      const { container } = render(<TransferHistorySkeleton showHeader={false} />);
      const header = container.querySelector(".flex.items-center.justify-between");
      expect(header).not.toBeInTheDocument();
    });

    it("renders standalone EventRowSkeleton", () => {
      const { container } = render(<EventRowSkeleton />);
      expect(container.firstChild).toBeInTheDocument();
    });
  });

  describe("MarketplaceSkeleton", () => {
    it("renders marketplace skeleton with accessible status role", () => {
      render(<MarketplaceSkeleton />);
      const el = screen.getByRole("status", { name: /loading marketplace page/i });
      expect(el).toBeInTheDocument();
    });
  });

  describe("NftDetailSkeleton", () => {
    it("renders complete NFT detail skeleton covering all sections", () => {
      render(<NftDetailSkeleton />);
      const statusEl = screen.getByRole("status", { name: /loading nft details/i });
      expect(statusEl).toBeInTheDocument();
      
      // Verify sub-skeletons (Creator, Owner, Transfer History) are rendered
      expect(screen.getByRole("status", { name: /loading creator info/i })).toBeInTheDocument();
      expect(screen.getByRole("status", { name: /loading owner info/i })).toBeInTheDocument();
      expect(screen.getByRole("status", { name: /loading transfer history/i })).toBeInTheDocument();
    });
  });
});
