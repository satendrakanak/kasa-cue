import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const adminEmail = process.env.KASA_ADMIN_EMAIL ?? "admin@cue.getkasa.in";
const adminName = process.env.KASA_ADMIN_NAME ?? "Kasa Cue Admin";
const adminPassword = process.env.KASA_ADMIN_PASSWORD;

async function main() {
  if (!adminPassword) {
    throw new Error("KASA_ADMIN_PASSWORD is required before seeding admin user.");
  }

  const passwordHash = await bcrypt.hash(adminPassword, 12);

  await prisma.user.upsert({
    where: { email: adminEmail.toLowerCase() },
    update: {
      name: adminName,
      passwordHash,
      role: "admin",
    },
    create: {
      name: adminName,
      email: adminEmail.toLowerCase(),
      passwordHash,
      role: "admin",
    },
  });

  console.log(`Admin user ready: ${adminEmail.toLowerCase()}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
