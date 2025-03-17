import { AsyncPipe } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MIN_PLAYERS } from '@app/constants/global.constants';
import { ErrorMessages, Routes } from '@app/enums/global.enums';
import { Lobby } from '@app/interfaces/lobby';
import { Player } from '@app/interfaces/player';
import { AccessCodeService } from '@app/services/access-code/access-code.service';
import { LobbyService } from '@app/services/lobby/lobby.service';
import { SnackbarService } from '@app/services/snackbar/snackbar.service';
import { SocketClientService } from '@app/services/socket/socket-client-service';
import { Subscription } from 'rxjs';
@Component({
    selector: 'app-waiting-view',
    templateUrl: './waiting-view.component.html',
    styleUrls: ['./waiting-view.component.scss'],
    standalone: true,
    imports: [AsyncPipe],
})
export class WaitingViewComponent implements OnInit, OnDestroy {
    accessCode: string;
    player: Player;
    // lobby: Lobby;
    // isLoading: boolean = true;
    lobby: Lobby;

    lobby$ = this.lobbyService.lobby;
    isLoading$ = this.lobbyService.isLoading;
    isGameStarting: boolean = false;
    isGameStartedEmitted: boolean = false;
    private subscriptions = new Subscription();

    constructor(
        //
        private router: Router,
        private readonly socketClientService: SocketClientService,
        private readonly accessCodeService: AccessCodeService,
        private readonly snackbarService: SnackbarService,
        //
        private readonly lobbyService: LobbyService,
    ) {}

    ngOnInit(): void {
        this.lobbyService.initializeLobby();
        this.lobbyService.initializeKickSocket();

        this.player = this.lobbyService.getPlayer();
        console.log('Player chargé :', this.player);

        this.subscriptions.add(//deplacer dans une fnction
            this.lobbyService.kickedPlayer$.subscribe((kickedPlayer) => {
                if (kickedPlayer.name === this.player.name) {
                    this.router.navigate([Routes.HomePage]);
                }
            }),
        );
    }

    ngOnDestroy(): void {
        const accessCode = this.accessCodeService.getAccessCode(); 

        this.lobbyService.lobby.subscribe((lobby) => {
            if (!lobby || !lobby.players || !accessCode) return;

            const isPlayerInLobby = lobby.players.some((p) => p.name === this.player.name);

            if (isPlayerInLobby && !this.isGameStarting) {
                this.socketClientService.removePlayerFromLobby(accessCode, this.player.name);

                if (this.player.isAdmin) {
                    this.socketClientService.deleteLobby(accessCode);
                }
            }
            sessionStorage.removeItem('player');
            this.removeSocketListeners();
            this.subscriptions.unsubscribe();
        });
    }

    changeLobbyLockStatus(): void {
        this.lobbyService.changeLobbyLockStatus();
    }

    kickPlayer(player: Player): void {
        this.lobbyService.kickPlayer(player);
    }

    navigateToHome(): void {
        this.router.navigate([Routes.HomePage]);
    }

    navigateToGame(): void {//chtml
        this.lobbyService.lobby.subscribe((lobby) => {
            if (!lobby) return;

            if (!lobby.isLocked) {
                this.snackbarService.showMessage(ErrorMessages.LobbyNotLocked);
                return;
            }

            if (lobby.players.length < MIN_PLAYERS) {
                this.snackbarService.showMessage(ErrorMessages.NotEnoughPlayers);
                return;
            }

            if (this.player.isAdmin && !this.isGameStartedEmitted) {
                this.isGameStartedEmitted = true;
                this.socketClientService.alertGameStarted(this.lobbyService.getAccessCode());
            }

            this.isGameStarting = true;
            sessionStorage.setItem('lobby', JSON.stringify(lobby));
            this.router.navigate([Routes.Game]);
        });
    }

    private removeSocketListeners(): void {
        this.lobbyService.removeSocketListeners();
    }
}
