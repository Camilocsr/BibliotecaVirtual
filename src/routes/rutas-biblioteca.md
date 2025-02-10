# Documentación del Sistema de Rutas - API Biblioteca

## Descripción General
Sistema de rutas para la API REST de la biblioteca, implementado con Express.js.

## 1. Rutas de Autenticación
Base path: `/auth`

### Endpoints

| Método | Ruta | Middleware | Controlador | Descripción |
|--------|------|------------|-------------|-------------|
| POST | `/login/google` | - | `authHandler.loginWithGoogle` | Autenticación con Google |
| GET | `/validar` | `verificarToken` | `authHandler.validarToken` | Validación de token |
| POST | `/logout` | `verificarToken` | `authHandler.logout` | Cierre de sesión |

## 2. Rutas de Préstamos
Base path: `/api`

### Endpoints

| Método | Ruta | Middleware | Controlador | Descripción |
|--------|------|------------|-------------|-------------|
| GET | `/prestamos/usuario/:usuarioId` | `verificarToken` | `PrestamoController.obtenerPrestamosUsuario` | Obtiene préstamos de un usuario |
| GET | `/prestamos/:id` | `verificarToken` | `PrestamoController.obtenerPrestamo` | Obtiene un préstamo específico |
| GET | `/prestamos/:id/estado` | `verificarToken` | `PrestamoController.verificarEstado` | Verifica estado de un préstamo |
| POST | `/prestamos` | `verificarToken` | `PrestamoController.crear` | Crea un nuevo préstamo |
| POST | `/prestamos/:id/renovar` | `verificarToken` | `PrestamoController.renovar` | Renueva un préstamo |
| PUT | `/prestamos/:id/estado` | `verificarToken, esAdmin` | `PrestamoController.actualizarEstado` | Actualiza estado de préstamo |

## 3. Rutas de Devoluciones
Base path: `/api`

### Endpoints

| Método | Ruta | Middleware | Controlador | Descripción |
|--------|------|------------|-------------|-------------|
| GET | `/devoluciones/prestamo/:prestamoId` | `verificarToken` | `DevolucionController.obtenerDevolucion` | Obtiene detalles de devolución |
| POST | `/devoluciones/registrar` | `verificarToken, esAdmin` | `DevolucionController.registrarDevolucion` | Registra una devolución |
| POST | `/devoluciones/prestamo/:prestamoId/verificar` | `verificarToken` | `DevolucionController.verificarEstado` | Verifica estado para devolución |

## 4. Rutas de Multas
Base path: `/api`

### Endpoints

| Método | Ruta | Middleware | Controlador | Descripción |
|--------|------|------------|-------------|-------------|
| GET | `/multas/informe/:usuarioId` | `verificarToken` | `MultasController.generarInformeMultas` | Genera informe de multas |
| POST | `/multas/pagar` | `verificarToken` | `MultasController.pagarMulta` | Registra pago de multa |
| POST | `/multas/generar-por-libro` | `verificarToken` | `MultasController.generarMultaPorDanioOPerdida` | Genera multa por daño/pérdida |
| POST | `/multas/proceso-diario` | `verificarToken` | `MultasController.procesoDiarioMultas` | Ejecuta proceso diario |

## Detalles de Implementación

### 1. Middleware de Autenticación

#### verificarToken
- Valida token JWT
- Verifica usuario activo
- Adjunta información de usuario a request

#### esAdmin
- Requiere `verificarToken`
- Valida rol de administrador

### 2. Controladores

#### AuthController
- Manejo de autenticación Google
- Validación de tokens
- Gestión de sesiones

#### PrestamoController
- CRUD de préstamos
- Validaciones de estado
- Renovaciones

#### DevolucionController
- Registro de devoluciones
- Verificación de estado
- Gestión de multas asociadas

#### MultasController
- Gestión de multas
- Procesamiento de pagos
- Informes y reportes

## Estructura de Respuestas

### Éxito
```json
{
    "success": true,
    "data": {},
    "mensaje": "Operación exitosa"
}
```

### Error
```json
{
    "success": false,
    "mensaje": "Descripción del error",
    "error": "Detalles técnicos (opcional)"
}
```

## Códigos de Estado HTTP

| Código | Uso |
|--------|-----|
| 200 | Éxito en operación GET/PUT |
| 201 | Éxito en creación (POST) |
| 400 | Error de validación |
| 401 | No autenticado |
| 403 | No autorizado |
| 404 | Recurso no encontrado |
| 500 | Error interno |

## Seguridad

### Middleware de Autenticación
- Todas las rutas (excepto login) requieren token
- Validación de token en cada request
- Verificación de permisos según rol

### Control de Acceso
- Rutas administrativas protegidas
- Validación de propiedad de recursos
- Registro de acciones sensibles

## Buenas Prácticas

1. Nomenclatura
   - Rutas en minúsculas
   - Separación por guiones
   - Verbos REST apropiados
   - Nombres descriptivos

2. Validaciones
   - Parámetros requeridos
   - Tipos de datos
   - Formatos específicos
   - Estados válidos

3. Respuestas
   - Formato consistente
   - Mensajes descriptivos
   - Códigos HTTP apropiados
   - Manejo de errores uniforme

4. Seguridad
   - Validación de tokens
   - Control de acceso por rol
   - Sanitización de inputs
   - Rate limiting

## Recomendaciones

1. Documentación
   - Mantener Swagger/OpenAPI
   - Ejemplos de uso
   - Postman collections
   - Casos de prueba

2. Testing
   - Pruebas unitarias
   - Pruebas de integración
   - Validación de seguridad
   - Casos de error

3. Monitoreo
   - Logging de errores
   - Métricas de uso
   - Tiempos de respuesta
   - Patrones de acceso

4. Mantenimiento
   - Versionado de API
   - Deprecación planificada
   - Actualizaciones documentadas
   - Backup de configuraciones