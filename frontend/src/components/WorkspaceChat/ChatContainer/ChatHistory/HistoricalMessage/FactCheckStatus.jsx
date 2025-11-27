import React from "react";
import {
  ShieldCheck,
  ShieldWarning,
  ShieldSlash,
} from "@phosphor-icons/react";

function formatDurationMs(durationMs) {
  if (typeof durationMs !== "number") return null;
  const seconds = durationMs / 1000;
  return seconds < 1
    ? `${Math.max(durationMs, 0).toFixed(0)}ms`
    : `${seconds.toFixed(2)}s`;
}

export default function FactCheckStatus({ factCheck = null }) {
  if (!factCheck?.enabled) return null;

  const providerModel = [factCheck.provider, factCheck.model]
    .filter(Boolean)
    .join(" • ");
  const durationLabel = formatDurationMs(factCheck.durationMs);

  const status = factCheck.error
    ? {
        Icon: ShieldWarning,
        label: "Fact check unavailable",
        helper: factCheck.error,
        container: "border-amber-500/40 bg-amber-500/10",
        textClass: "text-amber-100",
      }
    : factCheck.insufficientContext
    ? {
        Icon: ShieldSlash,
        label: "Context missing",
        helper: "Information not found in provided context.",
        container: "border-rose-500/40 bg-rose-500/10",
        textClass: "text-rose-100",
      }
    : factCheck.applied
    ? {
        Icon: ShieldCheck,
        label: "Fact check applied",
        helper: null,
        container: "border-emerald-500/40 bg-emerald-500/10",
        textClass: "text-emerald-100",
      }
    : {
        Icon: ShieldSlash,
        label: "Fact check skipped",
        helper: null,
        container: "border-white/10 bg-white/5",
        textClass: "text-theme-text-secondary",
      };

  return (
    <div
      className={`mt-3 inline-flex flex-wrap items-center gap-2 rounded-full border px-3 py-2 text-xs ${status.container}`}
    >
      <status.Icon className={`${status.textClass} w-4 h-4`} weight="fill" />
      <span className={`font-semibold ${status.textClass}`}>
        {status.label}
      </span>
      {providerModel && (
        <span className="text-[11px] text-theme-text-secondary">
          {providerModel}
        </span>
      )}
      {durationLabel && (
        <span className="text-[11px] text-theme-text-secondary">
          {durationLabel}
        </span>
      )}
      {status.helper && (
        <span className="text-[11px] text-amber-100">{status.helper}</span>
      )}
    </div>
  );
}
