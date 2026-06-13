import { CURRENT_SEASON } from "@/lib/config";
import { getSeasonGridDrivers } from "../season-grid";

export async function getCurrentGridDrivers() {
  return getSeasonGridDrivers(CURRENT_SEASON);
}
