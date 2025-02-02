import { Prestamo, Multa, Usuario, Libro, IPrestamo, IMulta, ILibro } from '../../models/Biblioteca';
import mongoose from 'mongoose';

class SistemaDeMultas {
    /**
     * Calcula y genera multas automáticamente para préstamos atrasados
     * @param prestamo - El préstamo a verificar para multas
     * @returns Multa generada o null si no hay multa
     */
    static async generarMultaPorAtraso(prestamo: IPrestamo): Promise<IMulta | null> {
        // Calcular días de retraso
        const diasRetraso = prestamo.calcularDiasRetraso();

        if (diasRetraso <= 0) return null;

        // Configuración de tarifas de multa (configurable)
        const TARIFA_POR_DIA = 0.50; // 0.50 por día de retraso
        const MULTA_MAXIMA_PORCENTAJE = 0.5; // Máximo 50% del valor del libro

        // Obtener el libro para calcular el valor base
        const libro = await Libro.findById(prestamo.libro) as ILibro | null;
        if (!libro) throw new Error('Libro no encontrado');

        // Calcular monto de la multa
        const montoMulta = Math.min(
            diasRetraso * TARIFA_POR_DIA,
            libro.precio.compra * MULTA_MAXIMA_PORCENTAJE
        );

        // Crear nueva multa
        const nuevaMulta = new Multa({
            usuario: prestamo.usuario,
            prestamo: prestamo._id,
            tipo: 'atraso',
            monto: montoMulta,
            estado: 'pendiente',
            fechas: {
                emision: new Date(),
                vencimiento: this.calcularFechaVencimientoMulta(),
            },
            detalles: {
                diasAtraso: diasRetraso,
                descripcion: `Multa por ${diasRetraso} días de retraso en la devolución del libro ${libro.titulo}`
            }
        });

        // Guardar multa y actualizar usuario
        const multaGuardada = await nuevaMulta.save();
        await Usuario.findByIdAndUpdate(prestamo.usuario, {
            $push: { multas: multaGuardada._id }
        });

        return multaGuardada;
    }

    /**
     * Calcula la fecha de vencimiento de la multa (30 días después de la emisión)
     * @returns Fecha de vencimiento de la multa
     */
    static calcularFechaVencimientoMulta(diasAdicionales: number = 30): Date {
        const fechaVencimiento = new Date();
        fechaVencimiento.setDate(fechaVencimiento.getDate() + diasAdicionales);
        return fechaVencimiento;
    }

    /**
     * Procesa multas vencidas no pagadas
     */
    static async procesarMultasVencidas(): Promise<void> {
        const multasVencidas = await Multa.find({
            estado: 'pendiente',
            'fechas.vencimiento': { $lt: new Date() }
        });

        for (const multa of multasVencidas) {
            // Incrementar monto con intereses
            multa.monto *= 1.1; // 10% de recargo
            multa.detalles.descripcion += ' (Multa incrementada por vencimiento)';

            // Si el usuario tiene múltiples multas vencidas, considerar suspensión
            const multasUsuario = await Multa.countDocuments({
                usuario: multa.usuario,
                estado: 'pendiente'
            });

            if (multasUsuario > 2) {
                await Usuario.findByIdAndUpdate(multa.usuario, {
                    'estado.vetado': true,
                    'estado.razonVeto': 'Múltiples multas pendientes',
                    'estado.fechaFinVeto': this.calcularFechaVencimientoMulta(90) // Veto de 90 días
                });
            }

            await multa.save();
        }
    }

    /**
     * Permite el pago parcial o total de una multa
     * @param multaId - ID de la multa
     * @param montoPagado - Monto pagado
     * @returns Multa actualizada
     */
    static async pagarMulta(multaId: string, montoPagado: number): Promise<IMulta> {
        const multa = await Multa.findById(multaId);
        if (!multa) throw new Error('Multa no encontrada');

        if (multa.estado !== 'pendiente') {
            throw new Error('Solo se pueden pagar multas pendientes');
        }

        if (montoPagado > multa.monto) {
            throw new Error('El monto pagado no puede ser mayor al monto de la multa');
        }

        multa.monto -= montoPagado;

        if (multa.monto <= 0) {
            multa.estado = 'pagada';
            multa.fechas.pago = new Date();
        }

        return await multa.save();
    }

