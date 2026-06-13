import type { Locale } from "@/i18n/config";

export type DriverSeoNames = {
  en: string;
  es: string;
  ka: string;
};

/**
 * Localized driver names for SEO meta tags and hreflang content.
 * Add entries by driver_ref; falls back to the canonical English name.
 */
export const driverSeoNames: Record<string, DriverSeoNames> = {
  norris: { en: "Lando Norris", es: "Lando Norris", ka: "ლანდო ნორისი" },
  piastri: { en: "Oscar Piastri", es: "Oscar Piastri", ka: "ოსკარ პიასტრი" },
  verstappen: { en: "Max Verstappen", es: "Max Verstappen", ka: "მაქს ვერსტაპენი" },
  hamilton: { en: "Lewis Hamilton", es: "Lewis Hamilton", ka: "ლუის ჰემილტონი" },
  leclerc: { en: "Charles Leclerc", es: "Charles Leclerc", ka: "შარლ ლეკლერი" },
  sainz: { en: "Carlos Sainz", es: "Carlos Sainz", ka: "კარლოს საინსი" },
  russell: { en: "George Russell", es: "George Russell", ka: "ჯორჯ რასელი" },
  antonelli: { en: "Kimi Antonelli", es: "Kimi Antonelli", ka: "კიმი ანტონელი" },
  alonso: { en: "Fernando Alonso", es: "Fernando Alonso", ka: "ფერნანდო ალონსო" },
  stroll: { en: "Lance Stroll", es: "Lance Stroll", ka: "ლენს სტროლი" },
  gasly: { en: "Pierre Gasly", es: "Pierre Gasly", ka: "პიერი გასლი" },
  ocon: { en: "Esteban Ocon", es: "Esteban Ocon", ka: "ესტებან ოკონი" },
  albon: { en: "Alexander Albon", es: "Alexander Albon", ka: "ალექსანდრ ალბონი" },
  hadjar: { en: "Isack Hadjar", es: "Isack Hadjar", ka: "ისაკ ჰადჟარი" },
  bearman: { en: "Oliver Bearman", es: "Oliver Bearman", ka: "ოლივერ ბირმენი" },
  lawson: { en: "Liam Lawson", es: "Liam Lawson", ka: "ლიამ ლოსონი" },
  tsunoda: { en: "Yuki Tsunoda", es: "Yuki Tsunoda", ka: "იუკი ცუნოდა" },
  hulkenberg: { en: "Nico Hulkenberg", es: "Nico Hülkenberg", ka: "ნიკო ჰიულკენბერგი" },
  bortoleto: { en: "Gabriel Bortoleto", es: "Gabriel Bortoleto", ka: "გაბრიელი ბორტოლეტო" },
  colapinto: { en: "Franco Colapinto", es: "Franco Colapinto", ka: "ფრანკო კოლაპინტო" },
  doohan: { en: "Jack Doohan", es: "Jack Doohan", ka: "ჯეკ დუჰანი" },
  bottas: { en: "Valtteri Bottas", es: "Valtteri Bottas", ka: "ვალტერი ბოტასი" },
  perez: { en: "Sergio Pérez", es: "Sergio Pérez", ka: "სერხიო პერესი" },
};

export function getDriverSeoName(driverRef: string, locale: Locale, fallback: string): string {
  return driverSeoNames[driverRef]?.[locale] ?? fallback;
}

export function getDriverSeoKeywords(driverRef: string, fallback: string): string[] {
  const names = driverSeoNames[driverRef];
  if (!names) return [fallback, "Formula 1", "F1 driver"];
  return [...new Set([names.en, names.es, names.ka, fallback, "Formula 1", "F1 driver"])];
}
