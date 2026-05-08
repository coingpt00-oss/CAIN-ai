//src/lib/personalMarketsApi.ts
export function pmApi(path: string) {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `/api/public/personal-markets${p}`;
}