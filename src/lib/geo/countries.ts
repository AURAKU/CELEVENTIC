/** ISO 3166-1 alpha-2 countries used across Celeventic (Africa-first + common markets). */

export type CountryOption = {
  code: string;
  name: string;
  flag: string;
};

/** Regional-indicator flag emoji from a 2-letter ISO code. */
export function countryFlag(code: string): string {
  const iso = code.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(iso)) return "🌐";
  return String.fromCodePoint(...[...iso].map((c) => 127397 + c.charCodeAt(0)));
}

const COUNTRY_NAMES: Record<string, string> = {
  GH: "Ghana",
  NG: "Nigeria",
  KE: "Kenya",
  ZA: "South Africa",
  CI: "Côte d'Ivoire",
  SN: "Senegal",
  TG: "Togo",
  BJ: "Benin",
  BF: "Burkina Faso",
  ML: "Mali",
  NE: "Niger",
  LR: "Liberia",
  SL: "Sierra Leone",
  GM: "Gambia",
  GW: "Guinea-Bissau",
  GN: "Guinea",
  CV: "Cabo Verde",
  CM: "Cameroon",
  GA: "Gabon",
  CG: "Congo",
  CD: "DR Congo",
  UG: "Uganda",
  TZ: "Tanzania",
  RW: "Rwanda",
  ET: "Ethiopia",
  EG: "Egypt",
  MA: "Morocco",
  TN: "Tunisia",
  DZ: "Algeria",
  ZW: "Zimbabwe",
  ZM: "Zambia",
  BW: "Botswana",
  NA: "Namibia",
  MW: "Malawi",
  MZ: "Mozambique",
  AO: "Angola",
  US: "United States",
  GB: "United Kingdom",
  CA: "Canada",
  DE: "Germany",
  FR: "France",
  NL: "Netherlands",
  BE: "Belgium",
  IE: "Ireland",
  ES: "Spain",
  IT: "Italy",
  PT: "Portugal",
  CH: "Switzerland",
  AE: "United Arab Emirates",
  SA: "Saudi Arabia",
  IN: "India",
  CN: "China",
  AU: "Australia",
  NZ: "New Zealand",
  BR: "Brazil",
  MX: "Mexico",
  JM: "Jamaica",
  TT: "Trinidad and Tobago",
  BB: "Barbados",
};

/** Priority order for the top of the picker (Ghana + neighbours first). */
const PRIORITY_CODES = [
  "GH",
  "NG",
  "CI",
  "TG",
  "BJ",
  "BF",
  "SN",
  "KE",
  "ZA",
  "US",
  "GB",
  "CA",
] as const;

function buildList(): CountryOption[] {
  const priority = new Set<string>(PRIORITY_CODES);
  const rest = Object.keys(COUNTRY_NAMES)
    .filter((code) => !priority.has(code))
    .sort((a, b) => COUNTRY_NAMES[a]!.localeCompare(COUNTRY_NAMES[b]!));

  return [...PRIORITY_CODES, ...rest].map((code) => ({
    code,
    name: COUNTRY_NAMES[code]!,
    flag: countryFlag(code),
  }));
}

export const COUNTRY_OPTIONS: CountryOption[] = buildList();

export function findCountry(code: string | null | undefined): CountryOption | undefined {
  if (!code) return undefined;
  const iso = code.trim().toUpperCase();
  return COUNTRY_OPTIONS.find((c) => c.code === iso);
}

export function filterCountries(query: string): CountryOption[] {
  const q = query.trim().toLowerCase();
  if (!q) return COUNTRY_OPTIONS;
  return COUNTRY_OPTIONS.filter(
    (c) =>
      c.name.toLowerCase().includes(q) ||
      c.code.toLowerCase().includes(q)
  );
}
