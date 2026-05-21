import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const updated = await prisma.employee.update({
        where: { id: 37 },
        data: { currentXp: 3918 }
    });
    console.log(`Updated ${updated.name} (ID: ${updated.id}) currentXp to ${updated.currentXp}`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
