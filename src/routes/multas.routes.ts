import { Router } from 'express';
import { MultasController } from '../controllers/multasController';
import { verificarToken } from '../middleware/auth.middleware';

const router = Router();

router.get('/multas/informe/:usuarioId', [verificarToken], MultasController.generarInformeMultas);

router.post('/multas/pagar', [verificarToken], MultasController.pagarMulta);

router.post('/multas/generar-por-libro', [verificarToken], MultasController.generarMultaPorDanioOPerdida);

router.post('/multas/proceso-diario', [verificarToken], MultasController.procesoDiarioMultas);

export default router;