import { Socket } from "socket.io/dist";
import dotenv from 'dotenv';
import { mongoService } from './services/mongo/MongoService';
import authRouter from "./routes/auth.routes";
import librosRoutes from "./routes/books.routes"
import prestamosRoutes from "./routes/prestamos.routes"
import devolucionRoutes from "./routes/devoluciones.routes"

const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

dotenv.config();

const app = express();
const httpServer = createServer(app);

app.use(cors());
app.use(express.json());

app.use('/api', authRouter);
app.use('/api', librosRoutes);
app.use('/api', prestamosRoutes);
app.use('/api', devolucionRoutes);

const io = new Server(httpServer, {
    cors: {
        origin: "*",
        methods: ["GET", "POST", "PUT", "DELETE"]
    }
});

io.on('connection', (socket: Socket) => {
    console.log('Cliente conectado:', socket.id);

    socket.on('disconnect', () => {
        console.log('Cliente desconectado:', socket.id);
    });
});

async function startServer() {
    try {
        await mongoService.connect();

        httpServer.listen(process.env.PORT, () => {
            console.log(`🚀 Servidor iniciado en puerto ${process.env.PORT}`);
        });
    } catch (error) {
        console.error('Error iniciando el servidor:', error);
        process.exit(1);
    }
}

process.on('SIGINT', async () => {
    try {
        await mongoService.disconnect();
        process.exit(0);
    } catch (error) {
        console.error('Error cerrando conexiones:', error);
        process.exit(1);
    }
});

startServer();