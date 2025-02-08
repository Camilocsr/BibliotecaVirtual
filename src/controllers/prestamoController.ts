import { Request, Response } from 'express';
import {
    Libro,
    Prestamo,
    Usuario,
    IUsuario,
    ILibro,
    IMulta
} from '../models/Biblioteca';
import { getErrorMessage } from '../utils/errors/getErrorMessage';
import { Types } from 'mongoose';

interface IUsuarioPopulado extends Omit<IUsuario, 'multas'> {
    multas: IMulta[];
}

export class PrestamoController {
    static async obtenerPrestamosUsuario(req: Request, res: Response): Promise<void> {
        try {
            const { identificador } = req.params; // puede ser ID o email

            // Determinar si el identificador es un ID válido de MongoDB
            const esMongoId = Types.ObjectId.isValid(identificador);

            // Buscar el usuario por ID o email
            let usuario;
            if (esMongoId) {
                usuario = await Usuario.findById(identificador);
            } else {
                usuario = await Usuario.findOne({ email: identificador });
            }

            if (!usuario) {
                res.status(404).json({
                    mensaje: 'Usuario no encontrado'
                });
                return;
            }

            // Buscar los préstamos usando el ID del usuario
            const prestamos = await Prestamo.find({ usuario: usuario._id })
                .populate<{ libro: ILibro }>('libro')
                .sort({ 'fechas.prestamo': -1 });

            res.json(prestamos);
        } catch (error: unknown) {
            res.status(500).json({
                mensaje: 'Error al obtener préstamos del usuario',
                error: getErrorMessage(error)
            });
        }
    }

