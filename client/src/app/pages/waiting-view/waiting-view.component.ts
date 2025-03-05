import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Routes } from '@app/enums/global.enums';
import { Lobby } from '@app/interfaces/lobby';
import { Player } from '@app/interfaces/player';
import { AccessCodeService } from '@app/services/access-code/access-code.service';
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
    ) {}

    ngOnInit(): void {
        this.accessCode = this.accessCodeService.getAccessCode();

        this.lobby = {
            isLocked: false,
            accessCode: this.accessCode,
            players: [],
            game: null,
        };

        const storedPlayer = sessionStorage.getItem('player');
        if (storedPlayer) {
            this.player = JSON.parse(storedPlayer);
        }

        console.log('access code :', this.accessCode);

        this.socketClientService.getLobby(this.accessCode).subscribe({
            next: (lobby) => {
                this.lobby = lobby;
                this.isLoading = false;
            },
            error: (err) => {
                console.error('Error fetching lobby:', err);
                this.isLoading = false;
                this.navigateToHome();
            },
        });

        this.socketClientService.onJoinLobby(() => {
            this.socketClientService.getLobbyPlayers(this.accessCode).subscribe({
                next: (players) => {
                    this.lobby.players = players;
                },
                error: (err) => {
                    console.error('Error fetching players:', err);
                },
            });
        });

        this.socketClientService.onLeaveLobby(() => {
            this.socketClientService.getLobbyPlayers(this.accessCode).subscribe({
                next: (players) => {
                    this.lobby.players = players;
                },
                error: (err) => {
                    console.error('Error fetching players:', err);
                },
            });
        });

        this.socketClientService.onLobbyLocked((data) => {
            if (data.accessCode === this.accessCode) {
                this.lobby.isLocked = true;
            }
        });

        this.socketClientService.onLobbyUnlocked((data) => {
            if (data.accessCode === this.accessCode) {
                this.lobby.isLocked = false;
            }
        });

        this.socketClientService.onLobbyDeleted(() => {
            this.navigateToHome();
        });
    }

    ngOnDestroy(): void {
        if (this.accessCode && this.player) {
            this.socketClientService.removePlayerFromLobby(this.accessCode, this.player.name);
            if (this.player.isAdmin) {
                this.socketClientService.deleteLobby(this.accessCode);
            }
        }
    }

    changeLobbyLockStatus(): void {
        if (!this.player.isAdmin) return;

        if (this.lobby.isLocked) {
            this.socketClientService.unlockLobby(this.accessCode);
        } else {
            this.socketClientService.lockLobby(this.accessCode);
        }
    }
    navigateToHome(): void {
        this.router.navigate([Routes.HomePage]);
    }
}
