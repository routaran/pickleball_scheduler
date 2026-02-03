import { VERSION } from '../index';

describe('@dupr/core', () => {
  it('should export VERSION', () => {
    expect(VERSION).toBe('0.1.0');
  });
});
