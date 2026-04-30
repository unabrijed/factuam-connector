export function parseJson<T>(input: string): T {
  return JSON.parse(input) as T;
}
