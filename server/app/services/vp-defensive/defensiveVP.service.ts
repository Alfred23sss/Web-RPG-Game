import { LobbyService } from '@app/services/lobby/lobby.service';
import { Injectable } from '@nestjs/common';
import { GameCombatService } from '../combat-manager/combat-manager.service';
import { Player } from '@app/interfaces/Player';

@Injectable()
export class DefensiveVPService {
    constructor(
        private readonly lobbyService: LobbyService,
        private readonly gameCombatService: GameCombatService,
    ) {}
    async tryToEscapeIfWounded(virtualPlayer: Player, accessCode: string): Promise<boolean> {;
        const isInCombat = this.gameCombatService.isCombatActive(accessCode);
        console.log('➡️ isInCombat:', isInCombat);
        if (!isInCombat) return false;
    
        const combatState = this.gameCombatService.getCombatState(accessCode);
    
        if (!combatState || combatState.currentFighter.name !== virtualPlayer.name) return false;
    
        const healthRatio = virtualPlayer.hp.current / virtualPlayer.hp.max;
    
        if (healthRatio < 1) {
            console.log('🚨 Trying to escape...');
            this.gameCombatService.attemptEscape(accessCode, virtualPlayer);
            return true;
        }
        return false;
    }
    
    
}

