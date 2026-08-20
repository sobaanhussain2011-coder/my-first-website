import { PrismaClient } from "@prisma/client";
import { ACHIEVEMENTS } from "./catalog.js";

export const prisma = new PrismaClient();

export async function seedAchievements() {
  for (const a of ACHIEVEMENTS) {
    await prisma.achievement.upsert({
      where: { key: a.key },
      update: { title: a.title, description: a.description },
      create: { key: a.key, title: a.title, description: a.description },
    });
  }
}
