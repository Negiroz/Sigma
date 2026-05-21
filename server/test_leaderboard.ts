import { getLeaderboard } from './src/controllers/meritController';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function test() {
    const req = {
        query: {
            month: '4',
            year: '2026',
            companyId: '2',
            role: 'AGENT'
        }
    };
    const res = {
        json: (data: any) => {
            console.log('Result Length:', data.length);
            console.log('Names:', data.map((d: any) => d.name));
        },
        status: (code: number) => ({
            json: (err: any) => console.log('Error:', code, err)
        })
    };

    try {
        await getLeaderboard(req as any, res as any);
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

test();
