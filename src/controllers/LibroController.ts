import { Request, Response, NextFunction } from 'express';
import { Libro } from '../models/Biblioteca';
import { getErrorMessage } from '../utils/errors/getErrorMessage';
import fs from 'fs-extra';
import { RequestHandler } from 'express';
import { S3Service } from '../services/AWS/s3.service';

export class LibroController {
    static crear: RequestHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            // 1. Validar que existan datos
            if (!req.body.datos) {
                res.status(400).json({
                    mensaje: 'No se recibieron datos del libro',
                    error: 'datos_requeridos'
                });
                return;
            }

            // 2. Parsear los datos
            let libroData;
            try {
                libroData = JSON.parse(req.body.datos);
            } catch (e) {
                res.status(400).json({
                    mensaje: 'Error al procesar los datos del libro',
                    error: 'formato_invalido',
                    detalles: e instanceof Error ? e.message : 'Error al parsear JSON'
                });
                return;
            }

            // 3. Validar campos requeridos
            const camposRequeridos = [
                'isbn',
                'titulo',
                'autor',
                'editorial',
                'añoPublicacion',
                'idioma',
                'ubicacion',
                'inventario',
                'precio'
            ];

            const camposFaltantes = camposRequeridos.filter(campo => !libroData[campo]);
            if (camposFaltantes.length > 0) {
                res.status(400).json({
                    mensaje: `Faltan campos requeridos: ${camposFaltantes.join(', ')}`,
                    error: 'campos_faltantes',
                    campos: camposFaltantes
                });
                return;
            }

            // 4. Verificar ISBN duplicado
            const libroExistente = await Libro.findOne({ isbn: libroData.isbn });
            if (libroExistente) {
                res.status(400).json({
                    mensaje: 'Ya existe un libro con este ISBN',
                    error: 'isbn_duplicado',
                    isbn: libroData.isbn
                });
                return;
            }

            // 5. Procesar imagen si existe
            const file = req.file;
            if (file) {
                try {
                    // Leer el archivo como Buffer
                    const fileBuffer = await fs.readFile(file.path);

                    const s3Service = new S3Service();
                    const imagenfile = await s3Service.uploadImage(fileBuffer, file.filename);

                    console.log('URL de imagen subida:', imagenfile.publicUrl);
                    libroData.portada = imagenfile.publicUrl;

                    // Eliminar el archivo temporal
                    await fs.unlink(file.path);
                } catch (error) {
                    console.error('Error al procesar la imagen:', error);
                    res.status(500).json({
                        mensaje: 'Error al procesar la imagen del libro',
                        error: 'error_imagen',
                        detalles: error instanceof Error ? error.message : 'Error al procesar imagen'
                    });
                    return;
                }
            }

            // 6. Crear y guardar el libro
            const libro = new Libro({
                ...libroData,
                inventario: {
                    ...libroData.inventario,
                    disponible: libroData.inventario.total,
                    prestados: 0,
                    reservados: 0
                },
            });

