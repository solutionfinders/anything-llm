import { CheckCircle, WarningCircle, Question } from "@phosphor-icons/react";

const VERDICT_CONFIG = {
  pass: {
    label: "Verified by fact checker",
    className: "border-emerald-400/40 bg-emerald-500/10 text-emerald-50",
    Icon: CheckCircle,
  },
  fail: {
    label: "Fact checker flagged issues",
    className: "border-red-400/50 bg-red-500/10 text-red-50",
    Icon: WarningCircle,
  },
  indeterminate: {
    label: "Fact checker needs more context",
    className: "border-amber-400/50 bg-amber-500/10 text-amber-50",
    Icon: Question,
  },
};

export default function FactCheckSummary({ factCheck = null }) {
  if (!factCheck) return null;

  const { verdict = "indeterminate", summary = "" } = factCheck;
  const { className, Icon, label } = VERDICT_CONFIG[verdict] ||
    VERDICT_CONFIG.indeterminate;

  return (
    <div
      className={`mt-3 border px-3 py-2 rounded-lg flex items-start gap-2 text-xs ${className}`}
    >
      <Icon weight="fill" className="w-4 h-4 mt-0.5 flex-shrink-0" />
      <div className="flex flex-col gap-0.5">
        <p className="font-medium m-0 leading-tight">{label}</p>
        {summary?.length > 0 && (
          <p className="opacity-80 m-0 leading-snug">{summary}</p>
        )}
      </div>
    </div>
  );
}
