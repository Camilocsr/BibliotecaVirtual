# Documentación del Modelo de Datos - Sistema de Biblioteca

## Descripción General
Sistema de modelos de datos para una biblioteca, implementado con MongoDB y Mongoose, que gestiona usuarios, libros, préstamos y multas.

## Modelos

### 1. Usuario (Usuario)

#### Esquema Base
```typescript
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
```

#### Índices
- `email`: unique, lowercase
- `googleId`: unique
- `dni`: unique, sparse
- `estado.activo` y `estado.vetado`: compound
- Timestamps habilitados

#### Métodos
- `estaActivo()`: Verifica si el usuario está activo y no vetado

#### Validaciones
- Email requerido y único
- GoogleId requerido y único
- DNI único (opcional)
- Rol limitado a ['admin', 'usuario']

### 2. Libro (Libro)

#### Esquema Base
```typescript
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
```

#### Índices
- `isbn`: unique
- `titulo`: text
- `autor`: text
- `añoPublicacion`: normal
- `generos`: array
- Búsqueda full-text en título, autor, descripción y palabras clave

#### Métodos
- `estaDisponible()`: Verifica disponibilidad del libro

#### Validaciones
- ISBN requerido y único
- Nivel de ubicación > 0
- Inventario con valores no negativos
- Precios no negativos
- Condición limitada a ['nuevo', 'bueno', 'regular', 'malo']

### 3. Préstamo (Prestamo)

#### Esquema Base
```typescript
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
```

#### Índices
- `usuario`: reference
- `libro`: reference
- `estado`: normal
- `fechas.vencimiento`: normal
- Compound index en vencimiento y estado

#### Métodos
- `calcularDiasRetraso()`: Calcula días de retraso en la devolución

#### Validaciones
- Referencias requeridas a Usuario y Libro
- Tipo limitado a ['prestamo', 'alquiler']
- Estado limitado a ['activo', 'atrasado', 'devuelto', 'perdido']
- Costos no negativos

### 4. Multa (Multa)

#### Esquema Base
```typescript
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
```

#### Índices
- `usuario`: reference
- `prestamo`: reference
- `estado`: normal
- `fechas.vencimiento`: normal
- Compound index en vencimiento y estado

#### Métodos
- `calcularSaldoPendiente()`: Calcula el saldo pendiente de la multa

#### Validaciones
- Referencias requeridas a Usuario y Préstamo
- Tipo limitado a ['atraso', 'daño', 'perdida']
- Estado limitado a ['pendiente', 'pagada', 'perdonada']
- Monto no negativo

## Middlewares

### Usuario
- Pre-save: Actualiza estado de veto basado en fecha de fin

### Libro
- Pre-save: Valida coherencia del inventario

## Relaciones

1. Usuario -> Préstamos
   - One-to-Many
   - Array de referencias en Usuario
   - Referencia inversa en Préstamo

2. Usuario -> Multas
   - One-to-Many
   - Array de referencias en Usuario
   - Referencia inversa en Multa

3. Libro -> Préstamos
   - One-to-Many
   - Referencia desde Préstamo

4. Préstamo -> Multa
   - One-to-Many
   - Referencia desde Multa

## Interfaces Populadas

### IPrestamo
```typescript
interface IPrestamoPopulado extends Document {
    libro: ILibro;
    usuario: IUsuario;
    // ... otros campos
}
```

### Variantes
- `IPrestamoUsuarioPopulado`: Solo usuario populado
- `IPrestamoLibroPopulado`: Solo libro populado

## Consideraciones de Diseño

1. Optimización
   - Índices estratégicos para búsquedas comunes
   - Compound indexes para consultas frecuentes
   - Text search para búsqueda de libros

2. Integridad
   - Validaciones a nivel de esquema
   - Middlewares para consistencia
   - Referencias controladas

3. Flexibilidad
   - Estados extensibles
   - Campos opcionales donde apropiado
   - Soporte para diferentes tipos de préstamos

4. Seguridad
   - No versioning para reducir exposición
   - Campos sensibles indexados
   - Control de estados activo/inactivo

## Recomendaciones de Uso

1. Consultas
   - Usar índices apropiados
   - Implementar paginación
   - Limitar profundidad de población

2. Actualizaciones
   - Usar transacciones para operaciones múltiples
   - Validar estados antes de modificar
   - Mantener coherencia de inventario

3. Mantenimiento
   - Monitorear tamaño de arrays
   - Implementar limpieza periódica
   - Auditar cambios de estado

4. Escalabilidad
   - Considerar sharding por usuario
   - Implementar caché para lecturas frecuentes
   - Monitorear crecimiento de colecciones