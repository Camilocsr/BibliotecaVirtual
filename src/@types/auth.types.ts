// src/types/auth.types.ts
import { Request } from 'express';
import { Types } from 'mongoose';

export interface AuthUser {
    id: string;
    email: string;
    rol: 'admin' | 'usuario';
}

export interface AuthenticatedRequest extends Request {
    usuario?: AuthUser;
}

export interface TokenPayload {
    id: string;
    email: string;
    rol: 'admin' | 'usuario';
}

export type UserDocument = {
    _id: Types.ObjectId;
    email: string;
    rol: 'admin' | 'usuario';
    estado: {
        activo: boolean;
        vetado: boolean;
    };
};