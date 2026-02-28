import { PrismaClient, EmploymentContractType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const contracts: { type: EmploymentContractType; label: string }[] = [
    { type: 'HPP', label: 'HPP' },
    { type: 'DPC', label: 'DPČ' },
    { type: 'DPP', label: 'DPP' },
    { type: 'ICO', label: 'IČO' },
  ];

  for (const contract of contracts) {
    await prisma.employmentContract.upsert({
      where: { type: contract.type },
      update: { label: contract.label },
      create: contract,
    });
  }

  console.log('Typy úvazků vytvořeny.');

  const hpp = await prisma.employmentContract.findUnique({
    where: { type: 'HPP' },
  });

  if (hpp) {
    const updated = await prisma.profile.updateMany({
      where: { employmentContractId: null },
      data: { employmentContractId: hpp.id },
    });
    console.log(`HPP přiřazen ${updated.count} zaměstnancům.`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
