import { Injectable } from '@angular/core';
import { EVENTS } from '@app/constants/global.constants';
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
        EVENTS.forEach((event) => {
            this.socketClientService.socket.off(event);
        });
    }
}
