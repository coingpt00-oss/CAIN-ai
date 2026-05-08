// src/lib/countries.ts
export const COUNTRIES = [
  "South Korea",
  "United States",
  "Japan",
  "India",
  "Nigeria",
  "Indonesia",
  "Vietnam",
  "Ukraine",
  "Russia",
  "Philippines",
  "Pakistan",
  "Brazil",
  "Turkey",
  "United Kingdom",
  "Venezuela",
  "Mexico",
  "Argentina",
  "Thailand",
  "Cambodia",
  "Canada",
  "China",
  "Others",
] as const;

export type Country = (typeof COUNTRIES)[number];
