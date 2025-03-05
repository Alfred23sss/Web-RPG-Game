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
            console.log('USER JOINED');
            this.socketClientService.getLobbyPlayers(this.accessCode).subscribe({
                next: (players) => {
                    this.lobby.players = players;
                },
                error: (err) => {
                    console.error('Error fetching players:', err);
                },
            });
        });

        this.socketClientService.onLobbyUpdate((players: Player[]) => {
            console.log('Received updated player list:', players);
            this.lobby.players = players;
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

        this.socketClientService.onLobbyDeleted(() => {
            this.navigateToHome();
        });
        // this.socketClientService.createLobby(this.accessCode);

        // this.player = {
        //     name: 'default',
        //     avatar: 'default-avatar.png',
        //     speed: 5,
        //     vitality: 10,
        //     attack: { value: 3, bonusDice: DiceType.D6 },
        //     defense: { value: 2, bonusDice: DiceType.D6 },
        //     hp: { current: 10, max: 10 },
        //     movementPoints: 3,
        //     actionPoints: 2,
        //     inventory: [null, null],
        //     isAdmin: true,
        // };

        // this.socketClientService.addToLobby(this.player);

        // this.socketClientService.onLobbyUpdate((lobby: Player[]) => {
        //     this.lobby = lobby;
        //     console.log('Waiting line updated:', this.lobby);
        // });

        // this.socketClientService.onGameDeleted((message: string) => {
        //     console.log(message);
        //     this.router.navigate([Routes.HomePage]);
        // });
    }

    ngOnDestroy(): void {
        if (this.accessCode && this.player) {
            this.socketClientService.removePlayerFromLobby(this.accessCode, this.player.name);
            if (this.player.isAdmin) {
                this.socketClientService.deleteLobby(this.accessCode);
            }
        }
    }

    navigateToHome(): void {
        this.router.navigate([Routes.HomePage]);
    }
}
