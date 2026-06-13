import { prisma } from "@pitwall/db";

export async function getAllConstructors() {
  return prisma.f1_constructors.findMany({
    orderBy: { name: "asc" },
  });
}

export async function getArchiveConstructors() {
  return prisma.f1_constructors.findMany({
    where: { is_active: false },
    orderBy: { name: "asc" },
  });
}
