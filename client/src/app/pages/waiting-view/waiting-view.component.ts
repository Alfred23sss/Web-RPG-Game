import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
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

    constructor(
        private router: Router,
        private readonly socketClientService: SocketClientService,
        private readonly accessCodeService: AccessCodeService,
        private readonly snackbarService: SnackbarService,
        private readonly cdr: ChangeDetectorRef,
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
        console.log(this.player);

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

        this.socketClientService.onLobbyUpdate((players: Player[]) => {
            this.lobby.players = players;
            this.cdr.detectChanges();
        });

        this.socketClientService.onKicked(({ accessCode, playerName }) => {
            if (accessCode === this.accessCode && playerName === this.player.name) {
                this.snackbarService.showMessage('Vous avez été expulsé du lobby.');
                this.navigateToHome();
            }
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
    }

    ngOnDestroy(): void {
        const isPlayerInLobby = this.lobby.players.some((p) => p.name === this.player.name);
        if (this.accessCode && isPlayerInLobby) {
            this.socketClientService.removePlayerFromLobby(this.accessCode, this.player.name);
            if (this.player.isAdmin) {
                this.socketClientService.deleteLobby(this.accessCode);
            }
        }
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

    kickPlayer(player: Player): void {
        if (this.accessCode) {
            this.socketClientService.emit('kickPlayer', {
                accessCode: this.accessCode,
                playerName: player.name,
            });

            this.lobby.players = this.lobby.players.filter((p) => p.name !== player.name);
        }
    }

    navigateToHome(): void {
        this.router.navigate([Routes.HomePage]);
    }
}
