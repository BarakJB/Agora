export interface InsuranceCompanyMeta {
  code: string;
  hebrewName: string;
  englishName: string;
  hasLogo: boolean;
  logoExt: string | null;
  initials: string;
  isSupported: boolean;
}

export const INSURANCE_COMPANY_REGISTRY: InsuranceCompanyMeta[] = [
  {
    code: 'harel',
    hebrewName: 'הראל',
    englishName: 'Harel',
    hasLogo: true,
    logoExt: 'webp',
    initials: 'הר',
    isSupported: true,
  },
  {
    code: 'phoenix',
    hebrewName: 'הפניקס',
    englishName: 'Phoenix',
    hasLogo: true,
    logoExt: 'webp',
    initials: 'הפ',
    isSupported: true,
  },
  {
    code: 'menora',
    hebrewName: 'מנורה מבטחים',
    englishName: 'Menora',
    hasLogo: false,
    logoExt: null,
    initials: 'מנ',
    isSupported: true,
  },
  {
    code: 'analyst',
    hebrewName: 'אנליסט',
    englishName: 'Analyst',
    hasLogo: false,
    logoExt: null,
    initials: 'אנ',
    isSupported: true,
  },
  {
    code: 'clal',
    hebrewName: 'כלל',
    englishName: 'Clal',
    hasLogo: true,
    logoExt: 'webp',
    initials: 'כל',
    isSupported: false,
  },
  {
    code: 'migdal',
    hebrewName: 'מגדל',
    englishName: 'Migdal',
    hasLogo: true,
    logoExt: 'png',
    initials: 'מג',
    isSupported: false,
  },
  {
    code: 'yashir',
    hebrewName: 'ביטוח ישיר',
    englishName: 'Yashir',
    hasLogo: true,
    logoExt: 'png',
    initials: 'בי',
    isSupported: false,
  },
  {
    code: 'hachshara',
    hebrewName: 'הכשרה',
    englishName: 'Hachshara',
    hasLogo: false,
    logoExt: null,
    initials: 'הכ',
    isSupported: false,
  },
  {
    code: 'altshuler',
    hebrewName: 'אלטשולר שחם',
    englishName: 'Altshuler Shaham',
    hasLogo: false,
    logoExt: null,
    initials: 'אש',
    isSupported: false,
  },
  {
    code: 'meitav',
    hebrewName: 'מיטב דש',
    englishName: 'Meitav Dash',
    hasLogo: false,
    logoExt: null,
    initials: 'מד',
    isSupported: false,
  },
  {
    code: 'psagot',
    hebrewName: 'פסגות',
    englishName: 'Psagot',
    hasLogo: false,
    logoExt: null,
    initials: 'פס',
    isSupported: false,
  },
];

const NAME_TO_CODE: Record<string, string> = {
  הראל: 'harel',
  harel: 'harel',
  הפניקס: 'phoenix',
  phoenix: 'phoenix',
  פניקס: 'phoenix',
  'מנורה מבטחים': 'menora',
  מנורה: 'menora',
  menora: 'menora',
  אנליסט: 'analyst',
  analyst: 'analyst',
  'כלל ביטוח': 'clal',
  כלל: 'clal',
  clal: 'clal',
  מגדל: 'migdal',
  migdal: 'migdal',
  'ביטוח ישיר': 'yashir',
  ישיר: 'yashir',
  yashir: 'yashir',
  הכשרה: 'hachshara',
  hachshara: 'hachshara',
  'אלטשולר שחם': 'altshuler',
  אלטשולר: 'altshuler',
  altshuler: 'altshuler',
  'מיטב דש': 'meitav',
  מיטב: 'meitav',
  meitav: 'meitav',
  פסגות: 'psagot',
  psagot: 'psagot',
};

const REGISTRY_BY_CODE = new Map<string, InsuranceCompanyMeta>(
  INSURANCE_COMPANY_REGISTRY.map((c) => [c.code, c]),
);

export function normalizeCompanyName(input: string): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  const direct = NAME_TO_CODE[trimmed];
  if (direct) return direct;
  const lower = trimmed.toLowerCase();
  const byLower = NAME_TO_CODE[lower];
  if (byLower) return byLower;
  return null;
}

export function getCompanyDisplay(code: string): { name: string; initials: string; hasLogo: boolean } {
  const meta = REGISTRY_BY_CODE.get(code);
  if (!meta) {
    const firstTwo = code.slice(0, 2);
    return { name: code, initials: firstTwo, hasLogo: false };
  }
  return { name: meta.hebrewName, initials: meta.initials, hasLogo: meta.hasLogo };
}

export function getCompanyMeta(input: string): InsuranceCompanyMeta | null {
  const code = normalizeCompanyName(input) ?? input;
  return REGISTRY_BY_CODE.get(code) ?? null;
}
