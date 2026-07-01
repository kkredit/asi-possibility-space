import { describe, expect, it } from 'vitest';
import { dataset } from '@model/dataset';

const VALID_KINDS = new Set(['paper', 'book', 'post', 'video', 'podcast', 'course']);
const ACCESSIBLE_KINDS = new Set(['post', 'video', 'podcast', 'course']);

describe('factor backgrounds (learning launchpad)', () => {
  it('every factor has a background with prose, positions and references', () => {
    for (const f of dataset.factors) {
      const bg = f.background;
      expect(bg, `${f.id} missing background`).toBeDefined();
      expect(bg!.paragraphs.length, `${f.id} needs prose`).toBeGreaterThanOrEqual(1);
      expect(bg!.references.length, `${f.id} needs references`).toBeGreaterThanOrEqual(3);
    }
  });

  it('references are well-formed https links with a known kind', () => {
    for (const f of dataset.factors) {
      for (const ref of f.background!.references) {
        expect(ref.url, `${f.id}: ${ref.label}`).toMatch(/^https:\/\//);
        expect(VALID_KINDS.has(ref.kind), `${f.id}: bad kind ${ref.kind}`).toBe(true);
        expect(ref.label.length).toBeGreaterThan(0);
      }
    }
  });

  it('every factor offers at least one accessible entry point (post/video/podcast/course)', () => {
    for (const f of dataset.factors) {
      const hasAccessible = f.background!.references.some((r) => ACCESSIBLE_KINDS.has(r.kind));
      expect(hasAccessible, `${f.id} has no accessible on-ramp`).toBe(true);
    }
  });

  it('position states, when given, are real states of the factor', () => {
    for (const f of dataset.factors) {
      const stateIds = new Set(f.states.map((s) => s.id));
      for (const pos of f.background!.positions ?? []) {
        if (pos.state !== undefined) {
          expect(stateIds.has(pos.state), `${f.id}: position "${pos.name}" → unknown state ${pos.state}`).toBe(true);
        }
      }
    }
  });
});
