import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();
try {
  const stuck = await p.profile.updateMany({
    where: { syncing: true },
    data: { syncing: false, lastError: "Cleared stuck sync flag" },
  });
  console.log("cleared syncing:", stuck.count);

  const rows = await p.profile.findMany({
    select: {
      id: true,
      personaName: true,
      syncing: true,
      lastError: true,
      faceitFetchedAt: true,
      _count: { select: { items: true } },
    },
  });
  console.log(JSON.stringify(rows, null, 2));
} finally {
  await p.$disconnect();
}
