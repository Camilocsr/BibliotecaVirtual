# Documentación del Middleware de Autenticación

## Descripción General
Sistema de middleware para la autenticación y autorización de usuarios en la aplicación de biblioteca, implementado con Express.js y JWT (JSON Web Tokens).

## Configuración

### Variables de Entorno
- `JWT_SECRET`: Clave secreta para la firma de tokens JWT
  - Valor por defecto: 'clave_secreta' (solo para desarrollo)
  - Se recomienda configurar en producción
  - Emite advertencia si no está definida

## Tipos de Datos

### TokenPayload
```typescript
interface TokenPayload {
    id: string;
    // Otros campos del token
}
```

### AuthenticatedRequest
```typescript
interface AuthenticatedRequest extends Request {
    usuario: {
        id: string;
        email: string;
        rol: string;
    };
}
```

### UserDocument
```typescript
interface UserDocument {
    _id: Types.ObjectId;
    email: string;
    rol: string;
    estado: {
        activo: boolean;
        vetado: boolean;
    };
}
```

## Middlewares Implementados

### 1. verificarToken
Middleware principal para la verificación de autenticación.

#### Funcionalidad
- Extrae el token del header 'Authorization'
- Verifica la validez del token JWT
- Valida la existencia y estado del usuario
- Agrega información del usuario a la request

#### Proceso de Validación
1. Extracción del token
   - Formato esperado: "Bearer [token]"
   - Error 401 si no se proporciona token

2. Verificación del token
   - Decodifica usando JWT_SECRET
   - Error 401 si el token es inválido o expirado

3. Validación del usuario
   - Busca el usuario en la base de datos
   - Selecciona campos específicos: _id, email, rol, estado
   - Error 404 si el usuario no existe

4. Validación de estado
   - Error 403 si el usuario está inactivo o vetado

#### Códigos de Error
- 401: Token no proporcionado o inválido
- 403: Usuario inactivo o vetado
- 404: Usuario no encontrado
- 500: Error interno del servidor

### 2. esAdmin
Middleware para validar permisos de administrador.

#### Funcionalidad
- Verifica que el usuario esté autenticado
- Valida el rol de administrador

#### Códigos de Error
- 401: Usuario no autenticado
- 403: Usuario sin permisos de administrador

### 3. estaActivo
Middleware para verificar que el usuario está activo.

#### Funcionalidad
- Verifica que el usuario esté autenticado
- No realiza validaciones adicionales de estado

#### Códigos de Error
- 401: Usuario no autenticado

## Ejemplos de Uso

### Ruta Protegida Básica
```typescript
router.get('/ruta-protegida', 
    verificarToken,
    (req, res) => {
        // Acceso a información del usuario
        const usuario = (req as AuthenticatedRequest).usuario;
        // Lógica de la ruta
    }
);
```

### Ruta Solo Administradores
```typescript
router.post('/admin/accion', 
    verificarToken,
    esAdmin,
    (req, res) => {
        // Solo administradores pueden acceder
    }
);
```

### Ruta Usuario Activo
```typescript
router.get('/usuario/perfil', 
    verificarToken,
    estaActivo,
    (req, res) => {
        // Accesible para usuarios activos
    }
);
```

## Buenas Prácticas de Seguridad

1. Configuración
   - Establecer JWT_SECRET en variables de entorno
   - Usar secretos seguros y únicos por ambiente

2. Manejo de Tokens
   - Almacenar de forma segura en el cliente
   - Implementar refresh tokens para sesiones largas
   - Establecer tiempos de expiración apropiados

3. Validaciones
   - Verificar siempre el estado del usuario
   - Validar roles y permisos específicos
   - Implementar rate limiting en rutas sensibles

4. Respuestas de Error
   - Mensajes de error claros pero seguros
   - No exponer información sensible en errores
   - Logging apropiado de errores

## Recomendaciones de Implementación

1. Seguridad Adicional
   - Implementar rate limiting
   - Agregar validación de IP
   - Registrar intentos de acceso fallidos

2. Mejoras Sugeridas
   - Implementar refresh tokens
   - Agregar revocación de tokens
   - Expandir sistema de roles y permisos

3. Monitoreo
   - Logging de accesos y errores
   - Alertas de seguridad
   - Métricas de uso