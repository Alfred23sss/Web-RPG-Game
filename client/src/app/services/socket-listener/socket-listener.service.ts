import { Injectable } from '@angular/core';
import { SocketEvent } from '@app/enums/global.enums';
import { CombatSocketService } from '@app/services/combat-socket/combat-socket.service';
import { GameSocketService } from '@app/services/game-socket/game-socket.service';
import { GameStateSocketService } from '@app/services/game-state-socket/game-state-socket.service';
import { SocketClientService } from '@app/services/socket/socket-client-service';
import { TurnSocketService } from '@app/services/turn-socket/turn-socket.service';

@Injectable({
    providedIn: 'root',
})
export class SocketListenerService {
    constructor(
        private gameStateService: GameStateSocketService,
        private combatSocketService: CombatSocketService,
        private turnSocketService: TurnSocketService,
        private gameSocketService: GameSocketService,
        private socketClientService: SocketClientService,
    ) {}

    initializeAllSocketListeners(): void {
        this.gameStateService.initializeListeners();
        this.combatSocketService.initializeCombatListeners();
        this.turnSocketService.initializeTurnListeners();
        this.gameSocketService.initializeSocketListeners();
    }

    unsubscribeSocketListeners(): void {
        Object.values(SocketEvent).forEach((event: string) => {
            this.socketClientService.off(event);
        });
    }
}
