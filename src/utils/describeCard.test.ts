import { describe, expect, it } from 'vitest';
import { buildA11yDescription } from './describeCard';

describe('buildA11yDescription', () => {
  it('describes a creature with cost, P/T and text', () => {
    const out = buildA11yDescription({
      name: 'Shivan Dragon', manaCost: '{4}{R}{R}',
      typeLine: 'Creature - Dragon', oracleText: 'Flying.',
      power: 5, toughness: 5,
    });
    expect(out).toContain('Shivan Dragon');
    expect(out).toContain('Creature - Dragon');
    expect(out).toContain('4 generic plus red plus red');
    expect(out).toContain('Power 5, toughness 5');
    expect(out).toContain('Flying');
  });

  it('omits P/T for non-creatures', () => {
    const out = buildA11yDescription({
      name: 'Lightning Bolt', manaCost: '{R}',
      typeLine: 'Instant', oracleText: 'Deal 3 damage.',
      power: 0, toughness: 0,
    });
    expect(out).not.toContain('Power');
  });

  it('handles missing mana cost', () => {
    const out = buildA11yDescription({
      name: 'Emrakul', manaCost: '', typeLine: 'Creature - Eldrazi',
      oracleText: '', power: 15, toughness: 15,
    });
    expect(out).toContain('No mana cost');
  });
});
