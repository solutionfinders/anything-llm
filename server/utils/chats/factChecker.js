const { getLLMProvider } = require("../helpers");

const DEFAULT_FACT_CHECK_PROMPT = `You are a meticulous fact checker. Validate the draft answer against the provided evidence and user question. Revise the answer so every statement is grounded in the evidence. If the evidence is insufficient, reply that there is not enough information. Respond with only the final answer intended for the user without explanations or meta commentary.`;

class FactChecker {
  constructor({ workspace = null } = {}) {
    const envFactChecking = process.env.ENABLE_FACT_CHECKING;
    const defaultEnabled =
      envFactChecking === undefined
        ? true
        : envFactChecking.toLowerCase() === "true";

    this.enabled =
      defaultEnabled ||
      !!process.env.FACT_CHECK_LLM_PROVIDER ||
      !!process.env.FACT_CHECK_LLM_MODEL ||
      !!process.env.FACT_CHECK_PROMPT;

    this.provider =
      process.env.FACT_CHECK_LLM_PROVIDER ||
      workspace?.factCheckProvider ||
      workspace?.chatProvider ||
      process.env.LLM_PROVIDER;

    this.model =
      process.env.FACT_CHECK_LLM_MODEL ||
      workspace?.factCheckModel ||
      workspace?.chatModel ||
      null;

    this.prompt = process.env.FACT_CHECK_PROMPT || DEFAULT_FACT_CHECK_PROMPT;
  }

  static fromEnv(workspace = null) {
    return new FactChecker({ workspace });
  }

  static isInsufficientContextAnswer(text) {
    if (!text) return false;

    const normalized = text.toLowerCase();
    return (
      normalized.includes("not enough information") ||
      normalized.includes("not enough info") ||
      normalized.includes("not enough context") ||
      normalized.includes("insufficient information") ||
      normalized.includes("insufficient context")
    );
  }

  factCheckMessages({ question, answer, sources = [] }) {
    const formattedSources = sources
      .map((source, idx) => {
        const text = source?.text || "";
        const truncated = text.length > 1200 ? `${text.slice(0, 1200)}...` : text;
        return `[Source ${idx + 1}] ${truncated}`;
      })
      .join("\n\n");

    const evidence = formattedSources || "No source evidence was provided.";
    const prompt = `User question: ${question}\n\nDraft answer: ${answer}\n\nEvidence:\n${evidence}\n\nUpdate the answer so it is fully accurate and only uses the evidence above.`;

    return [
      { role: "system", content: this.prompt },
      { role: "user", content: prompt },
    ];
  }

  async review({ question, answer, sources = [] }) {
    if (!this.enabled) {
      return {
        applied: false,
        checkedAnswer: answer,
        insufficientContext: false,
      };
    }

    try {
      const llm = getLLMProvider({ provider: this.provider, model: this.model });
      const start = Date.now();
      const { textResponse } = await llm.getChatCompletion(
        this.factCheckMessages({ question, answer, sources }),
        { temperature: 0 }
      );

      const insufficientContext = FactChecker.isInsufficientContextAnswer(
        textResponse
      );

      return {
        applied: true,
        checkedAnswer: textResponse?.trim() || answer,
        insufficientContext,
        durationMs: Date.now() - start,
        provider: this.provider,
        model: this.model,
      };
    } catch (error) {
      console.error(`[FactChecker] ${error.message}`);
      return {
        applied: false,
        checkedAnswer: answer,
        insufficientContext: false,
        error: error.message,
        provider: this.provider,
        model: this.model,
      };
    }
  }
}

module.exports = { FactChecker };
