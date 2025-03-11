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
                    await this.joinLobby(data.accessCode, player);
                    resolve(data.accessCode);
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
            this.accessCodeService.validateAccessCode(accessCode).subscribe({
                next: (isValid) => {
                    if (isValid) {
                        this.socket.emit('joinLobby', { accessCode, player });

                        this.socket.once('joinedLobby', () => {
                            resolve();
                        });

                        this.socket.once('joinError', (errorMessage) => {
                            reject(new Error(`Join failed: ${errorMessage}`));
                        });
                    } else {
                        reject(new Error('Invalid access code'));
                    }
                },
                error: () => {
                    reject(new Error('Access code validation failed'));
                },
            });
        });
    }

    removeAccessCode(code: string) {
        this.accessCodeService.removeAccessCode(code).subscribe({});
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
                observer.next(lobby);
                observer.complete();
            });

            this.socket.once('error', (errorMessage: string) => {
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

    onLobbyUpdate(callback: (players: Player[]) => void) {
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

    lockLobby(accessCode: string): void {
        this.socket.emit('lockLobby', accessCode);
    }

    unlockLobby(accessCode: string): void {
        this.socket.emit('unlockLobby', accessCode);
    }

    onLobbyLocked(callback: (data: { accessCode: string; isLocked: boolean }) => void): void {
        this.socket.on('lobbyLocked', callback);
    }

    onLobbyUnlocked(callback: (data: { accessCode: string; isLocked: boolean }) => void): void {
        this.socket.on('lobbyUnlocked', callback);
    }

    getSocketId() {
        return this.socket.id;
    }

    // on(event: string, callback: (data: unknown) => void): void {
    //     this.socket.on(event, callback);
    // }

    emit(event: string, data: unknown): void {
        // AJOUT2!!!!!
        this.socket.emit(event, data);
    }

    onUpdateUnavailableOptions(callback: (data: { names: string[]; avatars: string[] }) => void): void {
        // AJOUT2!!!!!
        this.socket.on('updateUnavailableOptions', callback);
    }

    onJoinError(callback: (message: string) => void): void {
        this.socket.on('joinError', callback);
    }

    selectAvatar(accessCode: string, avatar: string): void {
        this.socket.emit('selectAvatar', { accessCode, avatar });
    }
    
    deselectAvatar(accessCode: string): void {
        this.socket.emit('deselectAvatar', { accessCode });
    }
    
    onAvatarSelected(callback: (data: { avatar: string }) => void): void {
        this.socket.on('avatarSelected', callback);
    }
    
    onAvatarDeselected(callback: () => void): void {
        this.socket.on('avatarDeselected', callback);
    }
    on<T>(event: string, callback: (data: T) => void): void {
        this.socket.on(event, callback);
    }
}
