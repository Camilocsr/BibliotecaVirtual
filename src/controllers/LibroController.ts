import { Request, Response, NextFunction } from 'express';
import { Libro } from '../models/Biblioteca';
import { getErrorMessage } from '../utils/errors/getErrorMessage';
import fs from 'fs-extra';
import { RequestHandler } from 'express';
import { S3Service } from '../services/AWS/s3.service';

export class LibroController {
    static crear: RequestHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const libroData = JSON.parse(req.body.datos);

            const libroExistente = await Libro.findOne({ isbn: libroData.isbn });
            if (libroExistente) {
                res.status(400).json({
                    mensaje: 'Ya existe un libro con este ISBN'
                });
                return;
            }

            // Subir imagen a S3
            const file = req.file;

            if (file) {
                try {
                    // Leer el archivo como Buffer
                    const fileBuffer = await fs.readFile(file.path);

                    const s3Service = new S3Service();
                    const imagenfile = await s3Service.uploadImage(fileBuffer, file.filename);

                    console.log(imagenfile.publicUrl);

                    libroData.portada = imagenfile.publicUrl;

                    // Opcional: Eliminar el archivo temporal después de subirlo
                    await fs.unlink(file.path);
                } catch (error) {
                    console.error('Error al procesar la imagen:', error);
                    // Manejar el error según necesites
                }
            }

            const libro = new Libro({
                ...libroData,
                inventario: {
                    ...libroData.inventario,
                    disponible: libroData.inventario.total,
                    prestados: 0,
                    reservados: 0
                },
            });

            await libro.save();

            res.status(201).json({
                mensaje: 'Libro creado exitosamente',
                libro
            });
        } catch (error: unknown) {
            res.status(500).json({
                mensaje: 'Error al crear el libro',
                error: getErrorMessage(error)
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
            const { id } = req.params;
            const actualizacion = req.body;

            const libroExistente = await Libro.findById(id);
            if (!libroExistente) {
                res.status(404).json({
                    mensaje: 'Libro no encontrado'
                });
                return;
            }

            if (actualizacion.isbn && actualizacion.isbn !== libroExistente.isbn) {
                const isbnExistente = await Libro.findOne({ isbn: actualizacion.isbn });
                if (isbnExistente) {
                    res.status(400).json({
                        mensaje: 'Ya existe un libro con este ISBN'
                    });
                    return;
                }
            }

            if (actualizacion.inventario) {
                const { total, disponible, prestados, reservados } = actualizacion.inventario;
                if (total !== (disponible + prestados + reservados)) {
                    res.status(400).json({
                        mensaje: 'Los números del inventario no cuadran con el total'
                    });
                    return;
                }
            }

            const libroActualizado = await Libro.findByIdAndUpdate(
                id,
                { $set: actualizacion },
                { new: true, runValidators: true }
            );

            res.json({
                mensaje: 'Libro actualizado exitosamente',
                libro: libroActualizado
            });
        } catch (error: unknown) {
            res.status(500).json({
                mensaje: 'Error al actualizar el libro',
                error: getErrorMessage(error)
            });
        }
    };

    static eliminar: RequestHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { id } = req.params;

            const libro = await Libro.findById(id);
            if (!libro) {
                res.status(404).json({
                    mensaje: 'Libro no encontrado'
                });
                return;
            }

            if (libro.inventario.prestados > 0) {
                res.status(400).json({
                    mensaje: 'No se puede eliminar un libro con préstamos activos'
                });
                return;
            }

            libro.estado.activo = false;
            await libro.save();

            res.json({
                mensaje: 'Libro eliminado exitosamente'
            });
        } catch (error: unknown) {
            res.status(500).json({
                mensaje: 'Error al eliminar el libro',
                error: getErrorMessage(error)
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