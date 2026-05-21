import prisma from '../src/prisma';
import bcrypt from 'bcryptjs';

async function main() {
    console.log('Start seeding ...');

    // Create Company
    const company = await prisma.company.create({
        data: {
            name: 'Tech Solutions Inc.',
            branches: {
                create: [
                    { name: 'North Branch' },
                    { name: 'South Branch' },
                    { name: 'East Branch' },
                ],
            },
        },
        include: { branches: true },
    });

    const northBranch = company.branches[0];
    const southBranch = company.branches[1];

    console.log(`Created company with id: ${company.id}`);

    // Create Admin User
    const password = await bcrypt.hash('password123', 10);
    const admin = await prisma.user.upsert({
        where: { username: 'admin' },
        update: { companyId: company.id },
        create: {
            username: 'admin',
            password,
            role: 'ADMIN',
            companyId: company.id,
        },
    });
    console.log(`Created user: ${admin.username}`);

    // Create Employees (Agents)
    const agent1 = await prisma.employee.create({
        data: {
            name: 'John Doe',
            role: 'AGENT',
            companyId: company.id,
            branchId: northBranch.id,
        },
    });

    const agent2 = await prisma.employee.create({
        data: {
            name: 'Jane Smith',
            role: 'AGENT',
            companyId: company.id,
            branchId: southBranch.id,
        },
    });

    // Create Employees (Closers)
    const closer1 = await prisma.employee.create({
        data: {
            name: 'Carlos Rodriguez',
            role: 'CLOSER',
            companyId: company.id,
            // Closers might not be tied to a specific branch for installations, but HR-wise yes.
            // For now we leave branchId null or assign one. Let's assign company main branch (north).
            branchId: northBranch.id,
        },
    });

    const closer2 = await prisma.employee.create({
        data: {
            name: 'Maria Garcia',
            role: 'CLOSER',
            companyId: company.id,
            branchId: southBranch.id,
        },
    });

    // Create Installation Team
    const installationTeam1 = await prisma.installationTeam.create({
        data: {
            name: 'InstallPro Services',
            companyId: company.id,
        }
    });

    // ...

    // Installation Performance
    await prisma.installationPerformance.create({
        data: {
            teamId: installationTeam1.id,
            month: 12,
            year: 2025,
            installations: 45,
        }
    });

    console.log('Seeding finished.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
