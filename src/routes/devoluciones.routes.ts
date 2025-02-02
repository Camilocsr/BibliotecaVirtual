import { Router } from 'express';
import { DevolucionController } from '../controllers/DevolucionController';
import { verificarToken, esAdmin } from '../middleware/auth.middleware';

const router = Router();

router.get('/devoluciones/prestamo/:prestamoId', [verificarToken], DevolucionController.obtenerDevolucion);

router.post('/devoluciones/registrar', [verificarToken, esAdmin], DevolucionController.registrarDevolucion);

router.post('/devoluciones/prestamo/:prestamoId/verificar', [verificarToken], DevolucionController.verificarEstado);

export default router;