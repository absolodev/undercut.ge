import { CURRENT_SEASON } from "@/lib/config";
import { getSeasonConstructors } from "../season-grid";

export async function getCurrentConstructors() {
  return getSeasonConstructors(CURRENT_SEASON);
}
