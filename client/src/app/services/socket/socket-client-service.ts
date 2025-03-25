import { Injectable } from '@angular/core';
import { Game } from '@app/interfaces/game';
import { Lobby } from '@app/interfaces/lobby';
import { Player } from '@app/interfaces/player';
import { Tile } from '@app/interfaces/tile';
import { AccessCodesCommunicationService } from '@app/services/access-codes-communication/access-codes-communication.service';
import { PlayerMovementService } from '@app/services/player-movement/player-movement.service';
import { Observable } from 'rxjs';
import { io, Socket } from 'socket.io-client';

@Injectable({
    providedIn: 'root',
})
export class SocketClientService {
    socket: Socket;

    constructor(
        private readonly accessCodeService: AccessCodesCommunicationService,
        private playerMovementService: PlayerMovementService,
    ) {
        this.connect();
    }

    connect() {
        this.socket = io('ws://localhost:3000', {
            transports: ['websocket'],
            upgrade: false,
        });
    }

    off(event: string) {
        this.socket.off(event);
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

    kickPlayer(accessCode: string, playerName: string): void {
        this.socket.emit('kickPlayer', { accessCode, playerName });
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

    getSocketId() {
        return this.socket.id;
    }

    emit(event: string, data: unknown): void {
        this.socket.emit(event, data);
    }

    sendPlayerMovementUpdate(currentTile: Tile, targetTile: Tile, accessCode: string, grid: Tile[][]): void {
        const movementPath = this.playerMovementService.quickestPath(currentTile, targetTile, grid);
        if (!movementPath) {
            return;
        }
        const payload = {
            previousTile: currentTile,
            newTile: targetTile,
            movement: movementPath,
            accessCode,
        };
        this.emit('playerMovementUpdate', payload);
    }

    on<T>(event: string, callback: (data: T) => void): void {
        this.socket.on(event, callback);
    }
}
