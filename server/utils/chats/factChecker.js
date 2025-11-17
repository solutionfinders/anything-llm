const { getLLMProvider } = require("../helpers");

const FACT_CHECK_DEFAULT_PROMPT = `You are a meticulous fact-checking assistant. Review the user's question, the assistant's answer, and the provided reference context. Determine whether the answer is fully supported by the context.

Respond ONLY in JSON with the following shape:
{
  "verdict": "pass" | "fail" | "indeterminate",
  "summary": "brief explanation of support or the first issue found",
  "revised_answer": "corrected answer using only the provided context or an empty string if no changes are needed"
}

Rules:
- If any part of the answer is not supported by the reference context, set verdict to "fail" and provide a grounded revised_answer.
- If the context is insufficient to verify the answer, use verdict "indeterminate" and explain what is missing.
- Never include information that is not present in the reference context.`;

function factCheckerEnabled() {
  return (process.env.FACT_CHECKER_ENABLED || "false").toLowerCase() === "true";
}

function compactContext(contextTexts = []) {
  const combined = contextTexts
    .filter(Boolean)
    .map((text, idx) => `Source ${idx + 1}: ${text}`)
    .join("\n\n");
  return combined.slice(0, 6_000);
}

function normalizeJson(text = "") {
  if (!text) return null;
  const trimmed = text.trim();
  const fenceMatch = trimmed.match(/\{[\s\S]*\}/);
  if (!fenceMatch) return null;

  try {
    return JSON.parse(fenceMatch[0]);
  } catch (e) {
    return null;
  }
}

function normalizeVerdict(verdict = "") {
  const lowered = String(verdict).toLowerCase();
  if (["pass", "fail", "indeterminate"].includes(lowered)) return lowered;
  return "indeterminate";
}

function formatFactCheckResult(rawResponse = "", fallbackSummary = "") {
  const parsed = normalizeJson(rawResponse) || {};
  const verdict = normalizeVerdict(parsed?.verdict);
  return {
    verdict,
    summary:
      parsed?.summary ||
      fallbackSummary ||
      "Fact checker could not verify this answer, please review manually.",
    revisedAnswer: parsed?.revised_answer || parsed?.revisedAnswer || "",
    raw: rawResponse?.trim?.() || "",
  };
}

async function runFactCheck({
  workspace,
  question,
  answer,
  contextTexts = [],
}) {
  if (!factCheckerEnabled()) return null;

  const factCheckLLM = getLLMProvider({
    provider: process.env.FACT_CHECK_PROVIDER || workspace?.chatProvider,
    model: process.env.FACT_CHECK_MODEL || workspace?.chatModel,
  });

  const prompt = process.env.FACT_CHECK_PROMPT || FACT_CHECK_DEFAULT_PROMPT;
  const references = compactContext(contextTexts);
  const messages = [
    { role: "system", content: prompt },
    {
      role: "user",
      content: `User question:\n${question}\n\nAssistant answer:\n${answer}\n\nReference context:\n${references}`,
    },
  ];

  try {
    const { textResponse } = await factCheckLLM.getChatCompletion(messages, {
      temperature: 0,
    });

    return formatFactCheckResult(
      textResponse,
      "Fact checker could not return a structured result."
    );
  } catch (error) {
    console.error("[FactChecker] Failed to run fact check", error);
    return {
      verdict: "indeterminate",
      summary: "Fact checker unavailable. Showing the original answer.",
      revisedAnswer: "",
      raw: "",
    };
  }
}

module.exports = {
  factCheckerEnabled,
  runFactCheck,
};
