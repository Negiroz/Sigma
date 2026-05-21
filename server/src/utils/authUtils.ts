import prisma from '../prisma';

export const getBranchFilter = async (userId: number, role: string, companyId?: number) => {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { managedBranches: true }
    });

    if (role === 'MANAGER' && user?.managedBranches) {
        const branchIds = user.managedBranches.map(b => b.id);
        return { id: { in: branchIds } };
    }

    if (companyId) {
        return { companyId };
    }

    return {};
};

export const getEmployeeBranchFilter = async (userId: number, role: string, companyId?: number) => {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { managedBranches: true }
    });

    if (role === 'MANAGER' && user?.managedBranches) {
        const branchIds = user.managedBranches.map(b => b.id);
        return { branchId: { in: branchIds } };
    }

    if (companyId) {
        return { companyId };
    }

    return {};
};
