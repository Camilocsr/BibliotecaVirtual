# Documentación de Tipos e Interfaces - TypeScript

## 1. Tipos de Autenticación y Usuario

### AuthUser
Representa un usuario autenticado en el sistema.
```typescript
interface AuthUser {
    id: string;
    email: string;
    rol: 'admin' | 'usuario';
}
```

### TokenPayload
Estructura del payload para JWT.
```typescript
interface TokenPayload {
    id: string;
    email: string;
    rol: 'admin' | 'usuario';
}
```

### UserDocument
Estructura de documento de usuario en MongoDB.
```typescript
type UserDocument = {
    _id: Types.ObjectId;
    email: string;
    rol: 'admin' | 'usuario';
    estado: {
        activo: boolean;
        vetado: boolean;
    };
};
```

## 2. Extensiones de Request

### AuthenticatedRequest
Extiende Request para incluir información de usuario autenticado.
```typescript
interface AuthenticatedRequest extends Request {
    usuario?: AuthUser;
}
```

### RequestWithUser
Extiende Request para incluir headers de autorización.
```typescript
interface RequestWithUser extends Request {
    usuario?: UserInfo;
    headers: Request['headers'] & {
        authorization?: string;
    };
}
```

## 3. JWT y Middleware

### JwtPayload
Extiende el payload estándar de JWT.
```typescript
interface JwtPayload extends jwt.JwtPayload {
    id: string;
    email: string;
    rol: string;
}
```

### UserInfo
Información básica del usuario para middleware.
```typescript
interface UserInfo {
    id: string;
    email: string;
    rol: string;
}
```

## 4. Gestión de Multas

### IMultaPendiente
Extiende IMulta para especificar estados.
```typescript
interface IMultaPendiente extends IMulta {
    estado: 'pendiente' | 'pagada' | 'perdonada';
}
```

## 5. Sistema de Devoluciones

### DevolucionResult
Resultado de operación de devolución.
```typescript
interface DevolucionResult {
    exito: boolean;
    mensaje: string;
    multa?: IMulta;
    depositoDevuelto?: number;
}
```

### VerificacionLibro
Datos para verificación de estado de libro.
```typescript
interface VerificacionLibro {
    condicionPrevia: string;
    condicionNueva: 'nuevo' | 'bueno' | 'regular' | 'malo';
    dañado: boolean;
    descripcionDaño?: string;
}
```

### PrestamoPopuladoDoc
Documento de préstamo con referencias populadas.
```typescript
interface PrestamoPopuladoDoc extends Document {
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
```

## 6. Utilidades

### ErrorWithMessage
Interfaz básica para errores.
```typescript
interface ErrorWithMessage {
    message: string;
}
```

## Guía de Uso

### 1. Autenticación
```typescript
// Uso en middleware
app.use((req: AuthenticatedRequest, res, next) => {
    const usuario = req.usuario;
    if (!usuario) {
        return res.status(401).json({ message: 'No autorizado' });
    }
    next();
});
```

### 2. Manejo de JWT
```typescript
// Verificación de token
const payload = jwt.verify(token) as JwtPayload;
const userId = payload.id;
```

### 3. Devoluciones
```typescript
// Registrar devolución
async function registrarDevolucion(
    prestamo: PrestamoPopuladoDoc,
    verificacion: VerificacionLibro
): Promise<DevolucionResult> {
    // Implementación
}
```

## Mejores Prácticas

### 1. Tipado Estricto
- Usar `strict: true` en tsconfig
- Evitar uso de `any`
- Definir tipos para todos los objetos

### 2. Organización
- Agrupar interfaces relacionadas
- Usar namespaces cuando apropiado
- Mantener convenciones de nombres

### 3. Documentación
- Usar JSDoc para documentación
- Incluir ejemplos de uso
- Documentar casos edge

### 4. Validación
- Implementar validación de tipos en runtime
- Usar type guards cuando necesario
- Validar datos de entrada

## Convenciones de Nombres

1. **Interfaces**
   - Prefijo `I` para interfaces de modelos
   - Sufijo descriptivo para variantes
   - CamelCase para nombres

2. **Types**
   - Sufijo descriptivo
   - Use type para uniones/intersecciones
   - CamelCase para nombres

3. **Enums**
   - Nombres en singular
   - Valores en UPPERCASE
   - Documentar valores

## Mantenimiento

### Consideraciones
1. **Retrocompatibilidad**
   - Mantener interfaces existentes
   - Versionar cambios breaking
   - Documentar deprecaciones

2. **Extensibilidad**
   - Diseñar para extensión
   - Usar genéricos cuando apropiado
   - Mantener interfaces modulares

3. **Testing**
   - Probar tipos en build time
   - Validar en runtime
   - Documentar casos edge

## Recomendaciones

1. **Desarrollo**
   - Usar strict mode
   - Implementar linting
   - Mantener documentación

2. **Seguridad**
   - Validar inputs
   - Sanitizar datos
   - Manejar errores

3. **Performance**
   - Evitar tipos complejos
   - Optimizar imports
   - Usar type inference