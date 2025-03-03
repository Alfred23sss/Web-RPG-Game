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
    // new

    createLobby(lobbyId: string) {
        this.socket.emit('createLobby', lobbyId);
    }

    joinLobby(lobbyId: string, player: Player) {
        this.socket.emit('joinLobby', { lobbyId, player });
    }

    leaveLobby(lobbyId: string, playerName: string) {
        this.socket.emit('leaveLobby', { lobbyId, playerName });
    }

    deleteLobby(lobbyId: string) {
        this.socket.emit('deleteLobby', lobbyId);
    }

    onLobbyUpdate(callback: (players: Player[]) => void) {
        this.socket.on('lobbyUpdated', callback);
    }

    onLobbyDeleted(callback: (message: string) => void) {
        this.socket.on('lobbyDeleted', callback);
    }

    getSocketId() {
        return this.socket.id;
    }
    // rest

    sendMessage(message: string) {
        this.socket.emit('broadcastAll', message);
    }

    createRoom(room: string) {
        this.socket.emit('createLobby', room);
    }

    joinRoom(room: string) {
        this.socket.emit('joinLobby', room);
    }

    deleteRoom(room: string) {
        this.socket.emit('deleteLobby', room);
    }

    leaveRoom(room: string) {
        this.socket.emit('leaveLobby', room);
    }

    addToLobby(player: Player) {
        this.socket.emit('joinLobby', player);
    }

    removeFromLobby(playerId: string) {
        this.socket.emit('leaveLobby', playerId);
    }

    // onLobbyUpdate(callback: (waitingLine: Player[]) => void) {
    //     this.socket.on('waitingLineUpdated', callback);
    // }

    onGameDeleted(callback: (message: string) => void) {
        this.socket.on('gameDeleted', callback);
    }

    sendMessageToOthers(message: string, room: string) {
        this.socket.emit('roomMessage', { room, message });
    }

    onMessage(callback: (message: string) => void) {
        this.socket.on('roomMessage', callback);
    }

    // getSocketId() {
    //     return this.socket.id;
    // }
}
