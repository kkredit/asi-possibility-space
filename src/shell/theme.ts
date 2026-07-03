import { createTheme } from '@mui/material/styles';
import type { FactorKind } from '@model/types';

/** Design tokens. Imported by SVG viz components that can't read MUI theme directly. */
export const c = {
  ink: '#0B0E14', // page background — deep blue-ink
  panel: '#12161F', // raised surfaces
  panel2: '#1A2029', // inset / controls
  line: '#232B3A', // hairlines
  bone: '#E8E6DF', // primary text — warm off-white
  mute: '#8A93A6', // secondary text
  faint: '#5B6473', // tertiary / disabled
  // diverging value spectrum (the semantic spine)
  red: '#E4564A', // extinction
  slate: '#5A6577', // neutral
  teal: '#34D3B5', // flourishing
  // UI chrome accent — a muted teal for interactive affordances (tab indicator,
  // links, toggles). The vivid `teal` stays reserved for DATA (the value spectrum,
  // positive deltas); softening the chrome keeps charts loud and controls quiet.
  accent: '#43A79C',
  // factor kinds
  amber: '#E0A33E', // objective — value of information
  contingent: '#6E7A92', // contingent — situational
} as const;

export const fonts = {
  display: '"Space Grotesk", ui-sans-serif, system-ui, sans-serif',
  body: '"Inter", ui-sans-serif, system-ui, -apple-system, sans-serif',
  mono: '"JetBrains Mono", ui-monospace, "SF Mono", Menlo, monospace',
};

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
/** Linear blend of two hex colors, t in [0,1] toward `b`. */
export function mix(a: string, b: string, t: number): string {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return `rgb(${r}, ${g}, ${bl})`;
}

/**
 * Diverging color for a scalar value in [-1, 1]:
 * extinction red (−1) → neutral slate (0) → flourishing teal (+1).
 */
export function valueColor(scalar: number): string {
  const t = Math.max(-1, Math.min(1, scalar));
  return t < 0 ? mix(c.slate, c.red, -t) : mix(c.slate, c.teal, t);
}

/** The full spectrum as a CSS gradient (for the EV gauge). */
export const valueGradient = `linear-gradient(90deg, ${c.red} 0%, ${c.slate} 50%, ${c.teal} 100%)`;

// Record<FactorKind, ...> so adding a kind is a compile error here until it gets
// a color and a legend line (and a typo'd kind can't silently map to undefined).
export const kindColor: Record<FactorKind, string> = {
  objective: c.amber,
  contingent: c.contingent,
  influenceable: c.accent,
};

export const kindLabel: Record<FactorKind, string> = {
  objective: 'Objective — timeless fact; reduce by research (value of info)',
  contingent: 'Contingent — low leverage; forecast & position (situational awareness)',
  influenceable: 'Influenceable — high leverage; move it by acting',
};

export const theme = createTheme({
  palette: {
    mode: 'dark',
    background: { default: c.ink, paper: c.panel },
    primary: { main: c.accent },
    secondary: { main: c.amber },
    error: { main: c.red },
    text: { primary: c.bone, secondary: c.mute },
    divider: c.line,
  },
  typography: {
    fontFamily: fonts.body,
    h4: { fontFamily: fonts.display, fontWeight: 600, letterSpacing: '-0.01em' },
    h5: { fontFamily: fonts.display, fontWeight: 600, letterSpacing: '-0.01em' },
    h6: { fontFamily: fonts.display, fontWeight: 600 },
    subtitle1: { fontFamily: fonts.display, fontWeight: 500 },
    subtitle2: { fontFamily: fonts.display, fontWeight: 500, letterSpacing: '0.01em' },
    overline: {
      fontFamily: fonts.display,
      fontWeight: 600,
      letterSpacing: '0.14em',
      fontSize: '0.66rem',
    },
    button: { fontFamily: fonts.display, fontWeight: 500, textTransform: 'none' },
  },
  shape: { borderRadius: 10 },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: c.ink,
          backgroundImage: `radial-gradient(1200px 600px at 75% -10%, rgba(52,211,181,0.06), transparent 60%), radial-gradient(900px 500px at 0% 0%, rgba(228,86,74,0.05), transparent 55%)`,
          backgroundAttachment: 'fixed',
        },
        '::selection': { background: 'rgba(52,211,181,0.28)' },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: c.panel,
          border: `1px solid ${c.line}`,
        },
      },
    },
    MuiSlider: {
      styleOverrides: {
        root: { color: c.slate, height: 4 },
        rail: { backgroundColor: c.line, opacity: 1 },
        track: { backgroundColor: c.faint, border: 'none' },
        thumb: {
          backgroundColor: c.bone,
          width: 13,
          height: 13,
          '&:hover, &.Mui-focusVisible': { boxShadow: `0 0 0 6px rgba(52,211,181,0.18)` },
          '&.Mui-active': { boxShadow: `0 0 0 9px rgba(52,211,181,0.22)` },
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        root: { minHeight: 40 },
        indicator: { backgroundColor: c.accent, height: 2 },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          minHeight: 40,
          textTransform: 'none',
          fontFamily: fonts.display,
          fontWeight: 500,
          letterSpacing: '0.01em',
          color: c.mute,
          '&.Mui-selected': { color: c.bone },
        },
      },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontFamily: fonts.display,
          color: c.mute,
          borderColor: c.line,
          '&.Mui-selected': {
            color: c.bone,
            backgroundColor: 'rgba(52,211,181,0.14)',
            '&:hover': { backgroundColor: 'rgba(52,211,181,0.2)' },
          },
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: '#020409',
          border: `1px solid ${c.line}`,
          color: c.bone,
          fontFamily: fonts.body,
          fontSize: '0.72rem',
          maxWidth: 280,
        },
        arrow: { color: '#020409' },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontFamily: fonts.mono, fontWeight: 500 },
        outlined: { borderColor: c.line },
      },
    },
  },
});
