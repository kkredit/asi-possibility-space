/**
 * Brand mark: the "line of reality" (a thin teal line — the determined past)
 * reaching "now" near 1/5 width and fanning open into the future — a cone whose
 * vertical spread is the value spine (teal flourishing ↑, slate neutral, red
 * extinction ↓). Bézier edges leave the apex tangent-horizontal so the line flows
 * into the fan without a kink; the leading edge bulges like an expanding wavefront.
 *
 * Keep the geometry in sync with public/favicon.svg.
 */

// apex (8,16) → smooth top edge → convex right "wavefront" → smooth bottom edge → apex
const CONE = 'M8 16 C14 16 19 7 27 4 Q30.5 16 27 28 C19 25 14 16 8 16 Z';

export function Logo({ size = 26, idSuffix = 'logo' }: { size?: number; idSuffix?: string }) {
  const gid = `spine-${idSuffix}`;
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} role="img" aria-label="ASI Possibility Space">
      <defs>
        <linearGradient id={gid} gradientUnits="userSpaceOnUse" x1="0" y1="4" x2="0" y2="28">
          <stop offset="0" stopColor="#34D3B5" />
          <stop offset="0.5" stopColor="#5A6577" />
          <stop offset="1" stopColor="#E4564A" />
        </linearGradient>
      </defs>
      {/* reality line BEHIND the fan: visible in the past, then occluded by the cone;
          it stops mid-fan so it never emerges from the far side. Stroked with the
          fan's own gradient (keyed to absolute y) so at the midline it reads as the
          same slate as the cone's center — no color jump at the apex. */}
      <line x1="3.5" y1="16" x2="18" y2="16" stroke={`url(#${gid})`} strokeWidth="1.2" strokeLinecap="round" />
      <path d={CONE} fill={`url(#${gid})`} />
    </svg>
  );
}
