/* eslint-disable @typescript-eslint/member-ordering */
// disabled, because the order is impossible to respect since the subjects need to be defined before we can use them...
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { GAME_STORAGE, LOBBY_STORAGE, MIN_PLAYERS, ORDERED_PLAYERS_STORAGE, PLAYER_STORAGE } from '@app/constants/global.constants';
import { ErrorMessages, SnackBarMessage, SocketEvent } from '@app/enums/global.enums';
import { Game } from '@app/interfaces/game';
import { Lobby } from '@app/interfaces/lobby';
import { Player } from '@app/interfaces/player';
import { AccessCodeService } from '@app/services/access-code/access-code.service';
import { SnackbarService } from '@app/services/snackbar/snackbar.service';
import { SocketClientService } from '@app/services/socket/socket-client-service';
import { Routes } from '@common/enums';
import { BehaviorSubject } from 'rxjs';

@Injectable({
    providedIn: 'root',
})
export class LobbyService {
    accessCode: string;
    private lobbySubject = new BehaviorSubject<Lobby | null>(null);
    private isLoadingSubject = new BehaviorSubject<boolean>(true);
    private playerSubject = new BehaviorSubject<Player | null>(null);
    private isGameStartingSubject = new BehaviorSubject<boolean>(false);

    lobby$ = this.lobbySubject.asObservable();
    isLoading$ = this.isLoadingSubject.asObservable();
    player$ = this.playerSubject.asObservable();
    isGameStarting$ = this.isGameStartingSubject.asObservable();

    constructor(
        private router: Router,
        private socketClientService: SocketClientService,
        private accessCodeService: AccessCodeService,
        private snackbarService: SnackbarService,
    ) {}

    setIsGameStarting(isStarting: boolean): void {
        this.isGameStartingSubject.next(isStarting);
    }

    initializeLobby(): void {
        this.accessCode = this.accessCodeService.getAccessCode();
        this.isLoadingSubject.next(true);

        const storedPlayer = sessionStorage.getItem(PLAYER_STORAGE);
        if (storedPlayer) {
            this.playerSubject.next(JSON.parse(storedPlayer));
        }

        this.socketClientService.getLobby(this.accessCode).subscribe({
            next: (lobby) => {
                this.lobbySubject.next(lobby);
                this.isLoadingSubject.next(false);
            },
            error: () => {
                this.isLoadingSubject.next(false);
                this.navigateToHome();
            },
        });

        this.initializeSocketListeners();
    }

    removePlayerAndCleanup(player: Player | null, lobby: Lobby | null): void {
        if (!player || !lobby) return;

        const isPlayerInLobby = lobby.players.some((p) => p.name === player.name);
        if (this.accessCode && isPlayerInLobby && !this.isGameStartingSubject.value) {
            this.socketClientService.emit(SocketEvent.ManualDisconnect, { isInGame: false });
        }
    }
    navigateToHome(): void {
        this.router.navigate([Routes.HomePage]);
    }

    navigateToGame(): void {
        const lobby = this.lobbySubject.value;
        if (!lobby?.isLocked) {
            this.snackbarService.showMessage(ErrorMessages.LobbyNotLocked);
            return;
        }
        if (lobby.players.length < MIN_PLAYERS) {
            this.snackbarService.showMessage(ErrorMessages.NotEnoughPlayers);
            return;
        }
        this.setIsGameStarting(true);
        sessionStorage.setItem(LOBBY_STORAGE, JSON.stringify(lobby));
        this.router.navigate([Routes.Game]);
    }

    removeSocketListeners(): void {
        this.socketClientService.socket.off(SocketEvent.JoinLobby);
        this.socketClientService.socket.off(SocketEvent.LobbyUpdate);
        this.socketClientService.socket.off(SocketEvent.ManualDisconnect);
        this.socketClientService.socket.off(SocketEvent.KickPlayer);
        this.socketClientService.socket.off(SocketEvent.LobbyLocked);
        this.socketClientService.socket.off(SocketEvent.LobbyUnlocked);
        this.socketClientService.socket.off(SocketEvent.LobbyDeleted);
        this.socketClientService.socket.off(SocketEvent.AlertGameStarted);
    }

    private initializeSocketListeners(): void {
        this.socketClientService.on(SocketEvent.JoinLobby, () => this.updatePlayers());
        this.socketClientService.on(SocketEvent.LeftLobby, () => this.updatePlayers());

        this.socketClientService.on(SocketEvent.UpdatePlayers, (players: Player[]) => {
            const lobby = this.lobbySubject.value;
            if (lobby) {
                lobby.players = players;
                this.lobbySubject.next({ ...lobby });

                const currentPlayer = this.playerSubject.value;
                if (currentPlayer) {
                    const updatedPlayer = players.find((p) => p.avatar === currentPlayer.avatar);
                    if (updatedPlayer) {
                        currentPlayer.name = updatedPlayer.name;
                        sessionStorage.setItem(PLAYER_STORAGE, JSON.stringify(currentPlayer));
                        this.playerSubject.next({ ...currentPlayer });
                    }
                }
            }
        });

        this.socketClientService.on<{ accessCode: string; playerName: string }>(SocketEvent.Kicked, (data) => {
            const { accessCode, playerName } = data;

            if (accessCode === this.accessCode && playerName === this.playerSubject.value?.name) {
                this.snackbarService.showMessage(SnackBarMessage.LobbyExpulsion);
                this.navigateToHome();
            }
        });

        this.socketClientService.on<{ accessCode: string; isLocked: boolean }>(SocketEvent.LobbyLocked, ({ accessCode, isLocked }) => {
            const lobby = this.lobbySubject.value;
            if (lobby && accessCode === this.accessCode) {
                this.lobbySubject.next({ ...lobby, isLocked });
            }
        });

        this.socketClientService.on<{ accessCode: string; isLocked: boolean }>(SocketEvent.LobbyUnlocked, ({ accessCode, isLocked }) => {
            const lobby = this.lobbySubject.value;
            if (lobby && accessCode === this.accessCode) {
                this.lobbySubject.next({ ...lobby, isLocked });
            }
        });

        this.socketClientService.on(SocketEvent.LobbyDeleted, () => this.navigateToHome());

        this.socketClientService.on(SocketEvent.GameStarted, (data: { orderedPlayers: Player[]; updatedGame: Game }) => {
            sessionStorage.setItem(GAME_STORAGE, JSON.stringify(data.updatedGame));
            sessionStorage.setItem(ORDERED_PLAYERS_STORAGE, JSON.stringify(data.orderedPlayers));
            this.navigateToGame();
        });

        this.socketClientService.on(SocketEvent.AdminLeft, (data: { playerSocketId: string; message: string }) => {
            if (this.socketClientService.getSocketId() !== data.playerSocketId) {
                this.snackbarService.showMessage(data.message);
            }
        });
    }

    private updatePlayers(): void {
        this.socketClientService.getLobbyPlayers(this.accessCode).subscribe({
            next: (players) => {
                const lobby = this.lobbySubject.value;
                if (lobby) {
                    this.lobbySubject.next({ ...lobby, players });
                }
            },
        });
    }
}