            try {
                await libro.save();
                res.status(201).json({
                    mensaje: 'Libro creado exitosamente',
                    libro,
                    codigo: 'libro_creado'
                });
            } catch (error) {
                // Error específico de MongoDB/Mongoose
                console.error('Error al guardar el libro:', error);
                res.status(500).json({
                    mensaje: 'Error al guardar el libro en la base de datos',
                    error: 'error_db',
                    detalles: error instanceof Error ? error.message : 'Error al guardar'
                });
            }

        } catch (error: unknown) {
            // Error general
            console.error('Error general al crear libro:', error);
            res.status(500).json({
                mensaje: 'Error al crear el libro',
                error: 'error_general',
                detalles: getErrorMessage(error)
            });
        }
    };

    static obtenerTodos: RequestHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const {
                pagina = 1,
                limite = 10,
                titulo,
                autor,
                genero,
                disponible,
                condicion
            } = req.query;

            const filtro: any = {};

            if (titulo) filtro.titulo = new RegExp(titulo as string, 'i');
            if (autor) filtro.autor = new RegExp(autor as string, 'i');
            if (genero) filtro.generos = genero;
            if (disponible === 'true') filtro['inventario.disponible'] = { $gt: 0 };
            if (condicion) filtro['estado.condicion'] = condicion;

            const [libros, total] = await Promise.all([
                Libro.find(filtro)
                    .skip((Number(pagina) - 1) * Number(limite))
                    .limit(Number(limite))
                    .sort({ createdAt: -1 }),
                Libro.countDocuments(filtro)
            ]);

            res.json({
                libros,
                total,
                paginas: Math.ceil(total / Number(limite)),
                paginaActual: Number(pagina)
            });
        } catch (error: unknown) {
            res.status(500).json({
                mensaje: 'Error al obtener los libros',
                error: getErrorMessage(error)
            });
        }
    };

    static obtenerLibrosPaginacion: RequestHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const {
                pagina = 1,
                limite = 10,
                titulo,
                autor,
                genero,
                disponible,
                condicion,
                ordenarPor = 'createdAt',
                orden = 'desc'
            } = req.query;

            const filtro: any = {};

            // Aplicar filtros si existen
            if (titulo) filtro.titulo = new RegExp(String(titulo), 'i');
            if (autor) filtro.autor = new RegExp(String(autor), 'i');
            if (genero) filtro.generos = genero;
            if (disponible === 'true') filtro['inventario.disponible'] = { $gt: 0 };
            if (condicion) filtro['estado.condicion'] = condicion;

            // Configurar opciones de ordenamiento
            const sortOptions: any = {};
            sortOptions[String(ordenarPor)] = orden === 'asc' ? 1 : -1;

            const skip = (Number(pagina) - 1) * Number(limite);

            // Ejecutar consultas en paralelo
            const [libros, total] = await Promise.all([
                Libro.find(filtro)
                    .skip(skip)
                    .limit(Number(limite))
                    .sort(sortOptions)
                    .select('-__v'),
                Libro.countDocuments(filtro)
            ]);

            res.json({
                libros,
                total,
                paginas: Math.ceil(total / Number(limite)),
                paginaActual: Number(pagina),
                porPagina: Number(limite)
            });
        } catch (error: unknown) {
            res.status(500).json({
                mensaje: 'Error al obtener los libros',
                error: getErrorMessage(error)
            });
        }
    };

    static obtenerPorId: RequestHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { id } = req.params;
            const libro = await Libro.findById(id);

            if (!libro) {
                res.status(404).json({
                    mensaje: 'Libro no encontrado'
                });
                return;
            }

            res.json(libro);
        } catch (error: unknown) {
            res.status(500).json({
                mensaje: 'Error al obtener el libro',
                error: getErrorMessage(error)
            });
        }
    };

    static actualizar: RequestHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            // Log completo de la solicitud entrante
            console.log('Solicitud de actualización recibida:');
            console.log('Parámetros:', req.params);
            console.log('Cuerpo de la solicitud:', req.body);
            console.log('Archivos:', req.file);

            const { id } = req.params;

            // Verificar la existencia y tipo de datos
            if (!req.body || !req.body.datos) {
                console.error('No se recibieron datos para actualizar');
                res.status(400).json({
                    mensaje: 'No se recibieron datos para actualizar',
                    error: 'datos_faltantes'
                });
                return;
            }

            // Parsear los datos con registro detallado
            let actualizacion;
            try {
                console.log('Intentando parsear datos:', req.body.datos);
                actualizacion = JSON.parse(req.body.datos);
                // console.log('Datos parseados:', JSON.stringify(actualizacion, null, 2));
            } catch (e) {
                console.error('Error al parsear JSON:', e);
                console.error('Contenido recibido:', req.body.datos);
                res.status(400).json({
                    mensaje: 'Error al procesar los datos del libro',
                    error: 'formato_invalido',
                    detalles: e instanceof Error ? e.message : 'Error al parsear JSON',
                    contenidoRecibido: req.body.datos
                });
                return;
            }

            // Verificar existencia del libro
            const libroExistente = await Libro.findById(id);
            if (!libroExistente) {
                console.error(`Libro no encontrado con ID: ${id}`);
                res.status(404).json({
                    mensaje: 'Libro no encontrado',
                    error: 'libro_no_encontrado',
                    id: id
                });
                return;
            }

            // Validar ISBN duplicado
            if (actualizacion.isbn && actualizacion.isbn !== libroExistente.isbn) {
                const isbnExistente = await Libro.findOne({ isbn: actualizacion.isbn });
                if (isbnExistente) {
                    console.error(`ISBN duplicado: ${actualizacion.isbn}`);
                    res.status(400).json({
                        mensaje: 'Ya existe un libro con este ISBN',
                        error: 'isbn_duplicado',
                        isbn: actualizacion.isbn
                    });
                    return;
                }
            }

            // Validar coherencia del inventario
            if (actualizacion.inventario) {
                const { total, disponible, prestados, reservados } = actualizacion.inventario;
                if (total !== (disponible + prestados + reservados)) {
                    console.error('Inventario inconsistente', {
                        total,
                        disponible,
                        prestados,
                        reservados,
                        suma: disponible + prestados + reservados
                    });
                    res.status(400).json({
                        mensaje: 'Los números del inventario no cuadran con el total',
                        error: 'inventario_inconsistente',
                        detalles: {
                            total,
                            disponible,
                            prestados,
                            reservados,
                            suma: disponible + prestados + reservados
                        }
                    });
                    return;
                }
            }

            // Procesar imagen si existe
            const file = req.file;
            if (file) {
                try {
                    // Leer el archivo como Buffer
                    const fileBuffer = await fs.readFile(file.path);

                    const s3Service = new S3Service();
                    const imagenfile = await s3Service.uploadImage(fileBuffer, file.filename);

                    console.log('URL de imagen subida:', imagenfile.publicUrl);
                    actualizacion.portada = imagenfile.publicUrl;

                    // Eliminar el archivo temporal
                    await fs.unlink(file.path);
                } catch (error) {
                    console.error('Error al procesar la imagen:', error);
                    res.status(500).json({
                        mensaje: 'Error al procesar la imagen del libro',
                        error: 'error_imagen',
                        detalles: error instanceof Error ? error.message : 'Error al procesar imagen'
                    });
                    return;
                }
            }

            // Ejecutar la actualización
            const libroActualizado = await Libro.findByIdAndUpdate(
                id,
                { $set: actualizacion },
                { new: true, runValidators: true }
            );

            console.log('Libro actualizado:', libroActualizado);

            res.json({
                mensaje: 'Libro actualizado exitosamente',
                libro: libroActualizado,
                codigo: 'libro_actualizado'
            });

        } catch (error: unknown) {
            console.error('Error al actualizar el libro:', error);
            res.status(500).json({
                mensaje: 'Error al actualizar el libro',
                error: 'error_general',
                detalles: getErrorMessage(error)
            });
        }
    };

    static eliminar: RequestHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            console.log('Solicitud de eliminación recibida');
            console.log('Parámetros de la solicitud:', req.params);
            console.log('Cabeceras de la solicitud:', req.headers);
    
            const { id } = req.params;
    
            if (!id) {
                console.error('No se proporcionó un ID de libro');
                res.status(400).json({
                    mensaje: 'ID de libro no proporcionado',
                    error: 'id_faltante'
                });
                return;
            }
    
            console.log(`Buscando libro con ID: ${id}`);
            const libro = await Libro.findById(id);
    
            if (!libro) {
                console.error(`Libro no encontrado con ID: ${id}`);
                res.status(404).json({
                    mensaje: 'Libro no encontrado',
                    error: 'libro_no_encontrado',
                    detalles: {
                        id: id
                    }
                });
                return;
            }
    
            if (libro.inventario.prestados > 0) {
                console.warn('Intento de eliminar libro con préstamos activos', {
                    prestados: libro.inventario.prestados,
                    reservados: libro.inventario.reservados
                });
                res.status(400).json({
                    mensaje: 'No se puede eliminar un libro con préstamos activos',
                    error: 'libros_prestados',
                    detalles: {
                        prestados: libro.inventario.prestados,
                        reservados: libro.inventario.reservados,
                        titulo: libro.titulo,
                        isbn: libro.isbn
                    }
                });
                return;
            }
    
            if (libro.inventario.reservados > 0) {
                console.warn('Intento de eliminar libro con reservas activas', {
                    reservados: libro.inventario.reservados,
                    prestados: libro.inventario.prestados
                });
                res.status(400).json({
                    mensaje: 'No se puede eliminar un libro con reservas activas',
                    error: 'libros_reservados',
                    detalles: {
                        reservados: libro.inventario.reservados,
                        prestados: libro.inventario.prestados,
                        titulo: libro.titulo,
                        isbn: libro.isbn
                    }
                });
                return;
            }
            
            try {
                const libroEliminado = await Libro.findByIdAndDelete(id);
    
                if (!libroEliminado) {
                    console.error(`No se pudo eliminar el libro con ID: ${id}`);
                    res.status(500).json({
                        mensaje: 'Error al eliminar el libro',
                        error: 'eliminacion_fallida',
                        detalles: {
                            id: id
                        }
                    });
                    return;
                }
    
                console.log('Libro eliminado exitosamente', {
                    id: libroEliminado._id,
                    titulo: libroEliminado.titulo
                });
    
                res.json({
                    mensaje: 'Libro eliminado exitosamente',
                    codigo: 'libro_eliminado',
                    libro: {
                        _id: libroEliminado._id,
                        titulo: libroEliminado.titulo
                    }
                });
            } catch (deleteError) {
                console.error('Error al eliminar el libro:', deleteError);
                res.status(500).json({
                    mensaje: 'Error al eliminar el libro',
                    error: 'error_eliminacion',
                    detalles: getErrorMessage(deleteError)
                });
            }
    
        } catch (error: unknown) {
            // Manejo de errores generales con máximo detalle
            console.error('Error general al eliminar el libro:', error);
            res.status(500).json({
                mensaje: 'Error al eliminar el libro',
                error: 'error_general',
                detalles: {
                    mensaje: getErrorMessage(error),
                    tipo: typeof error,
                    stringError: String(error)
                }
            });
        }
    };

    static busquedaAvanzada: RequestHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const {
                termino,
                generos,
                añoDesde,
                añoHasta,
                idioma,
                disponible,
                condicion
            } = req.query;

            const filtro: any = {};

            if (termino) {
                // Limpia el término de búsqueda de signos de puntuación y acentos
                const cleanTerm = (termino as string)
                    .normalize("NFD")
                    .replace(/[\u0300-\u036f]/g, "") // Elimina acentos
                    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()"""'']/g, "") // Elimina puntuación
                    .trim();

                // Crea una expresión regular que sea flexible con la puntuación
                const regexPattern = cleanTerm
                    .split('')
                    .map(char => `${char}[.,\\/#!$%\\^&\\*;:{}=\\-_\`~()"""'']*`)
                    .join('');

                const regex = new RegExp(regexPattern, 'i');

                // Conversión del término a número si es posible (para búsqueda por año)
                const numberTerm = !isNaN(Number(cleanTerm)) ? Number(cleanTerm) : null;

                filtro.$or = [
                    {
                        titulo: {
                            $regex: regex
                        }
                    },
                    {
                        autor: {
                            $regex: regex
                        }
                    },
                    {
                        isbn: {
                            $regex: regex
                        }
                    },
                    {
                        editorial: {
                            $regex: regex
                        }
                    },
                    {
                        idioma: {
                            $regex: regex
                        }
                    },
                    {
                        generos: {
                            $regex: regex
                        }
                    },
                    {
                        descripcion: {
                            $regex: regex
                        }
                    },
                    {
                        palabrasClave: {
                            $regex: regex
                        }
                    }
                ];

                // Agregar búsqueda por año si el término es un número
                if (numberTerm !== null) {
                    filtro.$or.push({ añoPublicacion: numberTerm });
                }

                // Búsqueda en campos anidados
                const termLower = cleanTerm.toLowerCase();
                if (termLower === 'disponible') {
                    filtro.$or.push({ 'inventario.disponible': { $gt: 0 } });
                }
                if (termLower === 'no disponible') {
                    filtro.$or.push({ 'inventario.disponible': 0 });
                }
            }

            // Filtros adicionales específicos
            if (generos) {
                const cleanGeneros = (generos as string)
                    .normalize("NFD")
                    .replace(/[\u0300-\u036f]/g, "")
                    .split(',')
                    .map(g => new RegExp(g.trim(), 'i'));

                filtro.generos = { $in: cleanGeneros };
            }

            if (añoDesde || añoHasta) {
                filtro.añoPublicacion = {};
                if (añoDesde) filtro.añoPublicacion.$gte = Number(añoDesde);
                if (añoHasta) filtro.añoPublicacion.$lte = Number(añoHasta);
            }

            if (idioma) {
                const cleanIdioma = (idioma as string)
                    .normalize("NFD")
                    .replace(/[\u0300-\u036f]/g, "");
                filtro.idioma = new RegExp(cleanIdioma, 'i');
            }

            if (disponible === 'true') {
                filtro['inventario.disponible'] = { $gt: 0 };
            }

            if (condicion) {
                const cleanCondicion = (condicion as string)
                    .normalize("NFD")
                    .replace(/[\u0300-\u036f]/g, "");
                filtro['estado.condicion'] = new RegExp(cleanCondicion, 'i');
            }

            const libros = await Libro.find(filtro)
                .limit(20)
                .sort({ 'inventario.disponible': -1, añoPublicacion: -1 });

            res.json({
                resultados: libros.length,
                libros
            });
        } catch (error: unknown) {
            res.status(500).json({
                mensaje: 'Error en la búsqueda avanzada',
                error: getErrorMessage(error)
            });
        }
    };

    static actualizarInventario: RequestHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { id } = req.params;
            const { total, disponible, prestados, reservados } = req.body;

            const libro = await Libro.findById(id);
            if (!libro) {
                res.status(404).json({
                    mensaje: 'Libro no encontrado'
                });
                return;
            }

            if (total !== (disponible + prestados + reservados)) {
                res.status(400).json({
                    mensaje: 'Los números del inventario no cuadran con el total'
                });
                return;
            }

            libro.inventario = {
                total,
                disponible,
                prestados,
                reservados
            };

            await libro.save();

            res.json({
                mensaje: 'Inventario actualizado exitosamente',
                libro
            });
        } catch (error: unknown) {
            res.status(500).json({
                mensaje: 'Error al actualizar el inventario',
                error: getErrorMessage(error)
            });
        }
    };
}