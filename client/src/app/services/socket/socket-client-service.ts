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

    createRoom(room: string) {
        this.socket.emit('create', room);
    }

    joinRoom(room: string) {
        this.socket.emit('joinRoom', room);

        this.socket.on('joinedRoom', (message) => {
            console.log(message); // Should log: "You have joined room XYZ"
        });
    }

    sendMessageToOthers(room: string, message: string) {
        this.socket.emit('roomMessage', { room, message });
    }

    onMessage(callback: (message: string) => void) {
        this.socket.on('massMessage', callback);
    }

    getSocketId() {
        return this.socket.id;
    }
}
