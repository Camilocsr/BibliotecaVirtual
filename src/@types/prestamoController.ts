import { IMulta } from "../models/Biblioteca";

export interface IMultaPendiente extends IMulta {
    estado: 'pendiente' | 'pagada' | 'perdonada';
}