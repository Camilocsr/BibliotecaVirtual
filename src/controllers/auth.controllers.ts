import { Request, Response } from 'express';
import { Usuario, IUsuario } from '../models/Biblioteca';
import jwt from 'jsonwebtoken';
import { Types, Document } from 'mongoose';
import { JwtPayload, UserInfo, RequestWithUser } from '../@types/middleware';

interface AuthResponse {
    success: boolean;
    message: string;
    data?: {
        usuario?: UserInfo & {
            nombre: string;
            apellido: string;
        };
        token?: string;
    };
    error?: string;
}

interface LoginRequest {
    email: string;
    googleId: string;
    nombre: string;
    apellido: string;
    rol?: string;
}

type UserDocument = Document<Types.ObjectId, {}, IUsuario> &
    IUsuario &
    Required<{ _id: Types.ObjectId }>;

export class AuthHandler {
    private static instance: AuthHandler;
    private readonly JWT_SECRET = process.env.JWT_SECRET || 'secrest';
    private readonly JWT_EXPIRES_IN = '24h';

    private constructor() { }

    public static getInstance(): AuthHandler {
        if (!AuthHandler.instance) {
            AuthHandler.instance = new AuthHandler();
        }
        return AuthHandler.instance;
    }

    public loginWithGoogle = async (
        req: Request<{}, AuthResponse, LoginRequest>,
        res: Response<AuthResponse>
    ): Promise<void> => {
        try {
            const { email, googleId, nombre, apellido,rol } = req.body;

            console.log(JSON.stringify(req.body, null, 2));

            let usuarioDoc = await Usuario.findOne({ email }) as UserDocument | null;

            if (!usuarioDoc) {
                const nuevoUsuario = new Usuario({
                    email,
                    googleId,
                    nombre,
                    apellido,
                    rol: rol,
                    estado: {
                        activo: true,
                        vetado: false
                    }
                });
                usuarioDoc = await nuevoUsuario.save() as UserDocument;
            }

            const token = this.generateToken(usuarioDoc);
            await Usuario.findByIdAndUpdate(usuarioDoc._id, {
                $set: {
                    tokenJWT: token,
                    fechaUltimoAcceso: new Date()
                }
            });

            res.status(200).json({
                success: true,
                message: 'Login exitoso',
                data: {
                    usuario: {
                        id: usuarioDoc._id.toString(),
                        email: usuarioDoc.email,
                        nombre: usuarioDoc.nombre,
                        apellido: usuarioDoc.apellido,
                        rol: usuarioDoc.rol
                    },
                    token
                }
            });

        } catch (error) {
            console.error('Error en login:', error);
            res.status(500).json({
                success: false,
                message: 'Error en el proceso de login',
                error: (error as Error).message
            });
        }
    }

    public validarToken = async (
        req: Request,
        res: Response<AuthResponse>
    ): Promise<void> => {
        try {
            const token = req.headers.authorization?.split(' ')[1];

            if (!token) {
                res.status(401).json({
                    success: false,
                    message: 'Token no proporcionado'
                });
                return;
            }

            const decoded = jwt.verify(token, this.JWT_SECRET) as JwtPayload;
            const usuarioDoc = await Usuario.findById(decoded.id) as UserDocument | null;

            if (!usuarioDoc) {
                res.status(404).json({
                    success: false,
                    message: 'Usuario no encontrado'
                });
                return;
            }

            if (!usuarioDoc.estado.activo || usuarioDoc.estado.vetado) {
                res.status(403).json({
                    success: false,
                    message: 'Usuario inactivo o vetado'
                });
                return;
            }

            res.status(200).json({
                success: true,
                message: 'Token válido',
                data: {
                    usuario: {
                        id: usuarioDoc._id.toString(),
                        email: usuarioDoc.email,
                        nombre: usuarioDoc.nombre,
                        apellido: usuarioDoc.apellido,
                        rol: usuarioDoc.rol
                    }
                }
            });

        } catch (error) {
            res.status(401).json({
                success: false,
                message: 'Token inválido',
                error: (error as Error).message
            });
        }
    }

    public logout = async (
        req: RequestWithUser,
        res: Response<AuthResponse>
    ): Promise<void> => {
        try {
            const userId = req.usuario?.id;

            if (userId) {
                await Usuario.findByIdAndUpdate(userId, {
                    $unset: { tokenJWT: 1 }
                });
            }

            res.status(200).json({
                success: true,
                message: 'Logout exitoso'
            });

        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error en el proceso de logout',
                error: (error as Error).message
            });
        }
    }

    private generateToken(usuario: UserDocument): string {
        return jwt.sign(
            {
                id: usuario._id.toString(),
                email: usuario.email,
                rol: usuario.rol
            },
            this.JWT_SECRET,
            {
                expiresIn: this.JWT_EXPIRES_IN
            }
        );
    }
}

export const authHandler = AuthHandler.getInstance();