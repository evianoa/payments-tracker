import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const client = await prisma.client.create({
    data: {
      name: "Triple9 Apartments",
      email: "billing@triple9.example.com",
      vaultLink: "[[people/triple9]]",
    },
  });

  const invoice = await prisma.invoice.create({
    data: {
      clientId: client.id,
      amount: 190,
      currency: "USD",
      status: "pending",
      dueDate: new Date("2025-07-15"),
      notes: "July rent",
    },
  });

  await prisma.payment.create({
    data: {
      invoiceId: invoice.id,
      amount: 190,
      date: new Date("2025-07-01"),
      method: "bank_transfer",
    },
  });

  console.log({ client, invoice });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
