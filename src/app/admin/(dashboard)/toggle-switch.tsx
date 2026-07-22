"use client";

export default function ToggleSwitch({
  checked, onColor = "#E85A47", offColor = "#D8D0CB",
}: {
  checked: boolean;
  onColor?: string;
  offColor?: string;
}) {
  return (
    <span
      className="relative inline-block w-9 h-5 rounded-full transition-colors"
      style={{ background: checked ? onColor : offColor }}
    >
      <span
        className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform"
        style={{ left: checked ? "18px" : "2px" }}
      />
    </span>
  );
}
