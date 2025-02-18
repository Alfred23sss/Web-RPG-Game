import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';

@Injectable({
    providedIn: 'root',
})
export class SocketClientService {
    socket: Socket;

    constructor() {
        this.connect();
    }

    connect() {
        this.socket = io('ws://localhost:3000', {
            // Ajoutez le namespace ici
            transports: ['websocket'],
            upgrade: false,
        });

        this.socket.on('connect', () => {
            console.log('Connecté au serveur WebSocket');
        });

        this.socket.on('connect_error', (error) => {
            console.error('Erreur de connexion WebSocket:', error);
        });
    }

    sendMessage(message: string) {
        this.socket.emit('broadcastAll', message);
    }

    onMessage(callback: (message: string) => void) {
        this.socket.on('massMessage', callback);
    }
}
