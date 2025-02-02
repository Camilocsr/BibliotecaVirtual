import { Schema, model, Document, Types } from 'mongoose';

// Interfaces base sin Document
interface IUsuarioBase {
    email: string;
    googleId: string;
    rol: 'admin' | 'usuario';
    nombre: string;
    apellido: string;
    dni: string;
    telefono: string;
    direccion: {
        calle: string;
        ciudad: string;
        provincia: string;
        codigoPostal: string;
    };
    estado: {
        activo: boolean;
        vetado: boolean;
        razonVeto?: string;
        fechaFinVeto?: Date;
    };
    prestamos: Types.ObjectId[];
    multas: Types.ObjectId[];
    tokenJWT?: string;
    fechaUltimoAcceso?: Date;
}

interface ILibroBase {
    isbn: string;
    titulo: string;
    autor: string;
    editorial: string;
    añoPublicacion: number;
    generos: string[];
    idioma: string;
    descripcion: string;
    ubicacion: {
        seccion: string;
        estante: string;
        nivel: number;
    };
    inventario: {
        total: number;
        disponible: number;
        prestados: number;
        reservados: number;
    };
    precio: {
        compra: number;
        alquiler: {
            diario: number;
            deposito: number;
        };
    };
    estado: {
        activo: boolean;
        condicion: 'nuevo' | 'bueno' | 'regular' | 'malo';
    };
    portada?: string;
    palabrasClave: string[];
}

interface IPrestamoBase {
    usuario: Types.ObjectId;
    libro: Types.ObjectId | ILibro;
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
    renovaciones: {
        fecha: Date;
        diasExtendidos: number;
        costoAdicional: number;
    }[];
    notas?: string;
}

interface IMultaBase {
    usuario: Types.ObjectId;
    prestamo: Types.ObjectId;
    tipo: 'atraso' | 'daño' | 'perdida';
    monto: number;
    estado: 'pendiente' | 'pagada' | 'perdonada';
    fechas: {
        emision: Date;
        vencimiento: Date;
        pago?: Date;
    };
    detalles: {
        diasAtraso?: number;
        descripcion?: string;
    };
}

// Interfaces con Document
export interface IUsuario extends IUsuarioBase, Document {
    estaActivo: () => boolean;
}

export interface ILibro extends ILibroBase, Document {
    estaDisponible: () => boolean;
}

export interface IPrestamo extends IPrestamoBase, Document {
    calcularDiasRetraso: () => number;
}

export interface IMulta extends IMultaBase, Document {
    calcularSaldoPendiente: () => number;
}

// Interface para préstamo populado
export interface IPrestamoPopulado extends Omit<IPrestamoBase, 'libro' | 'usuario'>, Document {
    libro: ILibro;
    usuario: IUsuario;
    calcularDiasRetraso: () => number;
}

export interface IPrestamoUsuarioPopulado extends Omit<IPrestamoBase, 'usuario'> {
    _id: Types.ObjectId;
    usuario: IUsuario;  // Cambio clave aquí
    libro: Types.ObjectId;
    calcularDiasRetraso(): number;
}

export interface IPrestamoLibroPopulado extends Omit<IPrestamoBase, 'libro'>, Document {
    libro: Document<unknown, any, ILibro> & ILibro;
    usuario: Types.ObjectId;
    calcularDiasRetraso: () => number;
}

const usuarioSchema = new Schema<IUsuario>({
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        index: true
    },
    googleId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    rol: {
        type: String,
        enum: ['admin', 'usuario'],
        default: 'usuario'
    },
    nombre: {
        type: String,
        required: true,
        trim: true
    },
    apellido: {
        type: String,
        required: true,
        trim: true
    },
    dni: {
        type: String,
        required: false,
        unique: true,
        trim: true,
        index: true,
        sparse: true
    },
    telefono: {
        type: String,
        trim: true
    },
    direccion: {
        calle: String,
        ciudad: String,
        provincia: String,
        codigoPostal: String
    },
    estado: {
        activo: { type: Boolean, default: true },
        vetado: { type: Boolean, default: false },
        razonVeto: String,
        fechaFinVeto: Date
    },
    prestamos: [{
        type: Schema.Types.ObjectId,
        ref: 'Prestamo'
    }],
    multas: [{
        type: Schema.Types.ObjectId,
        ref: 'Multa'
    }],
    tokenJWT: String,
    fechaUltimoAcceso: Date
}, {
    timestamps: true,
    versionKey: false
});

const libroSchema = new Schema<ILibro>({
    isbn: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        index: true
    },
    titulo: {
        type: String,
        required: true,
        trim: true,
        index: true
    },
    autor: {
        type: String,
        required: true,
        trim: true,
        index: true
    },
    editorial: {
        type: String,
        required: true,
        trim: true
    },
    añoPublicacion: {
        type: Number,
        required: true,
        index: true
    },
    generos: [{
        type: String,
        trim: true,
        index: true
    }],
    idioma: {
        type: String,
        required: true,
        trim: true
    },
    descripcion: {
        type: String,
        trim: true
    },
    ubicacion: {
        seccion: {
            type: String,
            required: true,
            uppercase: true
        },
        estante: {
            type: String,
            required: true,
            uppercase: true
        },
        nivel: {
            type: Number,
            required: true,
            min: 1
        }
    },
    inventario: {
        total: {
            type: Number,
            required: true,
            min: 0
        },
        disponible: {
            type: Number,
            required: true,
            min: 0
        },
        prestados: {
            type: Number,
            default: 0,
            min: 0
        },
        reservados: {
            type: Number,
            default: 0,
            min: 0
        }
    },
    precio: {
        compra: {
            type: Number,
            required: true,
            min: 0
        },
        alquiler: {
            diario: {
                type: Number,
                required: true,
                min: 0
            },
            deposito: {
                type: Number,
                required: true,
                min: 0
            }
        }
    },
    estado: {
        activo: {
            type: Boolean,
            default: true
        },
        condicion: {
            type: String,
            enum: ['nuevo', 'bueno', 'regular', 'malo'],
            required: true,
            default: 'nuevo'
        }
    },
    portada: {
        type: String,
        default: 'default-book-cover.jpg'
    },
    palabrasClave: [{
        type: String,
        trim: true,
        lowercase: true
    }]
}, {
    timestamps: true,
    versionKey: false
});

