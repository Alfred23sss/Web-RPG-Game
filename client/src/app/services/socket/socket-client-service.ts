import { Injectable } from '@angular/core';
import { ErrorMessages, SocketEvent } from '@app/enums/global.enums';
import { Game } from '@app/interfaces/game';
import { Lobby } from '@app/interfaces/lobby';
import { Player } from '@app/interfaces/player';
import { Tile } from '@app/interfaces/tile';
import { AccessCodesCommunicationService } from '@app/services/access-codes-communication/access-codes-communication.service';
import { PlayerMovementService } from '@app/services/player-movement/player-movement.service';
import { Observable } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { environment } from 'src/environments/environment';

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
        this.socket = io(environment.socketUrl, {
            transports: ['websocket'],
            upgrade: false,
        });
    }

    off(event: string) {
        this.socket.off(event);
    }

    async createLobby(game: Game, player: Player): Promise<string> {
        return new Promise((resolve, reject) => {
            this.socket.emit(SocketEvent.CreateLobby, { game });

            this.socket.once(SocketEvent.LobbyCreated, async (data) => {
                if (data?.accessCode) {
                    await this.joinLobby(data.accessCode, player);
                    resolve(data.accessCode);
                } else {
                    reject(new Error(ErrorMessages.NoAccessCode));
                }
            });

            this.socket.once(SocketEvent.Error, (errorMessage) => {
                reject(new Error(`${ErrorMessages.LobbyCreationFailed} ${errorMessage}`));
            });
        });
    }

    async joinLobby(accessCode: string, player: Player): Promise<void> {
        return new Promise((resolve, reject) => {
            this.accessCodeService.validateAccessCode(accessCode).subscribe({
                next: (isValid) => {
                    if (isValid) {
                        this.socket.emit(SocketEvent.JoinLobby, { accessCode, player });

                        this.socket.once(SocketEvent.JoinedLobby, () => {
                            resolve();
                        });

                        this.socket.once(SocketEvent.JoinError, (errorMessage) => {
                            reject(new Error(`${ErrorMessages.JoinFailed} ${errorMessage}`));
                        });
                    } else {
                        reject(new Error(ErrorMessages.InvalidAccessCode));
                    }
                },
                error: () => {
                    reject(new Error(ErrorMessages.ValidationFailed));
                },
            });
        });
    }

    removeAccessCode(code: string) {
        this.accessCodeService.removeAccessCode(code).subscribe({});
    }

    kickPlayer(accessCode: string, playerName: string): void {
        this.socket.emit(SocketEvent.KickPlayer, { accessCode, playerName });
    }

    getLobbyPlayers(accessCode: string) {
        return new Observable<Player[]>((observer) => {
            this.socket.emit(SocketEvent.GetLobbyPlayers, accessCode);

            this.socket.on(SocketEvent.UpdatePlayers, (players: Player[]) => {
                observer.next(players);
            });

            this.socket.on(SocketEvent.Error, (errorMessage: string) => {
                observer.error(errorMessage);
            });
        });
    }

    getLobby(accessCode: string): Observable<Lobby> {
        return new Observable<Lobby>((observer) => {
            this.socket.emit(SocketEvent.GetLobby, accessCode);

            this.socket.once(SocketEvent.UpdateLobby, (lobby: Lobby) => {
                observer.next(lobby);
                observer.complete();
            });

            this.socket.once(SocketEvent.Error, (errorMessage: string) => {
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
        this.emit(SocketEvent.PlayerMovementUpdate, payload);
    }

    on<T>(event: string, callback: (data: T) => void): void {
        this.socket.on(event, callback);
    }
}
