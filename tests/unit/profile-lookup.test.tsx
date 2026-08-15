import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProfileLookup } from "@/components/ProfileLookup";
import { mockRouter } from "../setup";
import { STEAM_BACKOFF_STORAGE_KEY } from "@/lib/steam-backoff";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const apiProfile = {
  id: "prof-1",
  steamId: "76561198000000000",
  personaName: "Tester",
  avatarUrl: null,
  currency: "USD",
};

describe("ProfileLookup", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders the cinematic home heading when accentGlow is on", () => {
    render(<ProfileLookup accentGlow />);
    expect(
      screen.getByRole("heading", { name: /your one-stop for cs2 skins/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /load inventory/i }),
    ).toBeDisabled();
  });

  it("shows a 400 from profile create without syncing", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/api/fx")) {
          return jsonResponse({ usdToEur: 0.92 });
        }
        if (url.includes("/api/profiles")) {
          return jsonResponse(
            { error: "Could not resolve that Steam profile. Check the URL or SteamID64." },
            400,
          );
        }
        throw new Error(`unexpected fetch ${url}`);
      }),
    );

    render(<ProfileLookup />);
    await user.type(
      screen.getByPlaceholderText(/steamcommunity.com/i),
      "not-a-profile",
    );
    await user.click(screen.getByRole("button", { name: /load inventory/i }));

    expect(
      await screen.findByText(/could not resolve that steam profile/i),
    ).toBeInTheDocument();
    expect(mockRouter.push).not.toHaveBeenCalled();
  });

  it("marks Steam backoff and surfaces a 429", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/api/fx")) return jsonResponse({ usdToEur: 0.92 });
        if (url.includes("/api/profiles")) {
          return jsonResponse(
            { error: "Steam rate-limited this request. Try again shortly." },
            429,
          );
        }
        throw new Error(`unexpected fetch ${url}`);
      }),
    );

    render(<ProfileLookup />);
    await user.type(
      screen.getByPlaceholderText(/steamcommunity.com/i),
      "76561198000000000",
    );
    await user.click(screen.getByRole("button", { name: /load inventory/i }));

    expect(await screen.findByText(/rate-limited/i)).toBeInTheDocument();
    expect(window.localStorage.getItem(STEAM_BACKOFF_STORAGE_KEY)).toBeTruthy();
  });

  it("blocks submit while a Steam backoff is already active", async () => {
    const user = userEvent.setup();
    window.localStorage.setItem(
      STEAM_BACKOFF_STORAGE_KEY,
      String(Date.now() + 60_000),
    );
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/fx")) {
        return jsonResponse({ usdToEur: 0.92 });
      }
      throw new Error(`unexpected fetch ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<ProfileLookup />);
    await user.type(
      screen.getByPlaceholderText(/steamcommunity.com/i),
      "76561198000000000",
    );
    await user.click(screen.getByRole("button", { name: /load inventory/i }));

    expect(
      await screen.findByText(/wait/i),
    ).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalledWith(
      "/api/profiles",
      expect.anything(),
    );
  });

  it("creates a profile, syncs, and navigates to inventory", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url.includes("/api/fx")) return jsonResponse({ usdToEur: 0.92 });
        if (url.includes("/api/profiles") && init?.method === "POST") {
          return jsonResponse({ profile: apiProfile });
        }
        if (url.includes("/api/sync")) {
          return jsonResponse({ itemCount: 12 });
        }
        throw new Error(`unexpected fetch ${url}`);
      }),
    );

    render(<ProfileLookup />);
    await user.type(
      screen.getByPlaceholderText(/steamcommunity.com/i),
      "76561198000000000",
    );
    await user.click(screen.getByRole("button", { name: /load inventory/i }));

    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith("/inventory/prof-1");
    });
    expect(mockRouter.refresh).toHaveBeenCalled();
  });

  it("still opens inventory when sync fails after a successful create", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url.includes("/api/fx")) return jsonResponse({ usdToEur: 0.92 });
        if (url.includes("/api/profiles") && init?.method === "POST") {
          return jsonResponse({ profile: apiProfile });
        }
        if (url.includes("/api/sync")) {
          return jsonResponse(
            { error: "This Steam inventory is private or hidden." },
            403,
          );
        }
        throw new Error(`unexpected fetch ${url}`);
      }),
    );

    render(<ProfileLookup />);
    await user.type(
      screen.getByPlaceholderText(/steamcommunity.com/i),
      "76561198000000000",
    );
    await user.click(screen.getByRole("button", { name: /load inventory/i }));

    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith("/inventory/prof-1");
    });
  });
});
