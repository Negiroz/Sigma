import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    console.log("Checking competitors by branch...");
    const competitors = await prisma.competitor.findMany({
        include: { branch: true }
    });
    
    console.log(JSON.stringify(competitors, null, 2));
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
