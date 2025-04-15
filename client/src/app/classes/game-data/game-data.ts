import { Game } from '@app/interfaces/game';
import { Lobby } from '@app/interfaces/lobby';
import { Player } from '@app/interfaces/player';
import { GameStatistics } from '@app/interfaces/statistics';
import { Tile } from '@app/interfaces/tile';
import { AttackScore } from '@common/interfaces/attack-score';

export class GameData {
    game: Game;
    clientPlayer: Player;
    currentPlayer: Player;
    playersInFight: Player[];
    availablePath: Tile[] | undefined;
    quickestPath: Tile[] | undefined;
    playerTile: Tile | undefined;
    lobby: Lobby;
    turnTimer: number;
    isInCombatMode: boolean;
    hasTurnEnded: boolean;
    isActionMode: boolean;
    actionTaken: boolean;
    isCurrentlyMoving: boolean;
    escapeAttempts: number;
    evadeResult: { attemptsLeft: number; isEscapeSuccessful: boolean } | null;
    attackResult: { success: boolean; attackScore: AttackScore; defenseScore: AttackScore } | null;
    movementPointsRemaining: number = 0;
    isDebugMode: boolean = false;
    isGameEnding: boolean = false;
    gameStats: GameStatistics;
    playersStats: { [key: string]: GameStatistics } = {};

    constructor() {
        this.game = {} as Game;
        this.clientPlayer = {} as Player;
        this.currentPlayer = {} as Player;
        this.playersInFight = [];
        this.availablePath = undefined;
        this.quickestPath = undefined;
        this.playerTile = undefined;
        this.lobby = {} as Lobby;
        this.turnTimer = 0;
        this.isInCombatMode = false;
        this.hasTurnEnded = false;
        this.isActionMode = false;
        this.actionTaken = false;
        this.isCurrentlyMoving = false;
        this.escapeAttempts = 2;
        this.evadeResult = null;
        this.attackResult = null;
        this.movementPointsRemaining = 0;
        this.isDebugMode = false;
    }

    update(partialGameData: Partial<GameData>): void {
        Object.assign(this, partialGameData);
    }
}
