import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../prisma';

export const register = async (req: Request, res: Response): Promise<void> => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            res.status(400).json({ error: 'Username and password are required' });
            return;
        }

        const existingUser = await prisma.user.findUnique({ where: { username } });
        if (existingUser) {
            res.status(400).json({ error: 'Username already exists' });
            return;
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await prisma.user.create({
            data: {
                username,
                password: hashedPassword,
                // Default role is USER, no company initially
            },
        });

        res.status(201).json({ message: 'User registered successfully', userId: user.id });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const login = async (req: Request, res: Response): Promise<void> => {
    try {
        const { username, password } = req.body;

        console.log(`Login attempt for username: ${username}`);
        const user = await prisma.user.findUnique({ where: { username } });
        if (!user) {
            console.log(`Login failed: user ${username} not found`);
            res.status(401).json({ error: 'Invalid credentials' });
            return;
        }

        const isMatch = await bcrypt.compare(password, user.password);
        console.log(`Password match for ${username}: ${isMatch}`);
        if (!isMatch) {
            console.log(`Login failed: incorrect password for ${username}`);
            res.status(401).json({ error: 'Invalid credentials' });
            return;
        }

        const token = jwt.sign(
            { userId: user.id, username: user.username, role: user.role },
            process.env.JWT_SECRET as string,
            { expiresIn: '8h' }
        );

        const userWithCompany = await prisma.user.findUnique({
            where: { id: user.id },
            include: { company: true }
        });

        res.json({
            token,
            user: {
                id: user.id,
                username: user.username,
                role: user.role,
                companyName: userWithCompany?.company?.name,
                companyId: userWithCompany?.company?.id
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error', details: (error as Error).message });
    }
};

export const verifyToken = async (req: Request, res: Response): Promise<void> => {
    // req.user is set by authenticateToken middleware
    const user = (req as any).user;
    if (!user) {
        res.status(401).json({ valid: false });
        return;
    }
    // Optionally fetch fresh user data including company
    try {
        const userDb = await prisma.user.findUnique({
            where: { id: user.userId },
            include: { company: true }
        });

        if (!userDb) {
            res.status(401).json({ valid: false });
            return;
        }

        res.json({
            valid: true,
            user: {
                id: userDb.id,
                username: userDb.username,
                role: userDb.role,
                companyName: userDb.company?.name,
                companyId: userDb.company?.id
            }
        });
    } catch (e) {
        console.error('Verify error:', e);
        res.status(500).json({ error: 'Internal server error' });
    }
};
