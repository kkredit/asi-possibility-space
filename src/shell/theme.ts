import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    mode: 'dark',
    background: { default: '#0d1117', paper: '#161b22' },
    primary: { main: '#58a6ff' },
    secondary: { main: '#bc8cff' },
  },
  typography: {
    fontFamily:
      'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    h6: { fontWeight: 600 },
  },
  shape: { borderRadius: 8 },
});

/** Color for a scalar value in [-1, 1]: red (bad) → grey (neutral) → green (good). */
export function valueColor(scalar: number): string {
  const t = Math.max(-1, Math.min(1, scalar));
  if (t >= 0) {
    const g = Math.round(120 + t * 80);
    return `rgb(${Math.round(120 - t * 90)}, ${g}, ${Math.round(110 - t * 40)})`;
  }
  const r = Math.round(120 - t * 90);
  return `rgb(${r}, ${Math.round(120 + t * 60)}, ${Math.round(110 + t * 30)})`;
}

/** Color per factor kind, used across the sensitivity view and legends. */
export const kindColor: Record<string, string> = {
  objective: '#d29922', // value-of-information
  contingent: '#8b949e', // situational awareness
  influenceable: '#3fb950', // where to act
};

export const kindLabel: Record<string, string> = {
  objective: 'Objective — forecast harder (value of info)',
  contingent: 'Contingent — situational awareness',
  influenceable: 'Influenceable — where to act',
};
