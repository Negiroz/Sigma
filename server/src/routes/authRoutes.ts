import { Router } from 'express';
import { login, register, verifyToken } from '../controllers/authController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.get('/verify', authenticateToken, verifyToken);

export default router;
