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
    }

    sendMessage(message: string) {
        this.socket.emit('broadcastAll', message);
    }

    createRoom(room: string) {
        this.socket.emit('create', room);
    }

    joinRoom(room: string) {
        this.socket.emit('joinRoom', room);
    }

    sendMessageToOthers(message: string, room: string) {
        this.socket.emit('roomMessage', { room, message });
    }

    onMessage(callback: (message: string) => void) {
        this.socket.on('roomMessage', callback);
    }

    getSocketId() {
        return this.socket.id;
    }
}
