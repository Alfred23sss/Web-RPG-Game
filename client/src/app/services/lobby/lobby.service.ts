import { Injectable } from '@angular/core';
import { DEFAULT_LOBBY } from '@app/constants/global.constants';
import { DiceType } from '@app/enums/global.enums';
import { Lobby } from '@app/interfaces/lobby';
import { Player } from '@app/interfaces/player';
import { AccessCodeService } from '@app/services/access-code/access-code.service';
import { SnackbarService } from '@app/services/snackbar/snackbar.service';
import { SocketClientService } from '@app/services/socket/socket-client-service';
import { BehaviorSubject } from 'rxjs';
import { Subject } from 'rxjs';

@Injectable({
    providedIn: 'root',
})
export class LobbyService {
    // accessCode: string;
    private accessCodeSubject = new BehaviorSubject<string>('');


    private lobbySubject = new BehaviorSubject<Lobby>(DEFAULT_LOBBY);
    private isLoadingSubject = new BehaviorSubject<boolean>(true);
    private kickedPlayerSubject = new Subject<Player>();
    private player: Player;
    private gameStartedSubject = new BehaviorSubject<any>(null);
    private adminLeftSubject = new BehaviorSubject<string | null>(null);



    constructor(
        private socketClientService: SocketClientService,
        private accessCodeService: AccessCodeService,
        private snackbarService: SnackbarService,
    ) {}

    initializeLobby(): void {
        this.accessCodeSubject.next(this.accessCodeService.getAccessCode());
    

        this.player = this.getPlayer();
    

        this.isLoadingSubject.next(true);
        this.socketClientService.getLobby(this.accessCodeSubject.value).subscribe({
            next: (lobby) => {
                this.lobbySubject.next(lobby);
                this.isLoadingSubject.next(false);
            },
            error: () => {
                this.isLoadingSubject.next(false);
                this.snackbarService.showMessage('Erreur lors du chargement du lobby');
            },
        });
    
        this.socketClientService.onJoinLobby(() => {
            this.socketClientService.getLobbyPlayers(this.accessCodeSubject.value).subscribe({
                next: (players) => {
                    this.lobbySubject.next({ ...this.lobbySubject.value, players });
                },
                error: () => {
                    this.snackbarService.showMessage('Erreur lors de la récupération des joueurs');
                },
            });
        });
    
        this.socketClientService.onLeaveLobby(() => {
            this.socketClientService.getLobbyPlayers(this.accessCodeSubject.value).subscribe({
                next: (players) => {
                    this.lobbySubject.next({ ...this.lobbySubject.value, players });
                },
                error: () => {
                    this.snackbarService.showMessage('Erreur lors de la récupération des joueurs');
                },
            });
        });
    
        this.socketClientService.onLobbyUpdate((players: Player[]) => {
            const updatedLobby = { ...this.lobbySubject.value, players };
            this.lobbySubject.next(updatedLobby);
    
            // Met à jour le nom du joueur si nécessaire
            const updatedPlayer = players.find((p) => p.avatar === this.player.avatar);
            if (updatedPlayer) {
                this.player.name = updatedPlayer.name;
                sessionStorage.setItem('player', JSON.stringify(this.player));
            }
        });
    
        this.socketClientService.onLobbyLocked(({ accessCode: eventAccessCode, isLocked }) => {
            if (eventAccessCode === this.accessCodeSubject.value) {
                this.lobbySubject.next({ ...this.lobbySubject.value, isLocked });
            }
        });
    
        this.socketClientService.onLobbyUnlocked(({ accessCode: eventAccessCode, isLocked }) => {
            if (eventAccessCode === this.accessCodeSubject.value) {
                this.lobbySubject.next({ ...this.lobbySubject.value, isLocked });
            }
        });
    
        this.socketClientService.onLobbyDeleted(() => {
            this.snackbarService.showMessage('Le lobby a été supprimé.');
        });
    
        this.socketClientService.onAlertGameStarted((data) => {
            this.gameStartedSubject.next(data);
        });
    
        this.socketClientService.onAdminLeft((data) => {
            this.adminLeftSubject.next(data.message);
        });
    }

    initializeKickSocket(): void {
        this.socketClientService.onKicked(({ accessCode, playerName }) => {
            console.log(`🚨 Joueur expulsé détecté : ${playerName}`);
    
            if (accessCode === this.accessCodeSubject.value) {
                if (playerName === this.player.name) {
                    this.snackbarService.showMessage('Vous avez été expulsé du lobby.');
                    this.kickedPlayerSubject.next(this.player);
                }
    
                this.socketClientService.getLobbyPlayers(accessCode).subscribe({
                    next: (players) => {
                        this.lobbySubject.next({ ...this.lobbySubject.value, players });
                    },
                    error: () => {
                        this.snackbarService.showMessage('Erreur lors de la mise à jour de la liste des joueurs');
                    },
                });
            }
        });
    }
    
    

    get kickedPlayer$() {
        return this.kickedPlayerSubject.asObservable();
    }

    get lobby () {
        return this.lobbySubject.asObservable();
    }

    get isLoading() {
        return this.isLoadingSubject.asObservable();
    }

    get isAdmin(): boolean {
        return this.player?.isAdmin ?? false;
    }

    get adminLeft() {
        return this.adminLeftSubject.asObservable();
    }

get gameStarted() {
    return this.gameStartedSubject.asObservable();
}

getPlayer(): Player {
    const storedPlayer = sessionStorage.getItem('player');
    if (storedPlayer) {
        return JSON.parse(storedPlayer);
    }
    
    console.warn("Aucun joueur trouvé dans sessionStorage. Retour d'un joueur par défaut.");
    
    return {
        name: '',
        avatar: '',
        speed: 4,
        attack: { value: 4, bonusDice: DiceType.Uninitialized },
        defense: { value: 4, bonusDice: DiceType.Uninitialized },
        hp: { current: 4, max: 4 },
        movementPoints: 4,
        actionPoints: 3,
        inventory: [null, null],
        isAdmin: false,
        hasAbandoned: false,
        isActive: false,
        combatWon: 0
    };
}

    getAccessCode(): string {
        return this.accessCodeService.getAccessCode();
    }


    showSnackbarMessage(message: string): void {
        this.snackbarService.showMessage(message);
    }

    changeLobbyLockStatus(): void {
        const lobby = this.lobbySubject.value;
        if (!lobby) return;

        if (lobby.isLocked) {
        if (lobby.players.length < lobby.maxPlayers) {
            this.socketClientService.unlockLobby(lobby.accessCode);
            this.snackbarService.showMessage('Lobby déverrouillé.');
        } else {
            this.snackbarService.showMessage('Le lobby est plein, impossible de le déverrouiller.');
        }
        } else {
        this.socketClientService.lockLobby(lobby.accessCode);
        this.snackbarService.showMessage('Lobby verrouillé.');
    }
        
    }

    kickPlayer(player: Player): void {
        if (this.accessCodeSubject.value) {
            console.log(this.accessCodeSubject.value);
            this.socketClientService.kickPlayer(this.accessCodeSubject.value, player.name);
        }
    }

    // leaveLobby(): void {
    //     const lobby = this.lobbySubject.value;
    //     if (lobby) {
    //         this.socketClientService.removePlayerFromLobby(lobby.accessCode, this.player.name);
    //         if (this.player.isAdmin) {
    //             this.socketClientService.deleteLobby(lobby.accessCode);
    //         }
    //     }
    // }

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

}
