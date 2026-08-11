import type { InternalSquadBadgeKey } from "@/lib/features/team-division/internal-squads";

export function InternalSquadBadge({
  badgeKey,
  color,
  className = "size-12",
}: {
  badgeKey: InternalSquadBadgeKey;
  color: string;
  className?: string;
}) {
  const patternId = `badge-${badgeKey}-${color.replace("#", "")}`;
  return (
    <svg viewBox="0 0 64 72" className={className} aria-hidden>
      <defs>
        <clipPath id={patternId}>
          <path d="M32 2 58 11v21c0 18-10 30-26 38C16 62 6 50 6 32V11L32 2Z" />
        </clipPath>
      </defs>
      <path d="M32 2 58 11v21c0 18-10 30-26 38C16 62 6 50 6 32V11L32 2Z" fill={color} stroke="#0f172a" strokeWidth="3" />
      <g clipPath={`url(#${patternId})`} fill="#fff" opacity=".9">
        {badgeKey === "stripes" ? <><rect x="16" width="8" height="72" /><rect x="40" width="8" height="72" /></> : null}
        {badgeKey === "sash" ? <path d="m-2 50 8 14L68 22 60 8Z" /> : null}
        {badgeKey === "quarters" ? <><rect x="32" width="32" height="36" /><rect y="36" width="32" height="36" /></> : null}
        {badgeKey === "circle" ? <circle cx="32" cy="31" r="15" /> : null}
        {badgeKey === "diamond" ? <path d="m32 12 17 20-17 20-17-20Z" /> : null}
        {badgeKey === "shield" ? <path d="M32 15 45 20v11c0 9-5 16-13 21-8-5-13-12-13-21V20l13-5Z" /> : null}
      </g>
      <path d="M32 2 58 11v21c0 18-10 30-26 38C16 62 6 50 6 32V11L32 2Z" fill="none" stroke="#fff" strokeWidth="1.5" opacity=".7" />
    </svg>
  );
}
