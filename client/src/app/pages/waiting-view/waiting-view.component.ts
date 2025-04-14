import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ChatComponent } from '@app/components/chat/chat.component';
import { LOBBY_STORAGE, MIN_PLAYERS } from '@app/constants/global.constants';
import { Behavior, ErrorMessages, GameMode, Routes, SnackBarMessage, SocketEvent } from '@app/enums/global.enums';
import { Lobby } from '@app/interfaces/lobby';
import { Player } from '@app/interfaces/player';
import { LobbyService } from '@app/services/lobby/lobby.service';
import { SnackbarService } from '@app/services/snackbar/snackbar.service';
import { SocketClientService } from '@app/services/socket/socket-client-service';
import { Subscription } from 'rxjs';
@Component({
    selector: 'app-waiting-view',
    templateUrl: './waiting-view.component.html',
    styleUrls: ['./waiting-view.component.scss'],
    imports: [ChatComponent],
})
export class WaitingViewComponent implements OnInit, OnDestroy {
    accessCode: string;
    player: Player | null = null;
    playerName: string;
    lobby: Lobby | null = null;
    isLoading: boolean = true;
    isGameStarting: boolean = false;
    isGameStartedEmitted: boolean = false;
    isDialogOpen: boolean = false;
    selectedBehavior: Behavior;
    behaviors = Object.values(Behavior).filter((b) => b !== Behavior.Null);

    private subscriptions: Subscription = new Subscription();

    constructor(
        private router: Router,
        private readonly socketClientService: SocketClientService,
        private readonly lobbyService: LobbyService,
        private readonly snackbarService: SnackbarService,
    ) {}

    ngOnInit(): void {
        this.lobbyService.initializeLobby();
        this.accessCode = this.lobbyService.accessCode;

        this.subscriptions.add(
            this.lobbyService.player$.subscribe((player) => {
                this.player = player;
                if (player) {
                    this.playerName = player.name;
                }
            }),
        );

        this.subscriptions.add(
            this.lobbyService.lobby$.subscribe((lobby) => {
                this.lobby = lobby;
            }),
        );

        this.subscriptions.add(
            this.lobbyService.isLoading$.subscribe((isLoading) => {
                this.isLoading = isLoading;
            }),
        );

        this.subscriptions.add(
            this.lobbyService.isGameStarting$.subscribe((isStarting) => {
                this.isGameStarting = isStarting;
            }),
        );
    }

    ngOnDestroy(): void {
        this.lobbyService.removePlayerAndCleanup(this.player, this.lobby);
        this.subscriptions.unsubscribe();
        this.lobbyService.removeSocketListeners();
        this.lobbyService.setIsGameStarting(false);
    }

    changeLobbyLockStatus(): void {
        if (!this.lobby) return;
        if (this.lobby.isLocked) {
            if (this.lobby.players.length < this.lobby.maxPlayers) {
                this.socketClientService.emit(SocketEvent.UnlockLobby, this.accessCode);
            } else {
                this.snackbarService.showMessage(SnackBarMessage.LobbyFull);
            }
        } else {
            this.socketClientService.emit(SocketEvent.LockLobby, this.accessCode);
        }
    }

    kickPlayer(player: Player): void {
        if (this.accessCode) {
            this.socketClientService.emit(SocketEvent.KickPlayer, {
                accessCode: this.accessCode,
                playerName: player.name,
            });
        }
    }

    kickVirtualPlayer(player: Player): void {
        this.socketClientService.emit(SocketEvent.KickVirtualPlayer, {
            accessCode: this.accessCode,
            player,
        });
    }

    navigateToHome(): void {
        this.router.navigate([Routes.HomePage]);
    }

    navigateToGame() {
        if (!this.lobby) return;
        if (!this.player) return;

        if (!this.lobby.isLocked) {
            this.snackbarService.showMessage(ErrorMessages.LobbyNotLocked);
            return;
        }
        if (this.lobby.players.length < MIN_PLAYERS || (this.lobby.game?.mode === GameMode.CTF && this.lobby.players.length % 2 !== 0)) {
            this.snackbarService.showMessage(ErrorMessages.NotEnoughPlayers);
            return;
        }
        if (this.player.isAdmin && !this.isGameStartedEmitted) {
            this.isGameStartedEmitted = true;
            this.socketClientService.emit(SocketEvent.CreateGame, { accessCode: this.accessCode, gameMode: this.lobby.game?.mode });
        }

        this.lobbyService.setIsGameStarting(true);
        sessionStorage.setItem(LOBBY_STORAGE, JSON.stringify(this.lobby));
        this.router.navigate([Routes.Game]);
    }

    createVirtualPlayer(): void {
        this.isDialogOpen = true;
    }

    setBehavior(behavior: Behavior): void {
        this.socketClientService.emit(SocketEvent.CreateVirtualPlayer, { behavior, accessCode: this.accessCode });
        this.isDialogOpen = false;
    }

    cancelVirtualPlayer(): void {
        this.isDialogOpen = false;
    }
}
