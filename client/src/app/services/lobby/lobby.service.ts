/* eslint-disable @typescript-eslint/member-ordering */
// disabled, car l'ordre n'est pas possible à respecter, car les subject doivent etre defini avant d'etre utilisé...
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { MIN_PLAYERS } from '@app/constants/global.constants';
import { ErrorMessages, Routes } from '@app/enums/global.enums';
import { Lobby } from '@app/interfaces/lobby';
import { Player } from '@app/interfaces/player';
import { AccessCodeService } from '@app/services/access-code/access-code.service';
import { SnackbarService } from '@app/services/snackbar/snackbar.service';
import { SocketClientService } from '@app/services/socket/socket-client-service';
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

        const storedPlayer = sessionStorage.getItem('player');
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
            this.socketClientService.removePlayerFromLobby(this.accessCode, player.name);
            if (player.isAdmin) {
                this.socketClientService.deleteLobby(this.accessCode);
            }
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
        this.router.navigate([Routes.Game]);
    }

    removeSocketListeners(): void {
        this.socketClientService.socket.off('joinLobby');
        this.socketClientService.socket.off('lobbyUpdate');
        this.socketClientService.socket.off('leaveLobby');
        this.socketClientService.socket.off('kicked');
        this.socketClientService.socket.off('lobbyLocked');
        this.socketClientService.socket.off('lobbyUnlocked');
        this.socketClientService.socket.off('lobbyDeleted');
        this.socketClientService.socket.off('alertGameStarted');
    }

    private initializeSocketListeners(): void {
        this.socketClientService.onJoinLobby(() => this.updatePlayers());
        this.socketClientService.onLeaveLobby(() => this.updatePlayers());

        this.socketClientService.onLobbyUpdate((players: Player[]) => {
            const lobby = this.lobbySubject.value;
            if (lobby) {
                lobby.players = players;
                this.lobbySubject.next({ ...lobby });

                const currentPlayer = this.playerSubject.value;
                if (currentPlayer) {
                    const updatedPlayer = players.find((p) => p.avatar === currentPlayer.avatar);
                    if (updatedPlayer) {
                        currentPlayer.name = updatedPlayer.name;
                        sessionStorage.setItem('player', JSON.stringify(currentPlayer));
                        this.playerSubject.next({ ...currentPlayer });
                    }
                }
            }
        });

        this.socketClientService.onKicked(({ accessCode, playerName }) => {
            if (accessCode === this.accessCode && playerName === this.playerSubject.value?.name) {
                this.snackbarService.showMessage('Vous avez été expulsé du lobby.');
                this.navigateToHome();
            }
        });

        this.socketClientService.onLobbyLocked(({ accessCode, isLocked }) => {
            const lobby = this.lobbySubject.value;
            if (lobby && accessCode === this.accessCode) {
                this.lobbySubject.next({ ...lobby, isLocked });
            }
        });

        this.socketClientService.onLobbyUnlocked(({ accessCode, isLocked }) => {
            const lobby = this.lobbySubject.value;
            if (lobby && accessCode === this.accessCode) {
                this.lobbySubject.next({ ...lobby, isLocked });
            }
        });

        this.socketClientService.onLobbyDeleted(() => this.navigateToHome());

        this.socketClientService.onAlertGameStarted((data) => {
            sessionStorage.setItem('game', JSON.stringify(data.updatedGame));
            sessionStorage.setItem('orderedPlayers', JSON.stringify(data.orderedPlayers));
            this.navigateToGame();
        });

        this.socketClientService.onAdminLeft((data) => {
            this.snackbarService.showMessage(data.message);
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
            error: () => {
                this.snackbarService.showMessage('Error fetching players'); // debug
            },
        });
    }
}
