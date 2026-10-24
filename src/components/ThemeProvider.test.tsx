import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "./ThemeProvider";

const providerProps = vi.fn();

vi.mock("next-themes", () => ({
  ThemeProvider: (props: Record<string, unknown> & { children: React.ReactNode }) => {
    providerProps(props);
    return <>{props.children}</>;
  },
}));

describe("ThemeProvider", () => {
  it("defaults to the light theme using the class attribute and renders children", () => {
    render(
      <ThemeProvider>
        <span>child</span>
      </ThemeProvider>
    );
    expect(screen.getByText("child")).toBeInTheDocument();
    expect(providerProps).toHaveBeenCalledWith(
      expect.objectContaining({ attribute: "class", defaultTheme: "light" })
    );
  });

  it("lets callers override the defaults", () => {
    render(
      <ThemeProvider defaultTheme="dark">
        <span>child</span>
      </ThemeProvider>
    );
    expect(providerProps).toHaveBeenLastCalledWith(expect.objectContaining({ defaultTheme: "dark" }));
  });
});
