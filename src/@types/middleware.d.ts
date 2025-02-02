// src/@types/middleware.d.ts
import { Request } from 'express';
import jwt from 'jsonwebtoken';

export interface JwtPayload extends jwt.JwtPayload {
    id: string;
    email: string;
    rol: string;
}

export interface UserInfo {
    id: string;
    email: string;
    rol: string;
}

export interface RequestWithUser extends Request {
    usuario?: UserInfo;
    headers: Request['headers'] & {
        authorization?: string;
    };
}