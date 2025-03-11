import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Routes } from '@app/enums/global.enums';
import { Lobby } from '@app/interfaces/lobby';
import { Player } from '@app/interfaces/player';
import { AccessCodeService } from '@app/services/access-code/access-code.service';
import { SnackbarService } from '@app/services/snackbar/snackbar.service';
import { SocketClientService } from '@app/services/socket/socket-client-service';
@Component({
    selector: 'app-waiting-view',
    templateUrl: './waiting-view.component.html',
    styleUrls: ['./waiting-view.component.scss'],
})
export class WaitingViewComponent implements OnInit, OnDestroy {
    accessCode: string;
    player: Player;
    lobby: Lobby;
    isLoading: boolean = true;
    isGameStarting: boolean = false;
    isGameStartedEmitted: boolean = false;

    constructor(
        private router: Router,
        private readonly socketClientService: SocketClientService,
        private readonly accessCodeService: AccessCodeService,
        private readonly snackbarService: SnackbarService,
    ) {}

    ngOnInit(): void {
        this.accessCode = this.accessCodeService.getAccessCode();

        this.lobby = {
            isLocked: false,
            accessCode: this.accessCode,
            players: [],
            game: null,
            maxPlayers: 0,
        };

        const storedPlayer = sessionStorage.getItem('player');
        if (storedPlayer) {
            this.player = JSON.parse(storedPlayer);
        }

        this.socketClientService.getLobby(this.accessCode).subscribe({
            next: (lobby) => {
                this.lobby = lobby;
                this.isLoading = false;
            },
            error: () => {
                this.isLoading = false;
                this.navigateToHome();
            },
        });

        this.socketClientService.onJoinLobby(() => {
            this.socketClientService.getLobbyPlayers(this.accessCode).subscribe({
                next: (players) => {
                    this.lobby.players = players;
                },
                error: () => {
                    throw new Error('Error fetching players');
                },
            });
        });

        this.socketClientService.onLobbyUpdate((players: Player[]) => {
            this.lobby.players = players;
        });

        this.socketClientService.onLeaveLobby(() => {
            this.socketClientService.getLobbyPlayers(this.accessCode).subscribe({
                next: (players) => {
                    this.lobby.players = players;
                },
                error: () => {
                    throw new Error('Error fetching players');
                },
            });
        });

        this.socketClientService.onLobbyLocked(({ accessCode, isLocked }) => {
            if (this.accessCode === accessCode) {
                this.lobby.isLocked = isLocked;
            }
        });

        this.socketClientService.onLobbyUnlocked(({ accessCode, isLocked }) => {
            if (this.accessCode === accessCode) {
                this.lobby.isLocked = isLocked;
            }
        });

        this.socketClientService.onLobbyDeleted(() => {
            this.navigateToHome();
        });

        this.socketClientService.onAlertGameStarted((data) => {
            sessionStorage.setItem('game', JSON.stringify(data.updatedGame));
            sessionStorage.setItem('orderedPlayers', JSON.stringify(data.orderedPlayers));
            this.navigateToGame();
        });
    }

    ngOnDestroy(): void {
        if (this.accessCode && this.player && !this.isGameStarting) {
            this.socketClientService.removePlayerFromLobby(this.accessCode, this.player.name);
            if (this.player.isAdmin) {
                this.socketClientService.deleteLobby(this.accessCode);
            }
        }
        this.removeSocketListeners();
        // pas oublier de off des sockets ensuite
    }

    changeLobbyLockStatus(): void {
        if (this.lobby.isLocked) {
            if (this.lobby.players.length < this.lobby.maxPlayers) {
                this.socketClientService.unlockLobby(this.accessCode);
            } else {
                this.snackbarService.showMessage('Le lobby est plein, impossible de le déverrouiller.');
            }
        } else {
            this.socketClientService.lockLobby(this.accessCode);
        }
    }
    navigateToHome(): void {
        this.router.navigate([Routes.HomePage]);
    }

    navigateToGame() {
        if (this.player.isAdmin && !this.isGameStartedEmitted) {
            this.isGameStartedEmitted = true;
            this.socketClientService.alertGameStarted(this.accessCode);
        }
        this.isGameStarting = true;
        sessionStorage.setItem('lobby', JSON.stringify(this.lobby));
        this.router.navigate([Routes.Game]);
    }

    private removeSocketListeners(): void {
        this.socketClientService.socket.off('joinLobby');
        this.socketClientService.socket.off('lobbyUpdate');
        this.socketClientService.socket.off('leaveLobby');
        this.socketClientService.socket.off('lobbyLocked');
        this.socketClientService.socket.off('lobbyUnlocked');
        this.socketClientService.socket.off('lobbyDeleted');
        this.socketClientService.socket.off('alertGameStarted');
    }
}
