import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { InventoryDashboard } from "@/components/InventoryDashboard";
import type { InventoryItemView, ProfileView } from "@/types/inventory";

vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children?: unknown }) => (
    <div data-testid="chart">{children as never}</div>
  ),
  AreaChart: ({ children }: { children?: unknown }) => <div>{children as never}</div>,
  Area: () => null,
  Legend: () => null,
  Tooltip: () => null,
  XAxis: () => null,
  YAxis: () => null,
}));

vi.mock("@/hooks/useUsdToEurRate", () => ({
  useUsdToEurRate: () => 0.92,
}));

const profile: ProfileView = {
  id: "p1",
  steamId: "76561198000000000",
  personaName: "Alice",
  avatarUrl: null,
  profileUrl: "https://steamcommunity.com/profiles/76561198000000000",
  currency: "USD",
  faceitUrl: null,
  faceitLevel: null,
  faceitElo: null,
  faceitNickname: null,
  faceitFound: false,
  faceitFetchedAt: null,
  leetifyUrl: null,
  leetifyName: null,
  leetifyRating: null,
  leetifyFound: false,
  lastSyncedAt: "2026-01-15T12:00:00.000Z",
  lastError: null,
  syncing: false,
};

function item(
  overrides: Partial<InventoryItemView> & Pick<InventoryItemView, "id" | "name">,
): InventoryItemView {
  return {
    assetId: overrides.id,
    marketHashName: `${overrides.name} (Field-Tested)`,
    iconUrl: null,
    exterior: "Field-Tested",
    floatValue: 0.25,
    paintSeed: 1,
    paintIndex: 1,
    stickers: [],
    steamPrice: 10,
    buffPrice: 8,
    rarity: "Classified",
    type: "Rifle",
    tradable: true,
    marketable: true,
    ...overrides,
  };
}

const items: InventoryItemView[] = [
  item({ id: "ak", name: "AK-47 | Redline", buffPrice: 20, steamPrice: 22 }),
  item({
    id: "st",
    name: "StatTrak™ AWP | Asiimov",
    marketHashName: "StatTrak™ AWP | Asiimov (Field-Tested)",
    buffPrice: 50,
    steamPrice: 55,
    type: "Sniper Rifle",
  }),
];

describe("InventoryDashboard", () => {
  it("renders the persona, totals, and filters by name", async () => {
    const user = userEvent.setup();
    render(
      <InventoryDashboard
        profile={profile}
        items={items}
        snapshots={[]}
        totals={{ itemCount: 2, totalSteam: 77, totalBuff: 70 }}
        cooldownMs={0}
      />,
    );

    expect(screen.getByRole("heading", { name: "Alice" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/filter by name/i)).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText(/filter by name/i), "Redline");
    expect(screen.getByText(/AK-47 \| Redline/)).toBeInTheDocument();
    expect(screen.queryByText(/Asiimov/)).not.toBeInTheDocument();
  });

  it("surfaces a lastError that is not a soft float warning", () => {
    render(
      <InventoryDashboard
        profile={{
          ...profile,
          lastError: "This Steam inventory is private or hidden.",
        }}
        items={[]}
        snapshots={[]}
        totals={{ itemCount: 0, totalSteam: 0, totalBuff: 0 }}
        cooldownMs={0}
      />,
    );
    expect(
      screen.getByText(/this steam inventory is private or hidden/i),
    ).toBeInTheDocument();
  });
});
