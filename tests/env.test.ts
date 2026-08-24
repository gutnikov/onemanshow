import { afterEach, describe, expect, it } from 'vitest';
import { flag, required } from '@shared/env';

const KEY = 'SHIP_TEST_ONLY';

afterEach(() => {
  delete process.env[KEY];
});

describe('required', () => {
  it('returns the value when set', () => {
    process.env[KEY] = 'value';
    expect(required(KEY)).toBe('value');
  });

  it('throws rather than defaulting when unset', () => {
    expect(() => required(KEY)).toThrow(KEY);
  });

  it('treats an empty string as unset, so a blank secret cannot look configured', () => {
    process.env[KEY] = '';
    expect(() => required(KEY)).toThrow(KEY);
  });
});

describe('flag', () => {
  it.each([
    ['1', true],
    ['true', true],
    ['0', false],
    ['', false],
    ['yes', false],
  ])('reads %o as %o', (value, expected) => {
    process.env[KEY] = value;
    expect(flag(KEY)).toBe(expected);
  });

  it('is false when unset', () => {
    expect(flag(KEY)).toBe(false);
  });
});
