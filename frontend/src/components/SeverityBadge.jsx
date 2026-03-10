import { getSeverityClasses } from "../utils/formatters";

const SIZE_CLASSES = {
  sm: "px-2 py-0.5 text-xs",
  md: "px-2.5 py-0.5 text-xs",
  lg: "px-3 py-1 text-sm",
};

export default function SeverityBadge({ severity, size = "md" }) {
  const { bg, text } = getSeverityClasses(severity);
  const sizeClass = SIZE_CLASSES[size] ?? SIZE_CLASSES.md;
  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${bg} ${text} ${sizeClass}`}
    >
      {severity}
    </span>
  );
}
