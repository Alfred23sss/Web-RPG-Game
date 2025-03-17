// import { Injectable } from '@angular/core';
// import { DEFAULT_LOBBY } from '@app/constants/global.constants';
// import { Lobby } from '@app/interfaces/lobby';
// import { Player } from '@app/interfaces/player';
// import { AccessCodeService } from '@app/services/access-code/access-code.service';
// import { SnackbarService } from '@app/services/snackbar/snackbar.service';
// import { SocketClientService } from '@app/services/socket/socket-client-service';
// import { BehaviorSubject } from 'rxjs';

// @Injectable({
//     providedIn: 'root',
// })
// export class LobbyService {
//     private lobbySubject = new BehaviorSubject<Lobby>(DEFAULT_LOBBY);
//     private isLoadingSubject = new BehaviorSubject<boolean>(true);
//     private player: Player;
//     private kickedPlayerSubject = new BehaviorSubject<Player | null>(null);

//     constructor(
//         private socketClientService: SocketClientService,
//         private accessCodeService: AccessCodeService,
//         private snackbarService: SnackbarService,
//     ) {}

//     get kickedPlayer() {
//         return this.kickedPlayerSubject.asObservable();
//     }

//     get lobby() {
//         return this.lobbySubject.asObservable();
//     }

//     get isLoading() {
//         return this.isLoadingSubject.asObservable();
//     }

//     initializeLobby() {
//         const accessCode = this.accessCodeService.getAccessCode();
//         const storedPlayer = sessionStorage.getItem('player');
//         if (storedPlayer) {
//             this.player = JSON.parse(storedPlayer);
//         }

//         this.socketClientService.getLobby(accessCode).subscribe({
//             next: (lobby) => {
//                 this.lobbySubject.next(lobby);
//                 this.isLoadingSubject.next(false);
//             },
//             error: () => {
//                 this.isLoadingSubject.next(false);
//                 this.snackbarService.showMessage('Erreur lors du chargement du lobby');
//             },
//         });

//         this.subscribeToSocketEvents();
//     }

//     changeLobbyLockStatus(): void {
//         const lobby = this.lobbySubject.value;
//         if (lobby.isLocked) {
//             if (lobby.players.length < lobby.maxPlayers) {
//                 this.socketClientService.unlockLobby(lobby.accessCode);
//             } else {
//                 this.snackbarService.showMessage('Le lobby est plein, impossible de le déverrouiller.');
//             }
//         } else {
//             this.socketClientService.lockLobby(lobby.accessCode);
//         }
//     }

//     kickPlayer(player: Player): void {
//         const lobby = this.lobbySubject.value;
//         if (lobby.accessCode) {
//             this.socketClientService.kickPlayer(lobby.accessCode, player.name);
//         }
//     }

//     leaveLobby(): void {
//         const lobby = this.lobbySubject.value;
//         if (lobby) {
//             this.socketClientService.removePlayerFromLobby(lobby.accessCode, this.player.name);
//             if (this.player.isAdmin) {
//                 this.socketClientService.deleteLobby(lobby.accessCode);
//             }
//         }
//     }

//     private subscribeToSocketEvents() {
//         const accessCode = this.accessCodeService.getAccessCode();

//         this.socketClientService.onJoinLobby(() => {
//             this.fetchLobbyPlayers();
//         });

//         this.socketClientService.onLeaveLobby(() => {
//             this.fetchLobbyPlayers();
//         });

//         this.socketClientService.onLobbyUpdate((players: Player[]) => {
//             this.updateLobbyPlayers(players);
//         });

//         this.socketClientService.onKicked(({ accessCode: eventAccessCode, playerName }) => {
//             if (eventAccessCode === accessCode && playerName === this.player.name) {
//                 this.snackbarService.showMessage('Vous avez été expulsé du lobby.');
//                 this.kickedPlayerSubject.next(this.player);
//             }
//         });

//         this.socketClientService.onLobbyLocked(({ accessCode: eventAccessCode, isLocked }) => {
//             if (eventAccessCode === accessCode) {
//                 this.updateLobbyLockStatus(isLocked);
//             }
//         });

//         this.socketClientService.onLobbyUnlocked(({ accessCode: eventAccessCode, isLocked }) => {
//             if (eventAccessCode === accessCode) {
//                 this.updateLobbyLockStatus(isLocked);
//             }
//         });

//         this.socketClientService.onLobbyDeleted(() => {
//             this.snackbarService.showMessage('Le lobby a été supprimé.');
//         });
//     }

//     private fetchLobbyPlayers() {
//         const accessCode = this.accessCodeService.getAccessCode();
//         this.socketClientService.getLobbyPlayers(accessCode).subscribe({
//             next: (players) => {
//                 const updatedLobby = { ...this.lobbySubject.value, players };
//                 this.lobbySubject.next(updatedLobby);
//             },
//             error: () => {
//                 this.snackbarService.showMessage('Erreur lors de la récupération des joueurs');
//             },
//         });
//     }

//     private updateLobbyPlayers(players: Player[]) {
//         const updatedLobby = { ...this.lobbySubject.value, players };
//         this.lobbySubject.next(updatedLobby);
//         const updatedPlayer = players.find((p) => p.avatar === this.player.avatar);
//         if (updatedPlayer) {
//             this.player.name = updatedPlayer.name;
//             sessionStorage.setItem('player', JSON.stringify(this.player));
//         }
//     }

//     private updateLobbyLockStatus(isLocked: boolean) {
//         const updatedLobby = { ...this.lobbySubject.value, isLocked };
//         this.lobbySubject.next(updatedLobby);
//     }
// }

