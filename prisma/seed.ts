import { hash } from "bcryptjs";

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD are required to seed admin.");
  }

  const passwordHash = await hash(password, 12);

  await db.adminUser.upsert({
    where: { email },
    create: {
      email,
      passwordHash,
    },
    update: {
      passwordHash,
    },
  });

  console.log(`Seeded admin user ${email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
