# Documentación de Servicios - Sistema Biblioteca

## 1. Servicio AWS S3
Gestión de almacenamiento de archivos en Amazon S3.

### Configuración
```typescript
interface S3Config {
    accessKeyId: string;
    secretAccessKey: string;
    region: string;
    bucket: string;
}
```

### Variables de Entorno Requeridas
- `AWS_ACCESS_KEY_ID`: Clave de acceso AWS
- `AWS_SECRET_ACCESS_KEY`: Clave secreta AWS
- `AWS_REGION`: Región del bucket
- `AWS_BUCKET_NAME`: Nombre del bucket

### Funcionalidades

#### uploadImage
```typescript
async uploadImage(file: Buffer | ReadableStream, fileName: string): Promise<UploadResult>
```
- **Propósito**: Subir imágenes al bucket S3
- **Retorno**: 
  ```typescript
  interface UploadResult {
      publicUrl: string;
      fileName: string;
  }
  ```
- **Manejo de Contenido**:
  - Soporta múltiples tipos de imagen (jpg, jpeg, png, gif, webp, svg)
  - Asigna ContentType automáticamente
  - Genera URL pública

#### deleteImage
```typescript
async deleteImage(fileName: string): Promise<void>
```
- **Propósito**: Eliminar imágenes del bucket
- **Validaciones**: Verifica existencia del archivo

### Consideraciones de Seguridad
- Validación de configuración al inicio
- Manejo seguro de credenciales
- Logs de errores controlados
- Sin ACL público por defecto

## 2. Servicio MongoDB
Gestión de conexión a base de datos MongoDB implementando Singleton.

### Configuración
- **Variable de Entorno**: `MONGODB_URI`
- **Timeout**: 30000ms para selección de servidor

### Características
- Patrón Singleton
- Manejo de reconexión automática
- Monitoreo de estado de conexión
- Gestión de desconexión limpia

### Métodos Principales

#### connect
```typescript
async connect(): Promise<void>
```
- Establece conexión inicial
- Previene conexiones duplicadas
- Configura event listeners

#### disconnect
```typescript
async disconnect(): Promise<void>
```
- Cierre limpio de conexión
- Validación de estado previo

#### getConnection
```typescript
getConnection(): mongoose.Connection
```
- Acceso a la conexión actual

#### isConnectedToMongo
```typescript
isConnectedToMongo(): boolean
```
- Estado actual de conexión

### Eventos Monitoreados
- Error de conexión
- Desconexión
- Reconexión

## 3. Servicio Multer
Gestión de carga de archivos temporales.

### Configuración
```typescript
const tempDir = path.join(__dirname, '../../temp');
```

### Características
- Almacenamiento temporal en disco
- Nombres de archivo únicos
- Creación automática de directorio temporal
- Limpieza automática (requerida implementación)

### Configuración de Almacenamiento
```typescript
const storage: StorageEngine = multer.diskStorage({
    destination: tempDir,
    filename: uniqueSuffix + extension
});
```

### Métodos

#### uploadFile
```typescript
static uploadFile = upload.single('portada');
```
- Manejo de archivo único
- Campo esperado: 'portada'

#### getFilePath
```typescript
static getFilePath(req: any): string | undefined
```
- Obtiene ruta del archivo subido
- Validación de existencia

## Integración de Servicios

### Flujo de Carga de Imágenes
1. **Recepción**
   - Multer recibe el archivo
   - Almacenamiento temporal

2. **Procesamiento**
   - Validación de tipo
   - Generación de nombre único

3. **Almacenamiento en S3**
   - Carga a AWS
   - Obtención de URL pública

4. **Limpieza**
   - Eliminación de archivo temporal
   - Manejo de errores

## Buenas Prácticas

### 1. Gestión de Errores
- Manejo consistente de excepciones
- Logging detallado
- Respuestas estructuradas
- Limpieza de recursos en error

### 2. Seguridad
- Validación de tipos de archivo
- Límites de tamaño
- Sanitización de nombres
- Gestión segura de credenciales

### 3. Rendimiento
- Conexiones persistentes
- Manejo de buffer
- Limpieza proactiva
- Timeouts apropiados

### 4. Mantenibilidad
- Patrones de diseño (Singleton)
- Configuración centralizada
- Interfaces claras
- Documentación inline

## Recomendaciones de Implementación

### 1. AWS S3
- Implementar retry logic
- Configurar CORS apropiadamente
- Establecer lifecycle rules
- Monitorear costos

### 2. MongoDB
- Implementar pooling
- Configurar índices
- Monitorear performance
- Backup estrategia

### 3. Multer
- Limitar tipos de archivo
- Establecer quota de espacio
- Implementar limpieza periódica
- Validar metadatos

## Monitoreo y Mantenimiento

### Métricas a Monitorear
- Tiempo de respuesta S3
- Estado conexión MongoDB
- Uso de espacio temporal
- Errores de carga

### Tareas de Mantenimiento
- Limpieza de archivos temporales
- Verificación de conexiones
- Rotación de logs
- Actualización de dependencias

### Alertas
- Fallos de conexión
- Errores de carga
- Espacio insuficiente
- Timeouts