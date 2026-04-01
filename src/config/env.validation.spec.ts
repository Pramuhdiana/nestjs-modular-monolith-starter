import { validateEnv } from './env.validation';

describe('validateEnv', () => {
  it('throws when DATABASE_URL missing', () => {
    expect(() =>
      validateEnv({
        JWT_SECRET: 'x'.repeat(32),
      } as Record<string, unknown>),
    ).toThrow();
  });

  it('throws when JWT_SECRET missing', () => {
    expect(() =>
      validateEnv({
        DATABASE_URL: 'postgresql://u:p@localhost:5432/db',
      } as Record<string, unknown>),
    ).toThrow();
  });

  it('accepts minimal valid config', () => {
    expect(
      validateEnv({
        DATABASE_URL: 'postgresql://u:p@localhost:5432/db',
        JWT_SECRET: 'x'.repeat(32),
      } as Record<string, unknown>),
    ).toMatchObject({
      DATABASE_URL: 'postgresql://u:p@localhost:5432/db',
      JWT_SECRET: 'x'.repeat(32),
    });
  });
});
