import "@testing-library/jest-dom/vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { WatchDemo } from "./WatchDemo";

describe("WatchDemo", () => {
  it("shows only the trigger at first, with no video element mounted", () => {
    render(<WatchDemo />);
    expect(screen.getByRole("button", { name: /watch how it works/i })).toBeInTheDocument();
    expect(document.querySelector("video")).toBeNull();
  });

  it("opens a titled dialog with an AV1 source first and an H.264 fallback", async () => {
    const user = userEvent.setup();
    render(<WatchDemo />);
    await user.click(screen.getByRole("button", { name: /watch how it works/i }));

    expect(await screen.findByRole("dialog", { name: /whittle in 33 seconds/i })).toBeInTheDocument();
    const video = document.querySelector("video") as HTMLVideoElement;
    expect(video).not.toBeNull();
    expect(video).toHaveAttribute("controls");
    expect(video).toHaveAttribute("poster", "/media/whittle-ad-poster.webp");
    const sources = [...video.querySelectorAll("source")];
    expect(sources.map((s) => s.getAttribute("src"))).toEqual(["/media/whittle-ad-av1.mp4", "/media/whittle-ad-h264.mp4"]);
    expect(sources[0].getAttribute("type")).toContain("av01");
  });

  it("removes the video again when the dialog is closed", async () => {
    const user = userEvent.setup();
    render(<WatchDemo />);
    await user.click(screen.getByRole("button", { name: /watch how it works/i }));
    await screen.findByRole("dialog");

    await user.click(screen.getByRole("button", { name: /close video/i }));
    await waitFor(() => expect(document.querySelector("video")).toBeNull());
  });

  it("closes on Escape", async () => {
    const user = userEvent.setup();
    render(<WatchDemo />);
    await user.click(screen.getByRole("button", { name: /watch how it works/i }));
    await screen.findByRole("dialog");
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });
});
