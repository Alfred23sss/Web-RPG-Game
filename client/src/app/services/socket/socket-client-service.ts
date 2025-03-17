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

    alertGameStarted(accessCode: string) {
        this.socket.emit('createGame', { accessCode });
    }

    onAlertGameStarted(callback: (data: { orderedPlayers: Player[]; updatedGame: Game }) => void) {
        this.socket.on('gameStarted', (data) => {
            callback(data);
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

    onKicked(callback: (data: { accessCode: string; playerName: string }) => void): void {
        this.socket.on('kicked', callback);
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

    emit(event: string, data: unknown): void {
        this.socket.emit(event, data);
    }

    onUpdateUnavailableOptions(callback: (data: { names: string[]; avatars: string[] }) => void): void {
        this.socket.on('updateUnavailableOptions', (data) => {
            callback(data);
        });
    }

    onJoinError(callback: (message: string) => void): void {
        this.socket.on('joinError', callback);
    }

    abandonGame(player: Player, accessCode: string) {
        this.socket.emit('abandonedGame', { player, accessCode });
    }

    onAbandonGame(callback: (data: { player: Player }) => void) {
        this.socket.on('game-abandoned', callback);
    }

    onTransitionStarted(callback: (data: { nextPlayer: Player; transitionDuration: number }) => void) {
        this.socket.on('transitionStarted', callback);
    }

    onTurnStarted(callback: (data: { player: Player; turnDuration: number }) => void) {
        this.socket.on('turnStarted', callback);
    }

    onTimerUpdate(callback: (data: { timeLeft: number }) => void) {
        this.socket.on('timerUpdate', callback);
    }

    endTurn(accessCode: string) {
        this.socket.emit('endTurn', { accessCode });
    }

    // socket.on('turnStarted', (data) => {
    //     console.log('Turn started', data);
    //     // Update UI to show it's this player's turn
    //     updateUI(`${data.player.name}'s turn (${data.turnDuration} seconds)`);

    //     // If it's the current user's turn, enable controls
    //     if (data.player.name === currentPlayerName) {
    //       enableTurnControls();
    //     }
    //   });

    onGameDeleted(callback: () => void) {
        this.socket.on('gameDeleted', callback);
    }

    onGameCombatStarted(callback: () => void) {
        this.socket.on('combatStarted', callback);
    }

    onAttackResult(callback: (data: { success: boolean; attackScore: number; defenseScore: number }) => void) {
        this.socket.on('attackResult', callback);
    }

    onPlayerUpdate(callback: (data: { player: Player }) => void) {
        this.socket.on('playerUpdate', callback);
    }

    onPlayerListUpdate(callback: (data: { players: Player[] }) => void) {
        this.socket.on('playerListUpdate', (data) => {
            callback(data);
        });
    }

    onGameCombatTimerUpdate(callback: (data: { timeLeft: number }) => void) {
        this.socket.on('combatTimerUpdate', callback);
    }

    onGameCombatTimeout(callback: (data: { fighter: Player }) => void) {
        this.socket.on('combatTimeout', callback);
    }

    onGameCombatTurnStarted(callback: (data: { fighter: Player; duration: number; escapeAttemptsLeft: number }) => void) {
        this.socket.on('combatTurnStarted', callback);
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

    startCombat(attackerName: string, defenderName: string, accessCode: string) {
        this.socket.emit('startCombat', { attackerName, defenderName, accessCode });
    }

    onPlayerMovement(callback: (data: { grid: Tile[][]; player: Player; isCurrentlyMoving: boolean }) => void): void {
        this.socket.on('playerMovement', callback);
    }

    selectAvatar(accessCode: string, avatar: string): void {
        this.socket.emit('selectAvatar', { accessCode, avatar });
    }

    deselectAvatar(accessCode: string): void {
        this.socket.emit('deselectAvatar', { accessCode });
    }

    onAvatarSelected(callback: (data: { avatar: string }) => void): void {
        this.socket.on('avatarSelected', (data) => {
            callback(data);
        });
    }

    onAvatarDeselected(callback: () => void): void {
        this.socket.on('avatarDeselected', () => {
            callback();
        });
    }

    on<T>(event: string, callback: (data: T) => void): void {
        this.socket.on(event, callback);
    }

    onDoorClickedUpdate(callback: (data: { grid: Tile[][] }) => void): void {
        this.socket.on('doorClicked', (data) => {
            callback(data);
        });
    }
    sendDoorUpdate(currentTile: Tile, targetTile: Tile, accessCode: string): void {
        const payload = {
            currentTile,
            targetTile,
            accessCode,
        };
        this.emit('doorUpdate', payload);
    }
    onGridUpdate(callback: (data: { grid: Tile[][] }) => void): void {
        this.socket.on('gridUpdate', callback);
    }

    attack(playerName: string, accessCode: string) {
        this.socket.emit('performAttack', { accessCode, attackerName: playerName });
    }
}
