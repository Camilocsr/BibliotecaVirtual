import { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { Usuario } from '../models/Biblioteca';
import { TokenPayload, AuthenticatedRequest, UserDocument } from '../@types/auth.types';

const JWT_SECRET = process.env.JWT_SECRET || 'clave_secreta';

if (!process.env.JWT_SECRET) {
    console.warn('⚠️ WARNING: JWT_SECRET no está definido en las variables de entorno.');
}

export const verificarToken: RequestHandler = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];

        if (!token) {
            res.status(401).json({
                success: false,
                message: 'Token no proporcionado'
            });
            return;
        }

        try {
            const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
            const usuario = await Usuario.findById(decoded.id)
                .select('_id email rol estado')
                .lean()
                .exec() as UserDocument | null;

            if (!usuario) {
                res.status(404).json({
                    success: false,
                    message: 'Usuario no encontrado'
                });
                return;
            }

            if (!usuario.estado.activo || usuario.estado.vetado) {
                res.status(403).json({
                    success: false,
                    message: 'Usuario inactivo o vetado'
                });
                return;
            }

            (req as AuthenticatedRequest).usuario = {
                id: usuario._id.toString(),
                email: usuario.email,
                rol: usuario.rol
            };

            next();
        } catch (jwtError) {
            res.status(401).json({
                success: false,
                message: 'Token inválido o expirado'
            });
            return;
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error en la verificación del token',
            error: (error as Error).message
        });
        return;
    }
};

export const esAdmin: RequestHandler = (req, res, next) => {
    const usuario = (req as AuthenticatedRequest).usuario;
    
    if (!usuario) {
        res.status(401).json({
            success: false,
            message: 'Usuario no autenticado'
        });
        return;
    }

    if (usuario.rol !== 'admin') {
        res.status(403).json({
            success: false,
            message: 'Acceso denegado: se requieren permisos de administrador'
        });
        return;
    }

    next();
};

export const estaActivo: RequestHandler = (req, res, next) => {
    const usuario = (req as AuthenticatedRequest).usuario;
    
    if (!usuario) {
        res.status(401).json({
            success: false,
            message: 'Usuario no autenticado'
        });
        return;
    }

    next();
};