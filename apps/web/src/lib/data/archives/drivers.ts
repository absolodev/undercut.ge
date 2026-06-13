import { prisma } from "@pitwall/db";

export async function getAllDrivers() {
  return prisma.f1_drivers.findMany({
    orderBy: { last_name: "asc" },
  });
}

export async function getArchiveDrivers() {
  return prisma.f1_drivers.findMany({
    where: { is_active: false },
    orderBy: { last_name: "asc" },
  });
}
