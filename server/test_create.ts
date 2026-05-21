import prisma from './src/prisma';
import bcrypt from 'bcryptjs';

async function main() {
    try {
        const hashedPassword = await bcrypt.hash('password123', 10);
        const result = await prisma.$transaction(async (prisma) => {
            const newCompany = await prisma.company.create({
                data: { name: 'Test API Company' }
            });
            const newAdmin = await prisma.user.create({
                data: {
                    username: 'test_api_admin_' + Date.now(),
                    password: hashedPassword,
                    role: 'ADMIN',
                    companyId: newCompany.id
                }
            });
            return { company: newCompany, admin: newAdmin };
        });
        console.log('Success:', result);
    } catch (e) {
        console.error('Failed:', e);
    }
}
main();
