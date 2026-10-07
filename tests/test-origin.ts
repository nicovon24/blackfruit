export const testOrigin = `http://localhost:${process.env.PORT ?? "3000"}`;

export function authRequestHeaders(cookie?: string): Headers {
  const headers = new Headers({ host: new URL(testOrigin).host, origin: testOrigin });
  if (cookie) headers.set("cookie", cookie);
  return headers;
}
