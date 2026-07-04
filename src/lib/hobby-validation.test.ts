import { describe, expect, it } from "vitest";
import { isPlausibleHobbyName } from "./hobby-validation";

describe("isPlausibleHobbyName", () => {
  it.each([
    "Chess",
    "guitar",
    "watercolour",
    "3D printing",
    "8-ball pool",
    "tai chi",
    "diseño", // Spanish
    "pétanque", // French
    "Kalaripayattu",
    "ASMR",
    "CRPGs",
    "O'Neill boxing",
  ])("accepts a real, international, or acronym-style hobby name: %s", (value) => {
    expect(isPlausibleHobbyName(value)).toBe(true);
  });

  it.each([
    "asdkjqwe123!!!", // punctuation-laden keyboard mash
    "aaaaaa", // held-down key
    "111111", // held-down digit key
    "a", // too short
    "x".repeat(60), // too long
    "!!!",
    "@#$%",
    "",
    "   ",
  ])("rejects gibberish or out-of-range input: %s", (value) => {
    expect(isPlausibleHobbyName(value)).toBe(false);
  });
});
