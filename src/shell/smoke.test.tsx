import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import { ThemeProvider } from '@mui/material';
import { App } from '@shell/App';
import { IntroPage } from '@shell/pages/IntroPage';
import { ResourcesPage } from '@shell/pages/ResourcesPage';
import { DisclaimersPage } from '@shell/pages/DisclaimersPage';
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

  it('renders the intro and resources pages without throwing', () => {
    const intro = renderToString(
      <ThemeProvider theme={theme}>
        <IntroPage />
      </ThemeProvider>,
    );
    expect(intro).toContain('About this site');

    const resources = renderToString(
      <ThemeProvider theme={theme}>
        <ResourcesPage />
      </ThemeProvider>,
    );
    expect(resources).toContain('Resources');
    // Every factor and subfactor entry appears with its reading list.
    expect(resources).toContain('Orthogonality Thesis');
    expect(resources).toContain('Corrigibility basin');
    expect(resources).toContain('Takeover severity');
    expect(resources).toContain('Mechanistic interpretability');

    const disclaimers = renderToString(
      <ThemeProvider theme={theme}>
        <DisclaimersPage />
      </ThemeProvider>,
    );
    expect(disclaimers).toContain('unofficial reconstructions');
    expect(disclaimers).toContain('Superintelligence');
  });
});
