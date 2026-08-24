/** Fails loudly rather than defaulting, so a misconfigured environment never looks healthy. */
export function required(name: string): string {
  const value = process.env[name];
  if (value === undefined || value === '') {
    throw new Error(`${name} is not set`);
  }
  return value;
}

export function flag(name: string): boolean {
  return process.env[name] === '1' || process.env[name] === 'true';
}
