import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

export class MongoService {
    private static instance: MongoService;
    private isConnected: boolean = false;

    private constructor() { }

    public static getInstance(): MongoService {
        if (!MongoService.instance) {
            MongoService.instance = new MongoService();
        }
        return MongoService.instance;
    }

    public async connect(): Promise<void> {
        if (this.isConnected) {
            console.log('MongoDB ya está conectado');
            return;
        }

        try {
            await mongoose.connect(process.env.MONGODB_URI || '', {
                serverSelectionTimeoutMS: 30000,
            });

            this.isConnected = true;
            console.log('✅ Conexión a MongoDB exitosa');

            mongoose.connection.on('error', (error) => {
                console.error('❌ Error en la conexión de MongoDB:', error);
                this.isConnected = false;
            });

            mongoose.connection.on('disconnected', () => {
                console.log('🔌 MongoDB desconectado');
                this.isConnected = false;
            });

        } catch (error) {
            this.isConnected = false;
            console.error('❌ Error al conectar a MongoDB:', (error as Error).message);
            throw error;
        }
    }

    public async disconnect(): Promise<void> {
        if (!this.isConnected) {
            return;
        }

        try {
            await mongoose.disconnect();
            this.isConnected = false;
            console.log('MongoDB desconectado exitosamente');
        } catch (error) {
            console.error('Error al desconectar MongoDB:', (error as Error).message);
            throw error;
        }
    }

    public getConnection(): mongoose.Connection {
        return mongoose.connection;
    }

    public isConnectedToMongo(): boolean {
        return this.isConnected;
    }
}

export const mongoService = MongoService.getInstance();