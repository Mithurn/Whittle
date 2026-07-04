import { describe, expect, it, vi, afterEach } from "vitest";
import { structureWithFallback, getTargetTechniqueCount } from "./llm-service";
import type { GeneratePlanRequest } from "@/lib/schemas";

function makeValidCurriculum(count = 5) {
  return {
    summary: "A great plan tailored to your goal.",
    techniques: Array.from({ length: count }, (_, i) => ({
      name: `Technique ${i + 1}`,
      description: "What this technique is.",
      rationale: "Why it's in this plan.",
    })),
  };
}

function makeValidResources(count = 5) {
  return {
    techniques: Array.from({ length: count }, (_, i) => ({
      name: `Technique ${i + 1}`,
      resources: [
        { type: "video", title: `Video ${i + 1}`, url: "https://placeholder.com", whyChosen: "Fits." },
        { type: "reading", title: `Reading ${i + 1}`, url: "https://placeholder.com", whyChosen: "Fits." },
        { type: "audio", title: `Audio ${i + 1}`, url: "https://placeholder.com", whyChosen: "Fits." },
      ],
    })),
  };
}

function jsonResponse(body: unknown, ok = true): Response {
  return { ok, json: async () => body } as Response;
}

interface CapturedCall {
  schemaName: string;
  body: {
    messages: { role: string; content: string }[];
    response_format: { json_schema: { name: string; schema: Record<string, unknown> } };
  };
}

// structureWithFallback now calls Groq twice per plan — once to invent the
// curriculum ("hobby_curriculum"), once to invent resources for it
// ("hobby_resources") — see llm-service.ts's two-stage pipeline. A single
// shared mock response for both calls made every assertion here silently
// check whichever call happened to run last instead of the one it meant to
// test. This dispatches by schema name so each stage can be asserted on (or
// made to fail) independently.
function mockGroqTwoStage(opts: {
  curriculum?: unknown | ((attempt: number) => unknown);
  resources?: unknown | ((attempt: number) => unknown);
}): CapturedCall[] {
  const calls: CapturedCall[] = [];
  let curriculumAttempt = 0;
  let resourcesAttempt = 0;
  global.fetch = vi.fn(async (_url, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body)) as CapturedCall["body"];
    const schemaName = body.response_format.json_schema.name;
    calls.push({ schemaName, body });

    if (schemaName === "hobby_curriculum") {
      curriculumAttempt++;
      const content =
        typeof opts.curriculum === "function"
          ? (opts.curriculum as (attempt: number) => unknown)(curriculumAttempt)
          : (opts.curriculum ?? makeValidCurriculum());
      return jsonResponse({ choices: [{ message: { content: JSON.stringify(content) } }], usage: {} });
    }

    resourcesAttempt++;
    const content =
      typeof opts.resources === "function"
        ? (opts.resources as (attempt: number) => unknown)(resourcesAttempt)
        : (opts.resources ?? makeValidResources());
    return jsonResponse({ choices: [{ message: { content: JSON.stringify(content) } }], usage: {} });
  }) as unknown as typeof fetch;
  return calls;
}

function findUserMessage(calls: CapturedCall[], schemaName: string): string {
  const call = calls.find((c) => c.schemaName === schemaName);
  return call?.body.messages.find((m) => m.role === "user")?.content ?? "";
}

const request: GeneratePlanRequest = {
  hobbyName: "Chess",
  level: "intermediate",
  goal: "Beat my dad",
  timeCommitment: "A few hours a week",
  knownTopics: ["castling", "en passant"],
};

