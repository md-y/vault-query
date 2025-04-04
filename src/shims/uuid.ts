/**
 * This file is needed because the transpiled code wants a default export for UUID.
 * This may be a Bun bug.
 */

export function v4() {
  return crypto.randomUUID();
}

export function validate(uuid: string): boolean {
  const regex =
    /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$/i;
  return regex.test(uuid);
}
