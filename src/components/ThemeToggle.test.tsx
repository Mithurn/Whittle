import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeToggle } from "./ThemeToggle";

const setTheme = vi.fn();
let resolvedTheme: string | undefined = "light";

vi.mock("next-themes", () => ({
  useTheme: () => ({ resolvedTheme, setTheme }),
}));

describe("ThemeToggle", () => {
  beforeEach(() => {
    setTheme.mockClear();
    resolvedTheme = "light";
  });

  it("offers to switch to dark mode when the light theme is active", async () => {
    render(<ThemeToggle />);
    await userEvent.click(await screen.findByRole("button", { name: "Switch to dark mode" }));
    expect(setTheme).toHaveBeenCalledWith("dark");
  });

  it("offers to switch to light mode when the dark theme is active", async () => {
    resolvedTheme = "dark";
    render(<ThemeToggle />);
    await userEvent.click(await screen.findByRole("button", { name: "Switch to light mode" }));
    expect(setTheme).toHaveBeenCalledWith("light");
  });

  it("treats an unresolved theme as light", async () => {
    resolvedTheme = undefined;
    render(<ThemeToggle />);
    expect(await screen.findByRole("button", { name: "Switch to dark mode" })).toBeInTheDocument();
  });
});