const prestamoSchema = new Schema<IPrestamo>({
    usuario: {
        type: Schema.Types.ObjectId,
        ref: 'Usuario',
        required: true,
        index: true
    },
    libro: {
        type: Schema.Types.ObjectId,
        ref: 'Libro',
        required: true,
        index: true
    },
    tipo: {
        type: String,
        enum: ['prestamo', 'alquiler'],
        required: true,
        index: true
    },
    estado: {
        type: String,
        enum: ['activo', 'atrasado', 'devuelto', 'perdido'],
        default: 'activo',
        index: true
    },
    fechas: {
        prestamo: {
            type: Date,
            required: true,
            default: Date.now
        },
        vencimiento: {
            type: Date,
            required: true,
            index: true
        },
        devolucion: Date
    },
    costos: {
        alquiler: {
            type: Number,
            min: 0
        },
        deposito: {
            type: Number,
            min: 0
        },
        multa: {
            type: Number,
            min: 0
        },
        total: {
            type: Number,
            required: true,
            min: 0
        }
    },
    renovaciones: [{
        fecha: Date,
        diasExtendidos: {
            type: Number,
            min: 1
        },
        costoAdicional: {
            type: Number,
            min: 0
        }
    }],
    notas: {
        type: String,
        trim: true
    }
}, {
    timestamps: true,
    versionKey: false
});

const multaSchema = new Schema<IMulta>({
    usuario: {
        type: Schema.Types.ObjectId,
        ref: 'Usuario',
        required: true,
        index: true
    },
    prestamo: {
        type: Schema.Types.ObjectId,
        ref: 'Prestamo',
        required: true,
        index: true
    },
    tipo: {
        type: String,
        enum: ['atraso', 'daño', 'perdida'],
        required: true,
        index: true
    },
    monto: {
        type: Number,
        required: true,
        min: 0
    },
    estado: {
        type: String,
        enum: ['pendiente', 'pagada', 'perdonada'],
        default: 'pendiente',
        index: true
    },
    fechas: {
        emision: {
            type: Date,
            required: true,
            default: Date.now
        },
        vencimiento: {
            type: Date,
            required: true,
            index: true
        },
        pago: Date
    },
    detalles: {
        diasAtraso: {
            type: Number,
            min: 0
        },
        descripcion: {
            type: String,
            trim: true
        }
    }
}, {
    timestamps: true,
    versionKey: false
});

// Índices
usuarioSchema.index({ 'estado.activo': 1, 'estado.vetado': 1 });
libroSchema.index({ titulo: 'text', autor: 'text', descripcion: 'text', palabrasClave: 'text' });
prestamoSchema.index({ 'fechas.vencimiento': 1, estado: 1 });
multaSchema.index({ 'fechas.vencimiento': 1, estado: 1 });

// Métodos de instancia
usuarioSchema.methods.estaActivo = function (): boolean {
    return this.estado.activo && !this.estado.vetado;
};

libroSchema.methods.estaDisponible = function (): boolean {
    return this.inventario.disponible > 0 && this.estado.activo;
};

prestamoSchema.methods.calcularDiasRetraso = function (): number {
    if (this.estado === 'devuelto') return 0;
    const hoy = new Date();
    if (hoy > this.fechas.vencimiento) {
        return Math.ceil((hoy.getTime() - this.fechas.vencimiento.getTime()) / (1000 * 60 * 60 * 24));
    }
    return 0;
};

multaSchema.methods.calcularSaldoPendiente = function (): number {
    if (this.estado === 'perdonada') return 0;
    if (this.estado === 'pagada') return 0;
    return this.monto;
};

// Middlewares
usuarioSchema.pre('save', function (next) {
    if (this.estado.vetado && this.estado.fechaFinVeto && this.estado.fechaFinVeto < new Date()) {
        this.estado.vetado = false;
        this.estado.razonVeto = undefined;
        this.estado.fechaFinVeto = undefined;
    }
    next();
});

libroSchema.pre('save', function (next) {
    if (this.inventario.disponible + this.inventario.prestados + this.inventario.reservados !== this.inventario.total) {
        next(new Error('El inventario no cuadra con el total de libros'));
    }
    next();
});

// Modelos
export const Usuario = model<IUsuario>('Usuario', usuarioSchema);
export const Libro = model<ILibro>('Libro', libroSchema);
export const Prestamo = model<IPrestamo>('Prestamo', prestamoSchema);
export const Multa = model<IMulta>('Multa', multaSchema);

export const Modelos = {
    Usuario,
    Libro,
    Prestamo,
    Multa
};

// Tipos adicionales para exportar
export type {
    IUsuarioBase,
    ILibroBase,
    IPrestamoBase,
    IMultaBase
};