describe("structureWithFallback", () => {
  const originalFetch = global.fetch;
  const originalKey = process.env.GROQ_API_KEY;

  afterEach(() => {
    global.fetch = originalFetch;
    process.env.GROQ_API_KEY = originalKey;
  });

  it("sends the user's hobby, level, goal, and known topics in the curriculum prompt", async () => {
    process.env.GROQ_API_KEY = "test-key";
    const calls = mockGroqTwoStage({});

    await structureWithFallback(request);

    const userMessage = findUserMessage(calls, "hobby_curriculum");
    expect(userMessage).toContain("Chess");
    expect(userMessage).toContain("intermediate");
    expect(userMessage).toContain("Beat my dad");
    expect(userMessage).toContain("castling");
  });

  it("tells the model to exclude beginner content for an intermediate user", async () => {
    process.env.GROQ_API_KEY = "test-key";
    const calls = mockGroqTwoStage({});

    await structureWithFallback({ ...request, level: "intermediate" });

    const userMessage = findUserMessage(calls, "hobby_curriculum");
    expect(userMessage).toMatch(/do NOT include any technique a first-time beginner would need/i);
  });

  it("tells the model to exclude beginner and intermediate content for an advanced user", async () => {
    process.env.GROQ_API_KEY = "test-key";
    const calls = mockGroqTwoStage({});

    await structureWithFallback({ ...request, level: "advanced" });

    const userMessage = findUserMessage(calls, "hobby_curriculum");
    expect(userMessage).toMatch(/do NOT include any beginner or general-intermediate technique/i);
  });

  it("tells the model to start from fundamentals for a beginner user", async () => {
    process.env.GROQ_API_KEY = "test-key";
    const calls = mockGroqTwoStage({});

    await structureWithFallback({ ...request, level: "beginner" });

    const userMessage = findUserMessage(calls, "hobby_curriculum");
    expect(userMessage).toMatch(/assume zero prior exposure/i);
  });

  it("retries the curriculum call once and recovers when the first attempt fails schema validation", async () => {
    process.env.GROQ_API_KEY = "test-key";
    const calls = mockGroqTwoStage({
      curriculum: (attempt: number) => (attempt === 1 ? { not: "valid" } : makeValidCurriculum()),
    });

    const result = await structureWithFallback(request);

    expect(calls.filter((c) => c.schemaName === "hobby_curriculum")).toHaveLength(2);
    expect(result.techniques).toHaveLength(5);
  });

  it("throws after two failed attempts", async () => {
    process.env.GROQ_API_KEY = "test-key";
    global.fetch = vi.fn(async () => jsonResponse({}, false)) as unknown as typeof fetch;

    await expect(structureWithFallback(request)).rejects.toThrow();
  });

  it("throws immediately when GROQ_API_KEY is not configured", async () => {
    delete process.env.GROQ_API_KEY;
    await expect(structureWithFallback(request)).rejects.toThrow();
  });

  it.each([
    ["15 mins a day", 5],
    ["30 mins a day", 6],
    ["A few hours a week", 7],
    ["Weekends only", 8],
    ["some future preset we haven't seen", 6],
  ] as const)(
    "tells the model to create exactly %s -> %d techniques, and constrains the JSON schema to match",
    async (timeCommitment, expectedCount) => {
      process.env.GROQ_API_KEY = "test-key";
      const calls = mockGroqTwoStage({
        curriculum: makeValidCurriculum(expectedCount),
        resources: makeValidResources(expectedCount),
      });

      await structureWithFallback({ ...request, timeCommitment });

      const curriculumCall = calls.find((c) => c.schemaName === "hobby_curriculum");
      const userMessage = findUserMessage(calls, "hobby_curriculum");
      expect(userMessage).toContain(`exactly ${expectedCount} techniques`);

      const schema = curriculumCall?.body.response_format.json_schema.schema as {
        properties: { techniques: { minItems: number; maxItems: number } };
      };
      expect(schema.properties.techniques.minItems).toBe(expectedCount);
      expect(schema.properties.techniques.maxItems).toBe(expectedCount);
    }
  );
});

describe("getTargetTechniqueCount", () => {
  it("maps each known time commitment to its exact count", () => {
    expect(getTargetTechniqueCount("15 mins a day")).toBe(5);
    expect(getTargetTechniqueCount("30 mins a day")).toBe(6);
    expect(getTargetTechniqueCount("A few hours a week")).toBe(7);
    expect(getTargetTechniqueCount("Weekends only")).toBe(8);
  });

  it("falls back to a sane default for an unrecognized commitment string", () => {
    expect(getTargetTechniqueCount("something new")).toBe(6);
  });
});
