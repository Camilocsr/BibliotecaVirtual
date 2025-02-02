import { Router } from 'express';
import { PrestamoController } from '../controllers/prestamoController';
import { verificarToken, esAdmin } from '../middleware/auth.middleware';

const router = Router();

router.get('/prestamos/usuario/:usuarioId', [verificarToken], PrestamoController.obtenerPrestamosUsuario);
router.get('/prestamos/:id', [verificarToken], PrestamoController.obtenerPrestamo);
router.get('/prestamos/:id/estado', [verificarToken], PrestamoController.verificarEstado);

router.post('/prestamos', [verificarToken], PrestamoController.crear);
router.post('/prestamos/:id/renovar', [verificarToken], PrestamoController.renovar);

router.put('/prestamos/:id/estado', [verificarToken, esAdmin], PrestamoController.actualizarEstado);

export default router;