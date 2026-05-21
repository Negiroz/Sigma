const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const e = await prisma.employee.findMany();
    e.forEach(x => {
        if (x.name.includes('Juneida') || x.name.includes('Greymar') || x.name.includes('Greimar')) {
            console.log(x.name, x.role);
        }
    });
}
main();
