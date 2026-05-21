import prisma from './src/prisma';
import { resolveDailyVersus } from './src/controllers/versusController';

async function run() {
    console.log("Checking all historic matches for February 2026 to ensure proper scores...");

    // Find all matches in Feb 2026
    const febMatches = await prisma.versusMatch.findMany({
        where: {
            date: {
                gte: new Date('2026-02-01T00:00:00.000Z'),
                lt: new Date('2026-03-01T00:00:00.000Z')
            }
        },
        select: { date: true, companyId: true, status: true }
    });

    const combos = new Map();
    for (const match of febMatches) {
        const key = `${match.date.toISOString()}_${match.companyId}`;
        if (!combos.has(key)) {
            combos.set(key, { date: match.date, companyId: match.companyId });
        }
    }

    console.log(`Found ${combos.size} unique match days in February.`);

    // Set all feb matches to PENDING to reset them
    await prisma.versusMatch.updateMany({
        where: {
            date: {
                gte: new Date('2026-02-01T00:00:00.000Z'),
                lt: new Date('2026-03-01T00:00:00.000Z')
            }
        },
        data: { status: 'PENDING', winnerId: null }
    });

    // Re-resolve
    for (const combo of combos.values()) {
        console.log(`Re-Resolving for ${combo.date.toISOString()} and company ${combo.companyId}`);
        await resolveDailyVersus(combo.date, combo.companyId);
    }

    console.log("All February matches re-resolved successfully.");
}
run();
