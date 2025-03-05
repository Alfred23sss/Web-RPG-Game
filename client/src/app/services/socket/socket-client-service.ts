import { Injectable } from '@angular/core';
import { Game } from '@app/interfaces/game';
import { Lobby } from '@app/interfaces/lobby';
import { Player } from '@app/interfaces/player';
import { AccessCodesCommunicationService } from '@app/services/access-codes-communication/access-codes-communication.service';
import { Observable } from 'rxjs';
import { io, Socket } from 'socket.io-client';

@Injectable({
    providedIn: 'root',
})
export class SocketClientService {
    socket: Socket;

    constructor(private readonly accessCodeService: AccessCodesCommunicationService) {
        this.connect();
    }

    connect() {
        this.socket = io('ws://localhost:3000', {
            transports: ['websocket'],
            upgrade: false,
        });
    }

    async createLobby(game: Game, player: Player): Promise<string> {
        return new Promise((resolve, reject) => {
            this.socket.emit('createLobby', { game });

            this.socket.once('lobbyCreated', async (data) => {
                if (data?.accessCode) {
                    console.log(`Lobby created with access code: ${data.accessCode}`);

                    try {
                        await this.joinLobby(data.accessCode, player);
                        resolve(data.accessCode);
                    } catch (error) {
                        console.error(error);
                    }
                } else {
                    reject(new Error('Failed to create lobby: No access code received'));
                }
            });

            this.socket.once('error', (errorMessage) => {
                reject(new Error(`Lobby creation failed: ${errorMessage}`));
            });
        });
    }

    async joinLobby(accessCode: string, player: Player): Promise<void> {
        return new Promise((resolve, reject) => {
            console.log('Joining lobby...');

            this.accessCodeService.validateAccessCode(accessCode).subscribe({
                next: (isValid) => {
                    if (isValid) {
                        this.socket.emit('joinLobby', { accessCode, player });

                        this.socket.once('joinedLobby', () => {
                            console.log('Successfully joined lobby');
                            resolve();
                        });

                        this.socket.once('joinError', (errorMessage) => {
                            console.error('Join error:', errorMessage);
                            reject(new Error(`Join failed: ${errorMessage}`));
                        });
                    } else {
                        reject(new Error('Invalid access code'));
                    }
                },
                error: (err) => {
                    console.error('Error validating access code:', err);
                    reject(new Error('Access code validation failed'));
                },
            });
        });
    }

    removeAccessCode(code: string) {
        this.accessCodeService.removeAccessCode(code).subscribe({
            next: () => {
                console.log(`Access code ${code} removed successfully`);
            },
            error: (err) => console.error('Error removing access code:', err),
        });
    }

    getLobbyPlayers(accessCode: string) {
        return new Observable<Player[]>((observer) => {
            this.socket.emit('getLobbyPlayers', accessCode);
            this.socket.on('updatePlayers', (players: Player[]) => {
                observer.next(players);
            });
            this.socket.on('error', (errorMessage: string) => {
                observer.error(errorMessage);
            });
        });
    }

    getLobby(accessCode: string): Observable<Lobby> {
        return new Observable<Lobby>((observer) => {
            this.socket.emit('getLobby', accessCode);

            this.socket.once('updateLobby', (lobby: Lobby) => {
                console.log('Received lobby update:', lobby);
                observer.next(lobby);
                observer.complete();
            });

            this.socket.once('error', (errorMessage: string) => {
                console.error('Socket error:', errorMessage);
                observer.error(errorMessage);
            });
        });
    }

    addPlayerToLobby(accessCode: string, player: unknown) {
        this.socket.emit('joinLobby', { accessCode, player });
    }

    removePlayerFromLobby(accessCode: string, playerName: string) {
        this.socket.emit('leaveLobby', { accessCode, playerName });
    }

    deleteLobby(accessCode: string) {
        this.socket.emit('deleteLobby', accessCode);
    }

    onLobbyUpdate(callback: (players: unknown[]) => void) {
        this.socket.on('updatePlayers', callback);
    }

    onLobbyError(callback: (error: string) => void) {
        this.socket.on('error', callback);
    }

    onLobbyCreated(callback: (players: unknown[]) => void) {
        this.socket.on('lobbyCreated', callback);
    }

    onLobbyDeleted(callback: () => void) {
        this.socket.on('lobbyDeleted', callback);
    }

    onLeaveLobby(callback: () => void) {
        this.socket.on('leftLobby', callback);
    }

    onJoinLobby(callback: () => void) {
        this.socket.on('joinedLobby', callback);
    }

    getSocketId() {
        return this.socket.id;
    }

    on(event: string, callback: (data: any) => void): void { //AJOUT!!!!!!!!
        this.socket.on(event, callback);
    }

    emit(event: string, data: any): void {//AJOUT2!!!!!
        this.socket.emit(event, data);
    }

    onUpdateUnavailableOptions(callback: (data: { names: string[], avatars: string[] }) => void): void {//AJOUT2!!!!!
        this.socket.on('updateUnavailableOptions', callback);
    }

    onJoinError(callback: (message: string) => void): void {
        this.socket.on('joinError', callback);
    }
    

    
    
    
    
    

    // new

    // createLobby(lobbyId: string) {
    //     this.socket.emit('createLobby', lobbyId);
    // }

    // joinLobby(lobbyId: string, player: Player) {
    //     this.socket.emit('joinLobby', { lobbyId, player });
    // }

    // leaveLobby(lobbyId: string, playerName: string) {
    //     this.socket.emit('leaveLobby', { lobbyId, playerName });
    // }

    // deleteLobby(lobbyId: string) {
    //     this.socket.emit('deleteLobby', lobbyId);
    // }

    // onLobbyUpdate(callback: (players: Player[]) => void) {
    //     this.socket.on('lobbyUpdated', callback);
    // }

    // onLobbyDeleted(callback: (message: string) => void) {
    //     this.socket.on('lobbyDeleted', callback);
    // }

    // getSocketId() {
    //     return this.socket.id;
    // }
    // // rest

    // sendMessage(message: string) {
    //     this.socket.emit('broadcastAll', message);
    // }

    // createRoom(room: string) {
    //     this.socket.emit('createLobby', room);
    // }

    // joinRoom(room: string) {
    //     this.socket.emit('joinLobby', room);
    // }

    // deleteRoom(room: string) {
    //     this.socket.emit('deleteLobby', room);
    // }

    // leaveRoom(room: string) {
    //     this.socket.emit('leaveLobby', room);
    // }

    // addToLobby(player: Player) {
    //     this.socket.emit('joinLobby', player);
    // }

    // removeFromLobby(playerId: string) {
    //     this.socket.emit('leaveLobby', playerId);
    // }

    // // onLobbyUpdate(callback: (waitingLine: Player[]) => void) {
    // //     this.socket.on('waitingLineUpdated', callback);
    // // }

    // onGameDeleted(callback: (message: string) => void) {
    //     this.socket.on('gameDeleted', callback);
    // }

    // sendMessageToOthers(message: string, room: string) {
    //     this.socket.emit('roomMessage', { room, message });
    // }

    // onMessage(callback: (message: string) => void) {
    //     this.socket.on('roomMessage', callback);
    // }

    // getSocketId() {
    //     return this.socket.id;
    // }
}
