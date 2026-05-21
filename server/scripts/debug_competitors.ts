import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
    const competitors = await prisma.competitor.findMany({
        include: { branch: true }
    });
    console.log('Competitors found:', JSON.stringify(competitors, null, 2));
    process.exit(0);
}

check();
