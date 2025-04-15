import { EventEmit } from '@app/enums/enums';
import { Player } from '@app/interfaces/player';
import { Turn } from '@app/interfaces/turn';
import { LobbyService } from '@app/services/lobby/lobby.service';
import { TeamType } from '@common/enums';
import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

const TRANSITION_PHASE_DURATION = 3000;
const TURN_DURATION = 30000;
const SECOND = 1000;
const RANDOMIZER = 0.5;

@Injectable()
export class GameSessionTurnService {
    constructor(
        private readonly lobbyService: LobbyService,
        private readonly eventEmitter: EventEmitter2,
    ) {}

    initializeTurn(accessCode: string): Turn {
        return {
            orderedPlayers: this.orderPlayersBySpeed(this.lobbyService.getLobbyPlayers(accessCode)),
            currentPlayer: null,
            currentTurnCountdown: 0,
            turnTimers: null,
            isTransitionPhase: false,
            countdownInterval: null,
            isInCombat: false,
            beginnerPlayer: undefined,
        };
    }

    initializeTurnCTF(accessCode: string) {
        const turn = this.initializeTurn(accessCode);
        const shuffledPlayers = [...turn.orderedPlayers].sort(() => Math.random() - RANDOMIZER);
        const teamSize = Math.ceil(shuffledPlayers.length / 2);

        shuffledPlayers.forEach((player, index) => {
            player.team = index < teamSize ? TeamType.RED : TeamType.BLUE;
        });

        return turn;
    }

    startTransitionPhase(accessCode: string, turn: Turn): Turn {
        turn.isTransitionPhase = true;

        turn.transitionTimeRemaining = TRANSITION_PHASE_DURATION / SECOND;
        const nextPlayer = this.getNextPlayer(turn);
        turn.beginnerPlayer = nextPlayer;
        this.emitEvent(EventEmit.GameTransitionStarted, { accessCode, nextPlayer });
        let transitionTimeLeft = TRANSITION_PHASE_DURATION / SECOND;
        turn.countdownInterval = setInterval(() => {
            transitionTimeLeft--;
            turn.transitionTimeRemaining = transitionTimeLeft;
            this.emitEvent(EventEmit.GameTransitionCountdown, { accessCode, timeLeft: transitionTimeLeft });
            if (transitionTimeLeft <= 0) {
                if (turn.countdownInterval) {
                    clearInterval(turn.countdownInterval);
                }
                turn.countdownInterval = null;
            }
        }, SECOND);
        turn.turnTimers = setTimeout(() => {
            this.startPlayerTurn(accessCode, nextPlayer, turn);
        }, TRANSITION_PHASE_DURATION);
        return turn;
    }

    startPlayerTurn(accessCode: string, player: Player, turn: Turn): Turn {
        turn.isTransitionPhase = false;
        turn.currentPlayer = player;
        this.updatePlayer(player, { isActive: true });
        turn.currentTurnCountdown = TURN_DURATION / SECOND;
        this.emitEvent(EventEmit.GameTurnStarted, { accessCode, player });
        if (turn.countdownInterval) {
            clearInterval(turn.countdownInterval);
            turn.countdownInterval = null;
        }
        let timeLeft = TURN_DURATION / SECOND;
        turn.countdownInterval = setInterval(() => {
            timeLeft--;
            turn.currentTurnCountdown = timeLeft;
            this.emitEvent(EventEmit.GameTurnTimer, { accessCode, timeLeft });
            if (timeLeft <= 0) {
                if (turn.countdownInterval) {
                    clearInterval(turn.countdownInterval);
                }
                turn.countdownInterval = null;
            }
        }, SECOND);
        turn.turnTimers = setTimeout(() => {
            this.eventEmitter.emit(EventEmit.GameTurnTimeout, { accessCode });
        }, TURN_DURATION);
        return turn;
    }

    endTurn(turn: Turn): Turn {
        if (turn.turnTimers) {
            clearTimeout(turn.turnTimers);
            turn.turnTimers = null;
        }
        if (turn.countdownInterval) {
            clearInterval(turn.countdownInterval);
            turn.countdownInterval = null;
        }
        if (turn.currentPlayer) {
            this.updatePlayer(turn.currentPlayer, { isActive: false });
        }
        return turn;
    }

    pauseTurn(turn: Turn): number {
        const remainingTime = turn.currentTurnCountdown;
        if (turn.turnTimers) {
            clearTimeout(turn.turnTimers);
            turn.turnTimers = null;
        }
        if (turn.countdownInterval) {
            clearInterval(turn.countdownInterval);
            turn.countdownInterval = null;
        }
        return remainingTime;
    }

    resumeTurn(accessCode: string, turn: Turn, remainingTime: number): Turn {
        turn.currentTurnCountdown = remainingTime;
        this.emitEvent(EventEmit.GameTurnResumed, { accessCode, player: turn.beginnerPlayer });
        let timeLeft = remainingTime;
        turn.countdownInterval = setInterval(() => {
            timeLeft--;
            turn.currentTurnCountdown = timeLeft;
            this.emitEvent(EventEmit.GameTurnTimer, { accessCode, timeLeft });
            if (timeLeft <= 0) {
                if (turn.countdownInterval) {
                    clearInterval(turn.countdownInterval);
                }
                turn.countdownInterval = null;
            }
        }, SECOND);
        turn.turnTimers = setTimeout(() => {
            this.eventEmitter.emit(EventEmit.GameTurnTimeout, { accessCode });
        }, remainingTime * SECOND);
        return turn;
    }

    getNextPlayer(turn: Turn): Player {
        const activePlayers = turn.orderedPlayers.filter((p) => !p.hasAbandoned);
        if (activePlayers.length === 0) return null;
        if (!turn.currentPlayer) {
            return activePlayers[0];
        }
        const currentIndex = activePlayers.findIndex((p) => p.name === turn.currentPlayer.name);

        const nextIndex = (currentIndex + 1) % activePlayers.length;
        Logger.log('next player', activePlayers[nextIndex]);
        return activePlayers[nextIndex];
    }

    orderPlayersBySpeed(players: Player[]): Player[] {
        const playerList = [...players].sort((a, b) => {
            if (a.speed === b.speed) {
                return Math.random() < RANDOMIZER ? -1 : 1;
            }
            return b.speed - a.speed;
        });
        if (playerList.length > 0) {
            playerList[0].isActive = true;
        }
        playerList.forEach((player, index) => {
            Logger.log('player', player, index);
        });
        return playerList;
    }

    updatePlayer(player: Player, updates: Partial<Player>): void {
        if (player) {
            Object.assign(player, updates);
        }
    }
    private emitEvent<T>(eventName: string, payload: T): void {
        this.eventEmitter.emit(eventName, payload);
    }
}
