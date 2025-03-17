import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MIN_PLAYERS } from '@app/constants/global.constants';
import { ErrorMessages, Routes } from '@app/enums/global.enums';
import { Lobby } from '@app/interfaces/lobby';
import { Player } from '@app/interfaces/player';
import { AccessCodeService } from '@app/services/access-code/access-code.service';
import { SnackbarService } from '@app/services/snackbar/snackbar.service';
import { SocketClientService } from '@app/services/socket/socket-client-service';
import { LobbyService } from '@app/services/lobby/lobby.service';
import { Subscription } from 'rxjs';
import { AsyncPipe } from '@angular/common';
@Component({
    selector: 'app-waiting-view',
    templateUrl: './waiting-view.component.html',
    styleUrls: ['./waiting-view.component.scss'],
    standalone: true,
    imports: [AsyncPipe,],
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
        this.subscriptions.add(
            this.lobbyService.lobby.subscribe((lobby) => {
                console.log("Mise à jour du lobby :", lobby);
            })
        );
        // this.subscriptions.add(
        //     this.lobbyService.isLoading.subscribe((loading) => {
        //         console.log("isLoading :", loading);
        //     })
        // );
        this.player = this.lobbyService.getPlayer();
        console.log("Player chargé :", this.player);
        
    }

    ngOnDestroy(): void {
        const accessCode = this.accessCodeService.getAccessCode(); // ✅ Récupération correcte du code d'accès
    
        this.lobbyService.lobby.subscribe((lobby) => {
            if (!lobby || !lobby.players || !accessCode) return; // ✅ Évite les erreurs si le lobby n'est pas chargé
    
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
    
    
    // changeLobbyLockStatus(): void {
    //     if (this.lobby.isLocked) {
    //         if (this.lobby.players.length < this.lobby.maxPlayers) {
    //             this.socketClientService.unlockLobby(this.accessCode);
    //         } else {
    //             this.snackbarService.showMessage('Le lobby est plein, impossible de le déverrouiller.');
    //         }
    //     } else {
    //         this.socketClientService.lockLobby(this.accessCode);
    //     }
    // }
    changeLobbyLockStatus(): void {
        this.lobbyService.lobby.subscribe((lobby) => {
            if (!lobby) return;
    
            if (lobby.isLocked) {
                if (lobby.players.length < lobby.maxPlayers) {
                    this.socketClientService.unlockLobby(this.lobbyService.getAccessCode());
                } else {
                    this.snackbarService.showMessage('Le lobby est plein, impossible de le déverrouiller.');
                }
            } else {
                this.socketClientService.lockLobby(this.lobbyService.getAccessCode());
            }
        });
    }
    

    kickPlayer(player: Player): void {
        if (this.accessCode) {
            console.log(this.accessCode);
            this.socketClientService.kickPlayer(this.accessCode, player.name);
            
        }
    }

    navigateToHome(): void {
        this.router.navigate([Routes.HomePage]);
    }

    // navigateToGame() {
    //     if (!this.lobby.isLocked) {
    //         this.snackbarService.showMessage(ErrorMessages.LobbyNotLocked);
    //         return;
    //     }
    //     if (this.lobby.players.length < MIN_PLAYERS) {
    //         this.snackbarService.showMessage(ErrorMessages.NotEnoughPlayers);
    //         return;
    //     }
    //     if (this.player.isAdmin && !this.isGameStartedEmitted) {
    //         this.isGameStartedEmitted = true;
    //         this.socketClientService.alertGameStarted(this.accessCode);
    //     }

    //     this.isGameStarting = true;
    //     sessionStorage.setItem('lobby', JSON.stringify(this.lobby));
    //     this.router.navigate([Routes.Game]);
    // }
    navigateToGame(): void {
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
        this.socketClientService.socket.off('joinLobby');
        this.socketClientService.socket.off('lobbyUpdate');
        this.socketClientService.socket.off('leaveLobby');
        this.socketClientService.socket.off('kicked');
        this.socketClientService.socket.off('lobbyLocked');
        this.socketClientService.socket.off('lobbyUnlocked');
        this.socketClientService.socket.off('lobbyDeleted');
        this.socketClientService.socket.off('alertGameStarted');
    }
}
