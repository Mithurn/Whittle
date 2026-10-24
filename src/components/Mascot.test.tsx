import { render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Mascot } from "./Mascot";

// lottie-react needs a real <canvas> context, which jsdom doesn't provide.
vi.mock("lottie-react", () => ({
  default: ({ loop, autoplay }: { loop?: boolean; autoplay?: boolean }) => (
    <div data-testid="lottie" data-loop={String(loop)} data-autoplay={String(autoplay)} />
  ),
}));

function mockFetchJson(data: object) {
  const fetchMock = vi.fn().mockResolvedValue({ json: () => Promise.resolve(data) });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("Mascot", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("reserves a placeholder of the requested size before the animation loads", () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})));
    const { container, queryByTestId } = render(<Mascot size={120} className="mascot" />);
    const placeholder = container.firstElementChild as HTMLElement;
    expect(placeholder).toHaveStyle({ width: "120px", height: "120px" });
    expect(placeholder).toHaveClass("mascot");
    expect(queryByTestId("lottie")).not.toBeInTheDocument();
  });

  it("fetches the idle animation by default and renders it looping", async () => {
    const fetchMock = mockFetchJson({ v: "5" });
    const { findByTestId } = render(<Mascot />);
    const lottie = await findByTestId("lottie");
    expect(fetchMock).toHaveBeenCalledWith("/mascot/idle.json");
    expect(lottie).toHaveAttribute("data-loop", "true");
    expect(lottie).toHaveAttribute("data-autoplay", "true");
  });

  it("fetches the animation file matching the state and passes loop=false through", async () => {
    const fetchMock = mockFetchJson({ v: "5" });
    const { findByTestId } = render(<Mascot state="success" loop={false} />);
    const lottie = await findByTestId("lottie");
    expect(fetchMock).toHaveBeenCalledWith("/mascot/success.json");
    expect(lottie).toHaveAttribute("data-loop", "false");
  });

  it("refetches when the state changes", async () => {
    const fetchMock = mockFetchJson({ v: "5" });
    const { rerender } = render(<Mascot state="idle" />);
    rerender(<Mascot state="error" />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/mascot/error.json"));
  });

  it("silently keeps the placeholder when the fetch fails", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("network down"));
    vi.stubGlobal("fetch", fetchMock);
    const { container, queryByTestId } = render(<Mascot size={50} />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(queryByTestId("lottie")).not.toBeInTheDocument();
    expect(container.firstElementChild).toHaveStyle({ width: "50px", height: "50px" });
  });

  it("ignores a response that arrives after unmount", async () => {
    let resolveJson: (v: object) => void = () => {};
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ json: () => new Promise((r) => (resolveJson = r)) })
    );
    const { unmount, queryByTestId } = render(<Mascot />);
    unmount();
    resolveJson({ v: "5" });
    await Promise.resolve();
    expect(queryByTestId("lottie")).not.toBeInTheDocument();
  });
});
