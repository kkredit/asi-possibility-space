import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import { ThemeProvider } from '@mui/material';
import { App } from '@shell/App';
import { theme } from '@shell/theme';

// Exercises the full component tree once (engine -> viz wiring) to catch runtime
// crashes that a type-check and the engine unit tests can't see.
describe('App smoke render', () => {
  it('renders the whole tree without throwing', () => {
    const html = renderToString(
      <ThemeProvider theme={theme}>
        <App />
      </ThemeProvider>,
    );
    expect(html).toContain('Expected value');
    expect(html).toContain('Possibility');
  });
});