    static async obtenerPrestamo(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const prestamo = await Prestamo.findById(id)
                .populate<{ libro: ILibro }>('libro')
                .populate<{ usuario: IUsuario }>('usuario');

            if (!prestamo) {
                res.status(404).json({
                    mensaje: 'Préstamo no encontrado'
                });
                return;
            }

            res.json(prestamo);
        } catch (error: unknown) {
            res.status(500).json({
                mensaje: 'Error al obtener el préstamo',
                error: getErrorMessage(error)
            });
        }
    }

    static async crear(req: Request, res: Response): Promise<void> {
        console.log(`Datos del préstamo recibidos: ${JSON.stringify(req.body)}`);
        try {
            const {
                usuarioId,
                email,
                libroId,
                tipo,
                diasPrestamo = 14
            } = req.body;

            // Buscar usuario por ID o email
            let usuario: IUsuarioPopulado | null = null;

            if (usuarioId) {
                usuario = await Usuario.findById(usuarioId)
                    .populate<{ multas: IMulta[] }>('multas') as IUsuarioPopulado;
            } else if (email) {
                usuario = await Usuario.findOne({ email })
                    .populate<{ multas: IMulta[] }>('multas') as IUsuarioPopulado;
            }

            if (!usuario) {
                res.status(404).json({
                    mensaje: 'Usuario no encontrado. Proporcione un ID o email válido.'
                });
                return;
            }

            if (!usuario.estaActivo()) {
                res.status(400).json({ mensaje: 'Usuario no está activo o está vetado' });
                return;
            }

            // Verificar multas pendientes
            if (usuario.multas.some(multa => multa.estado === 'pendiente')) {
                res.status(400).json({ mensaje: 'Usuario tiene multas pendientes' });
                return;
            }

            const libro = await Libro.findById(libroId);
            if (!libro) {
                res.status(404).json({ mensaje: 'Libro no encontrado' });
                return;
            }

            if (!libro.estaDisponible()) {
                res.status(400).json({ mensaje: 'Libro no disponible actualmente' });
                return;
            }

            const prestamosActivos = await Prestamo.countDocuments({
                usuario: usuario._id,
                estado: { $in: ['activo', 'atrasado'] }
            });

            const LIMITE_PRESTAMOS = 3;
            if (prestamosActivos >= LIMITE_PRESTAMOS) {
                res.status(400).json({
                    mensaje: `Usuario ha alcanzado el límite de ${LIMITE_PRESTAMOS} préstamos activos`
                });
                return;
            }

            const fechaPrestamo = new Date();
            const fechaVencimiento = new Date();
            fechaVencimiento.setDate(fechaVencimiento.getDate() + diasPrestamo);

            let costos = {
                alquiler: 0,
                deposito: 0,
                total: 0
            };

            if (tipo === 'alquiler') {
                costos.alquiler = libro.precio.alquiler.diario * diasPrestamo;
                costos.deposito = libro.precio.alquiler.deposito;
                costos.total = costos.alquiler + costos.deposito;
            }

            const nuevoPrestamo = new Prestamo({
                usuario: usuario._id,
                libro: new Types.ObjectId(libroId),
                tipo,
                estado: 'activo',
                fechas: {
                    prestamo: fechaPrestamo,
                    vencimiento: fechaVencimiento
                },
                costos,
                renovaciones: []
            });

            libro.inventario.disponible -= 1;
            libro.inventario.prestados += 1;

            await Promise.all([
                nuevoPrestamo.save(),
                libro.save(),
                Usuario.findByIdAndUpdate(usuario._id, {
                    $push: { prestamos: nuevoPrestamo._id }
                })
            ]);

            res.status(201).json({
                mensaje: tipo === 'prestamo' ? 'Préstamo realizado con éxito' : 'Alquiler realizado con éxito',
                prestamo: {
                    ...nuevoPrestamo.toObject(),
                    libro: libro.toObject()
                }
            });
        } catch (error: unknown) {
            res.status(500).json({
                mensaje: 'Error al crear el préstamo/alquiler',
                error: getErrorMessage(error)
            });
        }
    }

    static async renovar(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const { diasExtension = 7 } = req.body;

            const prestamo = await Prestamo.findById(id)
                .populate<{ libro: ILibro }>('libro');

            if (!prestamo) {
                res.status(404).json({ mensaje: 'Préstamo no encontrado' });
                return;
            }

            if (prestamo.estado !== 'activo') {
                res.status(400).json({ mensaje: 'Solo préstamos activos pueden ser renovados' });
                return;
            }

            const MAX_RENOVACIONES = 2;
            if (prestamo.renovaciones.length >= MAX_RENOVACIONES) {
                res.status(400).json({ mensaje: 'Se ha alcanzado el límite de renovaciones' });
                return;
            }

            const costoRenovacion = prestamo.tipo === 'alquiler' ?
                prestamo.libro.precio.alquiler.diario * diasExtension : 0;

            const nuevaFechaVencimiento = new Date(prestamo.fechas.vencimiento);
            nuevaFechaVencimiento.setDate(nuevaFechaVencimiento.getDate() + diasExtension);

            const renovacion = {
                fecha: new Date(),
                diasExtendidos: diasExtension,
                costoAdicional: costoRenovacion
            };

            prestamo.fechas.vencimiento = nuevaFechaVencimiento;
            prestamo.renovaciones.push(renovacion);
            if (costoRenovacion > 0) {
                prestamo.costos.alquiler = (prestamo.costos.alquiler || 0) + costoRenovacion;
                prestamo.costos.total += costoRenovacion;
            }

            await prestamo.save();

            res.json({
                mensaje: 'Préstamo renovado exitosamente',
                prestamo
            });
        } catch (error: unknown) {
            res.status(500).json({
                mensaje: 'Error al renovar el préstamo',
                error: getErrorMessage(error)
            });
        }
    }

    static async verificarEstado(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const prestamo = await Prestamo.findById(id)
                .populate<{ libro: ILibro }>('libro');

            if (!prestamo) {
                res.status(404).json({ mensaje: 'Préstamo no encontrado' });
                return;
            }

            const hoy = new Date();
            if (prestamo.estado === 'activo' && hoy > prestamo.fechas.vencimiento) {
                prestamo.estado = 'atrasado';
                await prestamo.save();
            }

            const diasRetraso = prestamo.calcularDiasRetraso();

            res.json({
                prestamo,
                diasRetraso
            });
        } catch (error: unknown) {
            res.status(500).json({
                mensaje: 'Error al verificar estado del préstamo',
                error: getErrorMessage(error)
            });
        }
    }

    static async actualizarEstado(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const { estado, notas } = req.body;

            const prestamo = await Prestamo.findById(id);
            if (!prestamo) {
                res.status(404).json({ mensaje: 'Préstamo no encontrado' });
                return;
            }

            prestamo.estado = estado;
            if (notas) prestamo.notas = notas;

            await prestamo.save();

            res.json({
                mensaje: 'Estado actualizado exitosamente',
                prestamo
            });
        } catch (error: unknown) {
            res.status(500).json({
                mensaje: 'Error al actualizar estado del préstamo',
                error: getErrorMessage(error)
            });
        }
    }
}