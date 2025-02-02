import { Router } from 'express';
import { authHandler } from '../controllers/auth.controllers';
import { verificarToken } from '../middleware/auth.middleware';

const router = Router();

router.post('/login/google', authHandler.loginWithGoogle);
router.get('/validar', verificarToken, authHandler.validarToken);
router.post('/logout', verificarToken, authHandler.logout);

export default router;