import { Request, Response } from 'express';
import { SistemaDevoluciones } from '../services/app/SistemaDevoluciones';
import { getErrorMessage } from '../utils/errors/getErrorMessage';
import { Types } from 'mongoose';
import { Prestamo } from '../models/Biblioteca';

export class DevolucionController {
    /**
     * Registra la devolución de un libro
     */
    static async registrarDevolucion(req: Request, res: Response): Promise<void> {
        try {
            const { prestamoId, verificacionLibro } = req.body;

            if (!Types.ObjectId.isValid(prestamoId)) {
                res.status(400).json({
                    mensaje: 'ID de préstamo inválido'
                });
                return;
            }

            const resultado = await SistemaDevoluciones.registrarDevolucion(
                new Types.ObjectId(prestamoId),
                verificacionLibro
            );

            if (!resultado.exito) {
                res.status(400).json(resultado);
                return;
            }

            res.json(resultado);
        } catch (error) {
            res.status(500).json({
                mensaje: 'Error al procesar la devolución',
                error: getErrorMessage(error)
            });
        }
    }

    /**
     * Obtiene los detalles de una devolución
     */
    static async obtenerDevolucion(req: Request, res: Response): Promise<void> {
        try {
            const { prestamoId } = req.params;

            if (!Types.ObjectId.isValid(prestamoId)) {
                res.status(400).json({
                    mensaje: 'ID de préstamo inválido'
                });
                return;
            }

            const prestamo = await Prestamo.findById(prestamoId)
                .populate('libro')
                .populate('usuario');

            if (!prestamo) {
                res.status(404).json({
                    mensaje: 'Préstamo no encontrado'
                });
                return;
            }

            res.json(prestamo);
        } catch (error) {
            res.status(500).json({
                mensaje: 'Error al obtener la devolución',
                error: getErrorMessage(error)
            });
        }
    }

    /**
     * Verifica el estado de un préstamo para su devolución
     */
    static async verificarEstado(req: Request, res: Response): Promise<void> {
        try {
            const { prestamoId } = req.params;

            if (!Types.ObjectId.isValid(prestamoId)) {
                res.status(400).json({
                    mensaje: 'ID de préstamo inválido'
                });
                return;
            }

            const prestamo = await Prestamo.findById(prestamoId)
                .populate('libro');

            if (!prestamo) {
                res.status(404).json({
                    mensaje: 'Préstamo no encontrado'
                });
                return;
            }

            const diasRetraso = prestamo.calcularDiasRetraso();
            const estaRetrasado = diasRetraso > 0;

            res.json({
                prestamo,
                diasRetraso,
                estaRetrasado,
                costos: {
                    multaPotencial: estaRetrasado ? diasRetraso * 100 : 0, // TASA_MULTA_DIARIA
                    depositoDevolver: prestamo.tipo === 'alquiler' ? prestamo.costos.deposito : 0
                }
            });
        } catch (error) {
            res.status(500).json({
                mensaje: 'Error al verificar estado del préstamo',
                error: getErrorMessage(error)
            });
        }
    }
}