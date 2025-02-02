import { Types, Document } from 'mongoose';
import { IUsuario, ILibro, IMulta } from "../models/Biblioteca";

/**
 * Resultado de la operación de devolución
 */
export interface DevolucionResult {
    exito: boolean;
    mensaje: string;
    multa?: IMulta;
    depositoDevuelto?: number;
}

/**
 * Datos de verificación del estado del libro
 */
export interface VerificacionLibro {
    condicionPrevia: string;
    condicionNueva: 'nuevo' | 'bueno' | 'regular' | 'malo';
    dañado: boolean;
    descripcionDaño?: string;
}

// Tipo para el documento del préstamo populado
export interface PrestamoPopuladoDoc extends Document {
    _id: Types.ObjectId;
    libro: ILibro & { _id: Types.ObjectId };
    usuario: IUsuario & { _id: Types.ObjectId };
    tipo: 'prestamo' | 'alquiler';
    estado: 'activo' | 'atrasado' | 'devuelto' | 'perdido';
    fechas: {
        prestamo: Date;
        vencimiento: Date;
        devolucion?: Date;
    };
    costos: {
        alquiler?: number;
        deposito?: number;
        multa?: number;
        total: number;
    };
    renovaciones: Array<{
        fecha: Date;
        diasExtendidos: number;
        costoAdicional: number;
    }>;
    notas?: string;
    calcularDiasRetraso: () => number;
}