import { Injectable } from '@angular/core';
import { Player } from '@app/interfaces/player';
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

    deleteRoom(room: string) {
        this.socket.emit('deleteRoom', room);
    }

    leaveRoom(room: string) {
        this.socket.emit('leaveRoom', room);
    }

    addToWaitingLine(player: Player) {
        this.socket.emit('addToWaitingLine', player);
    }

    removeFromWaitingLine(playerId: string) {
        this.socket.emit('removeFromWaitingLine', playerId);
    }

    onWaitingLineUpdated(callback: (waitingLine: Player[]) => void) {
        this.socket.on('waitingLineUpdated', callback);
    }

    onGameDeleted(callback: (message: string) => void) {
        this.socket.on('gameDeleted', callback);
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
