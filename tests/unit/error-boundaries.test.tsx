import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import TradeUpError from "@/app/tradeup/error";
import NotFound from "@/app/not-found";
import { SectionErrorBoundary } from "@/components/ui/SectionErrorBoundary";

describe("TradeUpError boundary", () => {
  it("shows a stable message and retries", async () => {
    const user = userEvent.setup();
    const reset = vi.fn();
    render(
      <TradeUpError
        error={Object.assign(new Error("float math exploded"), { digest: "abc" })}
        reset={reset}
      />,
    );

    expect(
      screen.getByRole("heading", { name: /trade-up calculator error/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/something went wrong computing this trade-up/i),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /try again/i }));
    expect(reset).toHaveBeenCalledTimes(1);
  });
});

describe("NotFound", () => {
  it("explains a missing profile and links home", () => {
    render(<NotFound />);
    expect(
      screen.getByRole("heading", { name: /profile not found/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /back home/i })).toHaveAttribute(
      "href",
      "/",
    );
  });
});

function Boom(): ReactElement {
  throw new Error("share card png exploded");
}

describe("SectionErrorBoundary", () => {
  it("isolates a crash and retries the island", async () => {
    const user = userEvent.setup();
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    render(
      <SectionErrorBoundary name="Share card generator">
        <Boom />
      </SectionErrorBoundary>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent(/share card generator/i);
    await user.click(screen.getByRole("button", { name: /try again/i }));
    expect(screen.getByRole("alert")).toBeInTheDocument();
    spy.mockRestore();
  });
});