    /**
     * Genera multa por daño o pérdida de libro
     * @param prestamoId - ID del préstamo
     * @param tipoMulta - Tipo de multa (daño o pérdida)
     * @returns Multa generada
     */
    static async generarMultaPorDanioOPerdida(
        prestamoId: string,
        tipoMulta: 'daño' | 'perdida'
    ): Promise<IMulta> {
        const prestamo = await Prestamo.findById(prestamoId).populate('libro');
        if (!prestamo) throw new Error('Préstamo no encontrado');

        // Usar type assertion para asegurar que libro es de tipo ILibro
        const libro = prestamo.libro as ILibro;

        // Calcular monto de multa basado en el tipo
        const montoMulta = tipoMulta === 'perdida'
            ? libro.precio.compra  // Costo total del libro si se pierde
            : libro.precio.compra * 0.3;  // 30% del valor si está dañado

        const nuevaMulta = new Multa({
            usuario: prestamo.usuario,
            prestamo: prestamo._id,
            tipo: tipoMulta,
            monto: montoMulta,
            estado: 'pendiente',
            fechas: {
                emision: new Date(),
                vencimiento: this.calcularFechaVencimientoMulta()
            },
            detalles: {
                descripcion: tipoMulta === 'perdida'
                    ? `Multa por pérdida del libro ${libro.titulo}`
                    : `Multa por daño al libro ${libro.titulo}`
            }
        });

        // Actualizar estado del préstamo
        prestamo.estado = 'perdido';
        await prestamo.save();

        // Guardar multa y actualizar usuario
        const multaGuardada = await nuevaMulta.save();
        await Usuario.findByIdAndUpdate(prestamo.usuario, {
            $push: { multas: multaGuardada._id }
        });

        return multaGuardada;
    }

    /**
     * Genera un informe de multas para un usuario
     * @param usuarioId - ID del usuario
     * @returns Resumen de multas
     */
    static async generarInformeMultas(usuarioId: string): Promise<{
        multasPendientes: IMulta[],
        multasPagadas: IMulta[],
        totalPendiente: number,
        totalPagado: number
    }> {
        const multasPendientes = await Multa.find({
            usuario: usuarioId,
            estado: 'pendiente'
        }).populate('prestamo', 'libro');

        const multasPagadas = await Multa.find({
            usuario: usuarioId,
            estado: 'pagada'
        }).populate('prestamo', 'libro');

        return {
            multasPendientes,
            multasPagadas,
            totalPendiente: multasPendientes.reduce((total, multa) => total + multa.monto, 0),
            totalPagado: multasPagadas.reduce((total, multa) => total + multa.monto, 0)
        };
    }

    /**
     * Proceso de verificación y generación de multas diarias
     */
    static async procesoDiarioMultas(): Promise<void> {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            // Buscar préstamos atrasados
            const prestamosAtrasados = await Prestamo.find({
                estado: 'activo',
                'fechas.vencimiento': { $lt: new Date() }
            });

            // Generar multas para cada préstamo atrasado
            for (const prestamo of prestamosAtrasados) {
                await this.generarMultaPorAtraso(prestamo);

                // Actualizar estado del préstamo a 'atrasado'
                prestamo.estado = 'atrasado';
                await prestamo.save();
            }

            // Procesar multas vencidas
            await this.procesarMultasVencidas();

            await session.commitTransaction();
        } catch (error) {
            await session.abortTransaction();
            console.error('Error en proceso diario de multas:', error);
        } finally {
            session.endSession();
        }
    }
}

export default SistemaDeMultas;