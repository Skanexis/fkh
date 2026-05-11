import { ContactType, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const contacts = [
  {
    id: "seed-linktree-contact",
    type: ContactType.custom,
    label: "Linktree",
    value: "familykinghash2.0",
    href: "https://linktr.ee/familykinghash2.0",
    sortOrder: 5,
  },
  {
    id: "seed-instagram-contact",
    type: ContactType.custom,
    label: "Instagram",
    value: "familykinghshofficial",
    href: "https://www.instagram.com/familykinghshofficial?igsh=MW02aG02MTNwMWVsbQ%3D%3D&utm_source=qr",
    sortOrder: 15,
  },
  {
    id: "seed-telegram-contact",
    type: ContactType.telegram,
    label: "Telegram",
    value: "@aureliocasillas3",
    href: "https://t.me/aureliocasillas3",
    sortOrder: 20,
  },
  {
    id: "seed-signal-contact",
    type: ContactType.custom,
    label: "Signal",
    value: "Secure chat",
    href: "https://signal.me/#eu/uy4MO_w49Rffj-kMz7YNazKvZV2a7ujUbGTtjoi8__36geihO35O-qe2OJEk8aOc",
    sortOrder: 30,
  },
  {
    id: "seed-threema-contact",
    type: ContactType.custom,
    label: "Threema",
    value: "P9CN86Z8",
    href: "https://threema.id/P9CN86Z8",
    sortOrder: 40,
  },
];

async function main() {
  for (const contact of contacts) {
    await prisma.contact.upsert({
      where: { id: contact.id },
      update: {
        type: contact.type,
        label: contact.label,
        value: contact.value,
        href: contact.href,
        isActive: true,
        sortOrder: contact.sortOrder,
      },
      create: {
        ...contact,
        isActive: true,
      },
    });
  }
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
