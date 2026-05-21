const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const juneida = await prisma.employee.findFirst({ where: { name: { contains: 'Juneida' } } });
    console.log("Juneida companyId:", juneida.companyId);
    
    // get all matches for Juneida
    const m = await prisma.versusMatch.findMany({
        where: { OR: [ { agent1Id: juneida.id }, { agent2Id: juneida.id } ] }
    });
    console.log("Matches count:", m.length);
    console.log("Matches company IDs:", [...new Set(m.map(x => x.companyId))]);
}
main();
