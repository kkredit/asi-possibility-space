import { afterEach, describe, expect, it, vi } from 'vitest';
import { useBeliefs } from '@shell/store';
import { presets } from '@model/presets';
import { dataset } from '@model/dataset';
import { analyze, cachedEvaluator, enumerateScenarios, scenarioKey } from '@engine/index';
import { encodeBeliefs } from '@shell/urlBeliefs';

const s = () => useBeliefs.getState();

afterEach(() => s().reset());

describe('belief store — probability model', () => {
  it('defaults to the Bayes net with a joint ready', () => {
    expect(s().probabilityModel).toBe('bayesNet');
    expect(typeof s().bayesProbability).toBe('function');
  });

  it('can switch to independence (opt-out) and drop the joint', () => {
    s().setProbabilityModel('independence');
    expect(s().probabilityModel).toBe('independence');
    expect(s().bayesProbability).toBeNull();
  });

  it('switching to Bayes net builds a joint that sums to 1 over the space', () => {
    s().setProbabilityModel('bayesNet');
    expect(s().probabilityModel).toBe('bayesNet');
    const jp = s().bayesProbability!;
    expect(typeof jp).toBe('function');
    const total = enumerateScenarios(dataset.factors).reduce((a, sc) => a + jp(sc), 0);
    expect(total).toBeCloseTo(1, 8);
  });

  it('the net joint matches the current credence marginals (reflects beliefs)', () => {
    s().applyPreset('yampolskiy');
    s().setProbabilityModel('bayesNet');
    const jp = s().bayesProbability!;
    const cr = s().credences;
    // Marginalize the net joint for a couple of factors; should equal the credences.
    const marg: Record<string, number> = {};
    for (const sc of enumerateScenarios(dataset.factors)) {
      marg[`orthogonality:${sc.orthogonality}`] = (marg[`orthogonality:${sc.orthogonality}`] ?? 0) + jp(sc);
      marg[`alignmentInTime:${sc.alignmentInTime}`] = (marg[`alignmentInTime:${sc.alignmentInTime}`] ?? 0) + jp(sc);
    }
    expect(marg['orthogonality:holds']).toBeCloseTo(cr.orthogonality.holds, 4);
    expect(marg['alignmentInTime:no']).toBeCloseTo(cr.alignmentInTime.no, 4);
  });

  it('net mode reflects the loaded preset (a doomer keeps high doom mass)', () => {
    s().applyPreset('yampolskiy');
    s().setProbabilityModel('bayesNet');
    const jp = s().bayesProbability!;
    const key = (sc: Parameters<typeof jp>[0]) => scenarioKey(sc);
    void key;
    const a = analyze(dataset, s().credences, s().weights, cachedEvaluator, {}, jp);
    const doom = a.scenarios.reduce((m, sc) => m + (sc.value.survival < -0.5 ? sc.probability : 0), 0);
    expect(doom).toBeGreaterThan(0.8); // not the ~baseline value it showed before the fix
  });

  it('reset returns to the Bayes-net default baseline', () => {
    s().setProbabilityModel('independence');
    s().reset();
    expect(s().probabilityModel).toBe('bayesNet');
    expect(typeof s().bayesProbability).toBe('function');
  });

  it('applying a preset preserves the active model and recomputes the joint', () => {
    s().setProbabilityModel('bayesNet');
    s().applyPreset(presets[0].id);
    expect(s().probabilityModel).toBe('bayesNet');
    expect(typeof s().bayesProbability).toBe('function');
    expect(s().activePresetId).toBe(presets[0].id);
  });

  it('initial state from a #preset= URL rakes the joint to the preset, not the baseline', async () => {
    // Regression: the initial bayesProbability used to be built from the BASELINE
    // credences even when a #preset= link overrode them, so a shared Bayes-net link
    // rendered the wrong EV/p(doom). Boot a fresh store with a stubbed window.
    vi.resetModules();
    vi.stubGlobal('window', {
      location: { hash: '#preset=yampolskiy', href: 'https://example.test/#preset=yampolskiy' },
      history: { replaceState: () => {} },
    });
    try {
      const { useBeliefs: freshStore } = await import('@shell/store');
      const st = freshStore.getState();
      expect(st.activePresetId).toBe('yampolskiy');
      const jp = st.bayesProbability!;
      expect(typeof jp).toBe('function');
      // The joint's orthogonality marginal must match the PRESET (0.99), not baseline (0.8).
      let holds = 0;
      for (const sc of enumerateScenarios(dataset.factors)) {
        if (sc.orthogonality === 'holds') holds += jp(sc);
      }
      expect(holds).toBeCloseTo(st.credences.orthogonality.holds, 4);
      expect(holds).toBeGreaterThan(0.95);
    } finally {
      vi.unstubAllGlobals();
      vi.resetModules();
    }
  });

  it('initial state from a #beliefs= URL restores a full custom belief set', async () => {
    // Mint a custom link (doom-leaning orthogonality, custom weights, direct mode),
    // then boot a fresh store against it.
    const custom = {
      credences: structuredClone(dataset.baselineCredences),
      subCredences: structuredClone(dataset.subBaseline!),
      weights: { survival: 0.5, agency: 0.1, suffering: 0.25, flourishing: 0.15 },
      probabilityModel: 'independence' as const,
      alignmentMode: 'direct' as const,
    };
    custom.credences.orthogonality = { holds: 0.97, fails: 0.03 };
    const encoded = encodeBeliefs(custom);

    vi.resetModules();
    vi.stubGlobal('window', {
      location: { hash: `#beliefs=${encoded}`, href: `https://example.test/#beliefs=${encoded}` },
      history: { replaceState: () => {} },
    });
    try {
      const { useBeliefs: freshStore } = await import('@shell/store');
      const st = freshStore.getState();
      expect(st.activePresetId).toBeNull();
      expect(st.probabilityModel).toBe('independence');
      expect(st.alignmentMode).toBe('direct');
      expect(st.credences.orthogonality.holds).toBeCloseTo(0.97, 3);
      expect(st.weights.survival).toBeCloseTo(0.5, 3);
      expect(st.bayesProbability).toBeNull();
    } finally {
      vi.unstubAllGlobals();
      vi.resetModules();
    }
  });
});
