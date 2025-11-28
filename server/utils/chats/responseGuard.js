const { getLLMProvider } = require("../helpers");
const { SystemSettings } = require("../../models/systemSettings");

const DEFAULT_GUARD_SETTINGS = {
  enabled: false,
  blockPhoneNumbers: true,
  blockContactNames: true,
  customRules: "",
  fallbackText: "This response cannot be provided.",
};

function parseDecision(raw) {
  if (!raw) return { allow: true, reason: null };
  try {
    const match = raw.match(/\{[\s\S]*\}/);
    const candidate = match ? match[0] : raw;
    const parsed = JSON.parse(candidate);
    return {
      allow: parsed.allow ?? parsed.approve ?? parsed.allowed ?? true,
      reason: parsed.reason || null,
    };
  } catch (e) {
    return { allow: true, reason: null };
  }
}

function buildGuardMessages(responseText, settings) {
  const rules = [];
  if (settings.blockPhoneNumbers) {
    rules.push(
      "Reject responses that contain phone numbers or explicit requests to call a number."
    );
  }
  if (settings.blockContactNames) {
    rules.push(
      "Reject any invented or speculative names for contacts, representatives, or points of contact."
    );
  }
  if (settings.customRules?.trim()) {
    rules.push(settings.customRules.trim());
  }

  const requirements = rules.length
    ? rules.map((rule, idx) => `${idx + 1}. ${rule}`).join("\n")
    : "No additional restrictions were provided. Approve by default.";

  return [
    {
      role: "system",
      content:
        "You are a strict compliance checker. Review the provided assistant message and return ONLY a JSON object with the shape {\"allow\": boolean, \"reason\": string}. If any requirement is violated, set allow to false.",
    },
    {
      role: "user",
      content: `Requirements to enforce:\n${requirements}\n\nAssistant message to audit:\n"""${responseText}"""`,
    },
  ];
}

async function applyResponseGuard({ responseText, workspace, settings }) {
  const guardSettings = {
    ...DEFAULT_GUARD_SETTINGS,
    ...(settings || {}),
  };
  if (!guardSettings.enabled) return { allow: true, text: responseText };

  try {
    const LLMConnector = getLLMProvider({
      provider: workspace?.chatProvider,
      model: workspace?.chatModel,
    });

    const messages = buildGuardMessages(responseText, guardSettings);
    const { textResponse } = await LLMConnector.getChatCompletion(messages, {
      temperature: 0,
      user: null,
    });
    const decision = parseDecision(textResponse);
    if (decision.allow === false) {
      return {
        allow: false,
        text: guardSettings.fallbackText || DEFAULT_GUARD_SETTINGS.fallbackText,
      };
    }
    return { allow: true, text: responseText };
  } catch (error) {
    console.error("Response guard failed", error.message);
    return { allow: true, text: responseText };
  }
}

async function fetchGuardSettings() {
  return await SystemSettings.responseGuardSettings();
}

module.exports = {
  applyResponseGuard,
  fetchGuardSettings,
  DEFAULT_GUARD_SETTINGS,
};
