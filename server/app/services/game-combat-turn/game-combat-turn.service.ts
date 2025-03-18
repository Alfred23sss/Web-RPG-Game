import { GameCombatMap } from '@app/interfaces/GameCombatMap';
import { Player } from '@app/interfaces/Player';
import { LobbyService } from '@app/services/lobby/lobby.service';
import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

const COMBAT_TURN_DURATION = 5000;
const COMBAT_ESCAPE_LIMITED_DURATION = 3000;
const SECOND = 1000;

@Injectable()
export class CombatTurnService {
    constructor(
        private readonly lobbyService: LobbyService,
        private readonly eventEmitter: EventEmitter2,
        private readonly logger: Logger,
    ) {}

    start(accessCode: string, player: Player, combatStates: GameCombatMap): void {
        const combatState = combatStates[accessCode];
        if (!combatState) return;

        combatState.playerPerformedAction = false;
        combatState.currentFighter = player;
        const defender = combatState.currentFighter === combatState.attacker ? combatState.defender : combatState.attacker;

        const escapeAttemptsRemaining = combatState.remainingEscapeAttempts.get(player.name) || 0;
        const turnDuration = escapeAttemptsRemaining > 0 ? COMBAT_TURN_DURATION : COMBAT_ESCAPE_LIMITED_DURATION;
        const turnDurationInSeconds = turnDuration / SECOND;

        combatState.combatTurnTimeRemaining = turnDurationInSeconds;

        this.emitCombatTurnStarted(accessCode, player, turnDurationInSeconds, escapeAttemptsRemaining, defender);

        if (combatState.combatCountdownInterval) {
            clearInterval(combatState.combatCountdownInterval);
            combatState.combatCountdownInterval = null;
        }

        let timeLeft = turnDurationInSeconds;
        this.emitCombatTimerUpdate(accessCode, timeLeft, combatState.attacker, combatState.defender);

        combatState.combatCountdownInterval = setInterval(() => {
            timeLeft--;
            combatState.combatTurnTimeRemaining = timeLeft;

            this.emitCombatTimerUpdate(accessCode, timeLeft, combatState.attacker, combatState.defender);

            if (timeLeft <= 0) {
                if (combatState.combatCountdownInterval) {
                    clearInterval(combatState.combatCountdownInterval);
                }
                combatState.combatCountdownInterval = null;
            }
        }, SECOND);

        combatState.combatTurnTimers = setTimeout(() => {
            if (!combatState.playerPerformedAction) {
                // Auto-attack when timer expires
                this.eventEmitter.emit('game.combat.auto.attack', {
                    accessCode,
                    player: combatState.currentFighter,
                });
            }
        }, turnDuration);
    }

    private emitCombatTurnStarted(accessCode: string, fighter: Player, duration: number, escapeAttemptsLeft: number, defender: Player): void {
        const attackerSocketId = this.lobbyService.getPlayerSocket(fighter.name);
        const defenderSocketId = this.lobbyService.getPlayerSocket(defender.name);

        this.eventEmitter.emit('game.combat.turn.started', {
            accessCode,
            fighter,
            duration,
            escapeAttemptsLeft,
            attackerSocketId,
            defenderSocketId,
        });
    }

    private emitCombatTimerUpdate(accessCode: string, timeLeft: number, attacker: Player, defender: Player): void {
        const attackerSocketId = this.lobbyService.getPlayerSocket(attacker.name);
        const defenderSocketId = this.lobbyService.getPlayerSocket(defender.name);

        this.eventEmitter.emit('game.combat.timer', {
            accessCode,
            timeLeft,
            attackerSocketId,
            defenderSocketId,
        });
    }
}
