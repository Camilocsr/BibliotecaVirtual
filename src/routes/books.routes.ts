import { Router } from 'express';
import { LibroController } from '../controllers/LibroController';
import { verificarToken, esAdmin } from '../middleware/auth.middleware';
import MulterService from '../services/multerService';

const router = Router();

router.get('/libros', LibroController.obtenerTodos);
router.get('/libros/paginacion', LibroController.obtenerLibrosPaginacion);
router.get('/libros/buscar', LibroController.busquedaAvanzada);
router.get('/libros/:id', LibroController.obtenerPorId);

router.post('/libros', [verificarToken, esAdmin, MulterService.uploadFile], LibroController.crear);
router.put('/libros/:id', [verificarToken, esAdmin], LibroController.actualizar);
router.delete('/libros/:id', [verificarToken, esAdmin], LibroController.eliminar);
router.put('/libros/:id/inventario', [verificarToken, esAdmin], LibroController.actualizarInventario);

export default router;