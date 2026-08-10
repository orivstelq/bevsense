type BevSenseBrandProps = {
  className?: string;
};

export function BevSenseBrand({ className = "" }: BevSenseBrandProps) {
  return (
    <div
      className={`inline-flex items-center gap-2 text-lg font-semibold tracking-tight ${className}`}
    >
      <svg
        aria-hidden="true"
        className="size-7 shrink-0"
        fill="none"
        viewBox="0 0 24 24"
      >
        <rect
          height="18"
          rx="2.5"
          stroke="currentColor"
          strokeWidth="1.7"
          width="16"
          x="4"
          y="3"
        />
        <path
          d="M7 14.5h10M9 8.5h6"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="1.7"
        />
        <circle cx="12" cy="8.5" fill="currentColor" r="1.5" />
      </svg>
      <span>BevSense</span>
    </div>
  );
}
