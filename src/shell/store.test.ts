import { afterEach, describe, expect, it } from 'vitest';
import { useBeliefs } from '@shell/store';
import { presets } from '@model/presets';
import { dataset } from '@model/dataset';
import { analyze, cachedEvaluator, enumerateScenarios, scenarioKey } from '@engine/index';

const s = () => useBeliefs.getState();

afterEach(() => s().reset());

describe('belief store — probability model', () => {
  it('defaults to independence with no Bayes-net joint', () => {
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

  it('reset returns to independence baseline', () => {
    s().setProbabilityModel('bayesNet');
    s().reset();
    expect(s().probabilityModel).toBe('independence');
    expect(s().bayesProbability).toBeNull();
  });

  it('applying a preset preserves the active model and recomputes the joint', () => {
    s().setProbabilityModel('bayesNet');
    s().applyPreset(presets[0].id);
    expect(s().probabilityModel).toBe('bayesNet');
    expect(typeof s().bayesProbability).toBe('function');
    expect(s().activePresetId).toBe(presets[0].id);
  });
});
