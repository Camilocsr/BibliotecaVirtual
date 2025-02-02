import { Request, Response } from 'express';
import SistemaDeMultas from '../services/app/multas'; // Adjust import path as needed

export class MultasController {
    /**
     * Genera un informe de multas para un usuario específico
     * @route GET /multas/informe/:usuarioId
     */
    static async generarInformeMultas(req: Request, res: Response): Promise<void> {
        try {
            const usuarioId = req.params.usuarioId;

            // Validar que se proporcione un ID de usuario
            if (!usuarioId) {
                res.status(400).json({
                    message: 'Se requiere un ID de usuario válido'
                });
                return;
            }

            const informeMultas = await SistemaDeMultas.generarInformeMultas(usuarioId);

            res.status(200).json({
                message: 'Informe de multas generado exitosamente',
                data: informeMultas
            });
        } catch (error) {
            console.error('Error al generar informe de multas:', error);
            res.status(500).json({
                message: 'Error al generar informe de multas',
                error: error instanceof Error ? error.message : 'Error desconocido'
            });
        }
    }

    /**
     * Pagar una multa específica
     * @route POST /multas/pagar
     */
    static async pagarMulta(req: Request, res: Response): Promise<void> {
        try {
            const { multaId, montoPagado } = req.body;

            // Validaciones
            if (!multaId || montoPagado === undefined) {
                res.status(400).json({
                    message: 'Se requiere ID de multa y monto a pagar'
                });
                return;
            }

            // Convertir montoPagado a número para evitar problemas de tipo
            const monto = Number(montoPagado);
            if (isNaN(monto) || monto <= 0) {
                res.status(400).json({
                    message: 'Monto de pago inválido'
                });
                return;
            }

            const multaActualizada = await SistemaDeMultas.pagarMulta(multaId, monto);

            res.status(200).json({
                message: 'Multa pagada exitosamente',
                data: multaActualizada
            });
        } catch (error) {
            console.error('Error al pagar multa:', error);
            res.status(500).json({
                message: 'Error al procesar el pago de la multa',
                error: error instanceof Error ? error.message : 'Error desconocido'
            });
        }
    }

    /**
     * Genera multa por daño o pérdida de libro
     * @route POST /multas/generar-por-libro
     */
    static async generarMultaPorDanioOPerdida(req: Request, res: Response): Promise<void> {
        try {
            const { prestamoId, tipoMulta } = req.body;

            // Validaciones
            if (!prestamoId || !['daño', 'perdida'].includes(tipoMulta)) {
                res.status(400).json({
                    message: 'ID de préstamo inválido o tipo de multa incorrecto'
                });
                return;
            }

            const nuevaMulta = await SistemaDeMultas.generarMultaPorDanioOPerdida(
                prestamoId,
                tipoMulta as 'daño' | 'perdida'
            );

            res.status(201).json({
                message: 'Multa generada exitosamente',
                data: nuevaMulta
            });
        } catch (error) {
            console.error('Error al generar multa por daño/pérdida:', error);
            res.status(500).json({
                message: 'Error al generar multa por daño o pérdida de libro',
                error: error instanceof Error ? error.message : 'Error desconocido'
            });
        }
    }

    /**
     * Proceso diario de multas (puede ser usado por un cron job)
     * @route POST /multas/proceso-diario
     */
    static async procesoDiarioMultas(req: Request, res: Response): Promise<void> {
        try {
            await SistemaDeMultas.procesoDiarioMultas();

            res.status(200).json({
                message: 'Proceso diario de multas completado exitosamente'
            });
        } catch (error) {
            console.error('Error en proceso diario de multas:', error);
            res.status(500).json({
                message: 'Error en el proceso diario de multas',
                error: error instanceof Error ? error.message : 'Error desconocido'
            });
        }
    }
}