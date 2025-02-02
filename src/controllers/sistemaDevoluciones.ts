import { Types, Document } from 'mongoose';
import {
    IMulta,
    ILibro,
    IUsuario,
    Prestamo,
    Libro,
    Multa
} from '../models/Biblioteca';
import {
    VerificacionLibro,
    DevolucionResult,
    PrestamoPopuladoDoc
} from '../@types/sistemaDevoluciones';

/**
 * Sistema de gestión de devoluciones de la biblioteca
 */
export class SistemaDevoluciones {
    private static TASA_MULTA_DIARIA = 100; // Pesos por día de retraso
    private static TASA_MULTA_DAÑO = 0.5; // 50% del valor del libro
    private static DIAS_PAGAR_MULTA = 7; // Días para pagar la multa

    /**
     * Procesa la devolución de un libro
     */
    public static async registrarDevolucion(
        prestamoId: string | Types.ObjectId,
        verificacionLibro: VerificacionLibro
    ): Promise<DevolucionResult> {
        try {
            const prestamoObj = typeof prestamoId === 'string' ? new Types.ObjectId(prestamoId) : prestamoId;

            const prestamo = await Prestamo.findById(prestamoObj)
                .populate<{ libro: ILibro & Document }>('libro')
                .populate<{ usuario: IUsuario & Document }>('usuario')
                .exec() as PrestamoPopuladoDoc | null;

            if (!prestamo) {
                return {
                    exito: false,
                    mensaje: 'Préstamo no encontrado'
                };
            }

            if (prestamo.estado === 'devuelto') {
                return {
                    exito: false,
                    mensaje: 'Este préstamo ya fue devuelto'
                };
            }

            let multa: IMulta | undefined;
            let depositoADevolver = 0;

            const diasRetraso = prestamo.calcularDiasRetraso();
            if (diasRetraso > 0) {
                multa = await this.generarMultaRetraso(prestamo._id, prestamo.usuario._id, diasRetraso);
            }

            if (verificacionLibro.dañado) {
                multa = await this.generarMultaDaño(
                    prestamo._id,
                    prestamo.usuario._id,
                    verificacionLibro.descripcionDaño || 'Daño no especificado',
                    prestamo.libro.precio.compra
                );
            }

            await this.actualizarEstadoLibro(
                prestamo.libro._id,
                verificacionLibro
            );

            if (prestamo.tipo === 'alquiler' && !verificacionLibro.dañado) {
                depositoADevolver = prestamo.costos.deposito || 0;
            }

            prestamo.estado = 'devuelto';
            prestamo.fechas.devolucion = new Date();
            await prestamo.save();

            await this.actualizarInventario(prestamo.libro._id);

            return {
                exito: true,
                mensaje: 'Devolución procesada exitosamente',
                multa,
                depositoDevuelto: depositoADevolver
            };
        } catch (error) {
            console.error('Error en la devolución:', error);
            return {
                exito: false,
                mensaje: error instanceof Error ? error.message : 'Error al procesar la devolución'
            };
        }
    }

    /**
     * Genera una multa por retraso en la devolución
     */
    private static async generarMultaRetraso(
        prestamoId: Types.ObjectId,
        usuarioId: Types.ObjectId,
        diasRetraso: number
    ): Promise<IMulta> {
        const montoMulta = diasRetraso * this.TASA_MULTA_DIARIA;

        const multa = new Multa({
            usuario: usuarioId,
            prestamo: prestamoId,
            tipo: 'atraso',
            monto: montoMulta,
            estado: 'pendiente',
            fechas: {
                emision: new Date(),
                vencimiento: new Date(Date.now() + this.DIAS_PAGAR_MULTA * 24 * 60 * 60 * 1000)
            },
            detalles: {
                diasAtraso: diasRetraso,
                descripcion: `Retraso de ${diasRetraso} días en la devolución`
            }
        });

        await multa.save();
        return multa;
    }

    /**
     * Genera una multa por daños al libro
     */
    private static async generarMultaDaño(
        prestamoId: Types.ObjectId,
        usuarioId: Types.ObjectId,
        descripcion: string,
        precioLibro: number
    ): Promise<IMulta> {
        const montoMulta = precioLibro * this.TASA_MULTA_DAÑO;

        const multa = new Multa({
            usuario: usuarioId,
            prestamo: prestamoId,
            tipo: 'daño',
            monto: montoMulta,
            estado: 'pendiente',
            fechas: {
                emision: new Date(),
                vencimiento: new Date(Date.now() + this.DIAS_PAGAR_MULTA * 24 * 60 * 60 * 1000)
            },
            detalles: {
                descripcion
            }
        });

        await multa.save();
        return multa;
    }

    /**
     * Actualiza el estado físico del libro
     */
    private static async actualizarEstadoLibro(
        libroId: Types.ObjectId,
        verificacion: VerificacionLibro
    ): Promise<void> {
        const libro = await Libro.findById(libroId);
        if (!libro) throw new Error('Libro no encontrado');

        libro.estado.condicion = verificacion.condicionNueva;
        await libro.save();
    }

    /**
     * Actualiza el inventario del libro
     */
    private static async actualizarInventario(
        libroId: Types.ObjectId
    ): Promise<void> {
        const libro = await Libro.findById(libroId);
        if (!libro) throw new Error('Libro no encontrado');

        libro.inventario.disponible += 1;
        libro.inventario.prestados -= 1;

        if (libro.inventario.disponible > libro.inventario.total) {
            throw new Error('Error en el inventario: disponible no puede ser mayor que el total');
        }

        if (libro.inventario.prestados < 0) {
            throw new Error('Error en el inventario: prestados no puede ser negativo');
        }

        await libro.save();
    }
}

export type { DevolucionResult, VerificacionLibro };