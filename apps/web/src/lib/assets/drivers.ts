const HEADSHOT_BASE =
  "https://media.formula1.com/d_driver_fallback_image.png/content/dam/fom-website/drivers";

/** Known driver headshots on F1 media CDN (driver_ref → path segment). */
const HEADSHOTS: Record<string, string> = {
  max_verstappen: `${HEADSHOT_BASE}/M/MAXVER01_Max_Verstappen/maxver01.png`,
  leclerc: `${HEADSHOT_BASE}/C/CHALEC01_Charles_Leclerc/chalec01.png`,
  hamilton: `${HEADSHOT_BASE}/L/LEWHAM01_Lewis_Hamilton/lewham01.png`,
  russell: `${HEADSHOT_BASE}/G/GEORUS01_George_Russell/georus01.png`,
  norris: `${HEADSHOT_BASE}/L/LANNOR01_Lando_Norris/lannor01.png`,
  piastri: `${HEADSHOT_BASE}/O/OSCPIA01_Oscar_Piastri/oscpia01.png`,
  sainz: `${HEADSHOT_BASE}/C/CARSAI01_Carlos_Sainz/carsai01.png`,
  perez: `${HEADSHOT_BASE}/S/SERPER01_Sergio_Perez/serper01.png`,
  alonso: `${HEADSHOT_BASE}/F/FERALO01_Fernando_Alonso/feralo01.png`,
  stroll: `${HEADSHOT_BASE}/L/LANSTR01_Lance_Stroll/lanstr01.png`,
  gasly: `${HEADSHOT_BASE}/P/PIEGAS01_Pierre_Gasly/piegas01.png`,
  ocon: `${HEADSHOT_BASE}/E/ESTOCO01_Esteban_Ocon/estoco01.png`,
  albon: `${HEADSHOT_BASE}/A/ALEALB01_Alexander_Albon/alealb01.png`,
  sargeant: `${HEADSHOT_BASE}/L/LOGSAR01_Logan_Sargeant/logsar01.png`,
  tsunoda: `${HEADSHOT_BASE}/Y/YUKTSU01_Yuki_Tsunoda/yuktsu01.png`,
  ricciardo: `${HEADSHOT_BASE}/D/DANRIC01_Daniel_Ricciardo/danric01.png`,
  bottas: `${HEADSHOT_BASE}/V/VALBOT01_Valtteri_Bottas/valbot01.png`,
  zhou: `${HEADSHOT_BASE}/G/GUAZHO01_Guanyu_Zhou/guazho01.png`,
  magnussen: `${HEADSHOT_BASE}/K/KEVMAG01_Kevin_Magnussen/kevmag01.png`,
  hulkenberg: `${HEADSHOT_BASE}/N/NICHUL01_Nico_Hulkenberg/nichul01.png`,
  bearman: `${HEADSHOT_BASE}/O/OLIBEA01_Oliver_Bearman/olibea01.png`,
  lawson: `${HEADSHOT_BASE}/L/LIALAW01_Liam_Lawson/lialaw01.png`,
  antonelli: `${HEADSHOT_BASE}/A/ANDANT01_Andrea%20Kimi_Antonelli/andant01.png`,
  bortoleto: `${HEADSHOT_BASE}/G/GABBOR01_Gabriel_Bortoleto/gabbor01.png`,
};

export function resolveDriverHeadshotUrl(
  driverRef: string | null | undefined,
  dbHeadshotUrl?: string | null
): string | null {
  if (dbHeadshotUrl) return dbHeadshotUrl;
  if (!driverRef) return null;
  return HEADSHOTS[driverRef.toLowerCase()] ?? null;
}
