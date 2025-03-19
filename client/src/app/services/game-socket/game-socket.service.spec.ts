/* eslint-disable max-lines */
/* eslint-disable @typescript-eslint/no-explicit-any */ // all any uses are to allow the testing of a private service.
/* eslint-disable @typescript-eslint/no-magic-numbers */
/* eslint-disable @typescript-eslint/no-empty-function */

import { TestBed, discardPeriodicTasks, fakeAsync, tick } from '@angular/core/testing';
import { DiceType, TileType } from '@app/enums/global.enums';
import { Game } from '@app/interfaces/game';
import { Player } from '@app/interfaces/player';
import { Tile } from '@app/interfaces/tile';
import { GamePageComponent } from '@app/pages/game-page/game-page.component';
import { GameSocketService } from '@app/services/game-socket/game-socket.service';
import { LogBookService } from '@app/services/logbook/logbook.service';
import { PlayerMovementService } from '@app/services/player-movement/player-movement.service';
import { SnackbarService } from '@app/services/snackbar/snackbar.service';
import { SocketClientService } from '@app/services/socket/socket-client-service';

const CLIENT_PLAYER_POSITION: Tile = {
    id: 'tile1',
    type: TileType.Default,
    isOccupied: true,
    imageSrc: 'player-tile.png',
    isOpen: true,
};

const MOCK_GRID: Tile[][] = [
    [
        {
            id: 'tile1',
            type: TileType.Default,
            isOccupied: false,
            imageSrc: 'default-tile.png',
            isOpen: true,
        },
        {
            id: 'tile2',
            type: TileType.Wall,
            isOccupied: true,
            imageSrc: 'wall-tile.png',
            isOpen: false,
        },
    ],
    [
        {
            id: 'tile3',
            type: TileType.Ice,
            isOccupied: false,
            imageSrc: 'ice-tile.png',
            isOpen: true,
        },
        {
            id: 'tile4',
            type: TileType.Door,
            isOccupied: true,
            imageSrc: 'door-tile.png',
            isOpen: false,
        },
    ],
];

const PLAYER_1_NAME = 'Player1';
const PLAYER_2_NAME = 'Player2';

const delayBeforeEndingGame = 5000;
const MOCK_PLAYER_1: Player = {
    name: PLAYER_1_NAME,
    avatar: '',
    speed: 0,
    attack: {
        value: 0,
        bonusDice: DiceType.D4,
    },
    defense: {
        value: 0,
        bonusDice: DiceType.D4,
    },
    hp: {
        current: 0,
        max: 0,
    },
    movementPoints: 0,
    actionPoints: 0,
    inventory: [null, null],
    isAdmin: false,
    hasAbandoned: false,
    isActive: false,
    combatWon: 0,
};

const MOCK_PLAYER_2: Player = {
    ...MOCK_PLAYER_1,
    name: PLAYER_2_NAME,
}

describe('GameSocketService', () => {
    let service: GameSocketService;
    let mockSocketClientService: jasmine.SpyObj<SocketClientService>;
    let mockPlayerMovementService: jasmine.SpyObj<PlayerMovementService>;
    let mockLogbookService: jasmine.SpyObj<LogBookService>;
    let mockSnackbarService: jasmine.SpyObj<SnackbarService>;
    let mockComponent: jasmine.SpyObj<GamePageComponent>;

    const events = [
        'abandonGame',
        'gameDeleted',
        'gameEnded',
        'transitionStarted',
        'turnStarted',
        'timerUpdate',
        'alertGameStarted',
        'playerMovement',
        'gameCombatStarted',
        'attackResult',
        'playerUpdate',
        'playerListUpdate',
        'doorClickedUpdate',
        'gameCombatTurnStarted',
        'gameCombatTimerUpdate',
        'gridUpdate',
        'noMoreEscapesLeft',
        'combatEnded',
        'adminModeChangedServerSide',
    ];

    beforeEach(() => {
        mockSocketClientService = jasmine.createSpyObj<SocketClientService>('SocketClientService', ['on'], {
            socket: jasmine.createSpyObj('socket', ['off', 'on']),
        });

        mockPlayerMovementService = jasmine.createSpyObj<PlayerMovementService>('PlayerMovementService', [
            'calculateRemainingMovementPoints',
            'hasAdjacentIce',
            'hasAdjacentPlayerOrDoor',
        ]);
        mockLogbookService = jasmine.createSpyObj<LogBookService>('LogBookService', ['addEntry']);
        mockSnackbarService = jasmine.createSpyObj<SnackbarService>('SnackbarService', ['showMessage', 'showMultipleMessages']);

        mockComponent = jasmine.createSpyObj<GamePageComponent>('GamePageComponent', [
            'handlePageRefresh',
            'backToHome',
            'abandonGame',
            'updateAvailablePath',
            'getClientPlayerPosition',
            'endTurn',
            'updateAttackResult',
        ]);

        TestBed.configureTestingModule({
            providers: [
                GameSocketService,
                { provide: SocketClientService, useValue: mockSocketClientService },
                { provide: PlayerMovementService, useValue: mockPlayerMovementService },
                { provide: LogBookService, useValue: mockLogbookService },
                { provide: SnackbarService, useValue: mockSnackbarService },
            ],
        });

        service = TestBed.inject(GameSocketService);
    });

    it('should handle adminModeDisabled event correctly when debug mode is active', () => {
        let adminModeDisabledCallback: () => void = () => {};
        mockSocketClientService.on.and.callFake((event: string, callback: any) => {
            if (event === 'adminModeDisabled') {
                adminModeDisabledCallback = callback;
            }
            return () => {};
        });
        service.initializeSocketListeners(mockComponent);
        expect(adminModeDisabledCallback).toBeDefined();
        mockComponent.isDebugMode = true;
        adminModeDisabledCallback();
        expect(mockSnackbarService.showMessage).toHaveBeenCalledWith("Mode debug 'désactivé'");
        expect(mockComponent.isDebugMode).toBeFalse();
    });

    it('should handle abandonGame event correctly when player is not found', () => {
        let abandonGameCallback: (data: { player: Player }) => void = () => {};
        mockSocketClientService.on.and.callFake((event: string, callback: any) => {
            if (event === 'abandonGame') {
                abandonGameCallback = callback;
            }
            return () => {};
        });
        service.initializeSocketListeners(mockComponent);
        expect(abandonGameCallback).toBeDefined();
        mockComponent.playerList = [MOCK_PLAYER_1];
        abandonGameCallback({ player: MOCK_PLAYER_2 });
        const abandonedPlayer = mockComponent.playerList.find((p) => p.name === MOCK_PLAYER_2.name);
        expect(abandonedPlayer).toBeUndefined();
        expect(mockLogbookService.addEntry).not.toHaveBeenCalled();
    });

    it('should handle gameDeleted event correctly', fakeAsync(() => {
        let gameDeletedCallback: () => void = () => {};
        mockSocketClientService.on.and.callFake((event: string, callback: any) => {
            if (event === 'gameDeleted') {
                gameDeletedCallback = callback;
            }
            return () => {};
        });
        service.initializeSocketListeners(mockComponent);
        expect(gameDeletedCallback).toBeDefined();
        gameDeletedCallback();
        expect(mockSnackbarService.showMessage).toHaveBeenCalledWith(
            "Trop de joueurs ont abandonné la partie, vous allez être redirigé vers la page d'accueil",
        );
        discardPeriodicTasks();
    }));

    it('should handle gameEnded event correctly', fakeAsync(() => {
        let gameEndedCallback: (data: { winner: string }) => void = () => {};
        mockSocketClientService.on.and.callFake((event: string, callback: any) => {
            if (event === 'gameEnded') {
                gameEndedCallback = callback;
            }
            return () => {};
        });
        service.initializeSocketListeners(mockComponent);
        expect(gameEndedCallback).toBeDefined();
        const winnerName = PLAYER_1_NAME;
        gameEndedCallback({ winner: winnerName });
        expect(mockSnackbarService.showMessage).toHaveBeenCalledWith(`👑 ${winnerName} a remporté la partie ! Redirection vers l'accueil sous peu`);
        tick(delayBeforeEndingGame);
        expect(mockComponent.abandonGame).toHaveBeenCalled();
        discardPeriodicTasks();
    }));

    it('should handle transitionStarted event correctly when nextPlayer is the clientPlayer', () => {
        let transitionStartedCallback: (data: { nextPlayer: Player; transitionDuration: number }) => void = () => {};
        mockSocketClientService.on.and.callFake((event: string, callback: any) => {
            if (event === 'transitionStarted') {
                transitionStartedCallback = callback;
            }
            return () => {};
        });
        service.initializeSocketListeners(mockComponent);
        expect(transitionStartedCallback).toBeDefined();
        const player1 = { name: PLAYER_1_NAME } as Player;
        mockComponent.clientPlayer = player1;
        transitionStartedCallback({ nextPlayer: player1, transitionDuration: 5 });
        expect(mockSnackbarService.showMultipleMessages).toHaveBeenCalledWith(`Le tour à ${player1.name} commence dans 5 secondes`);
        expect(mockComponent.clientPlayer).toEqual(player1);
    });

    it('should handle transitionStarted event correctly when nextPlayer is not the clientPlayer', () => {
        let transitionStartedCallback: (data: { nextPlayer: Player; transitionDuration: number }) => void = () => {};
        mockSocketClientService.on.and.callFake((event: string, callback: any) => {
            if (event === 'transitionStarted') {
                transitionStartedCallback = callback;
            }
            return () => {};
        });
        service.initializeSocketListeners(mockComponent);
        expect(transitionStartedCallback).toBeDefined();
        mockComponent.clientPlayer = MOCK_PLAYER_1;
        transitionStartedCallback({ nextPlayer: MOCK_PLAYER_2, transitionDuration: 3 });
        expect(mockSnackbarService.showMultipleMessages).toHaveBeenCalledWith(`Le tour à ${MOCK_PLAYER_2.name} commence dans 3 secondes`);
        expect(mockComponent.clientPlayer).toEqual(MOCK_PLAYER_1);
    });

    it('should handle turnStarted event correctly', () => {
        let turnStartedCallback: (data: { player: Player; turnDuration: number }) => void = () => {};
        mockSocketClientService.on.and.callFake((event: string, callback: any) => {
            if (event === 'turnStarted') {
                turnStartedCallback = callback;
            }
            return () => {};
        });
        service.initializeSocketListeners(mockComponent);
        expect(turnStartedCallback).toBeDefined();
        const turnDuration = 60;
        mockComponent.clientPlayer = MOCK_PLAYER_1;
        turnStartedCallback({ player: MOCK_PLAYER_1, turnDuration });
        expect(mockSnackbarService.showMessage).toHaveBeenCalledWith(`C'est à ${MOCK_PLAYER_1.name} de jouer`);
        expect(mockComponent.currentPlayer).toEqual(MOCK_PLAYER_1);
        expect(mockComponent.isCurrentlyMoving).toBeFalse();
        expect(mockComponent.isActionMode).toBeFalse();
        expect(mockComponent.isInCombatMode).toBeFalse();
        expect(mockComponent.clientPlayer.movementPoints).toEqual(MOCK_PLAYER_1.speed);
        expect(mockComponent.turnTimer).toEqual(turnDuration);
        expect(mockComponent.updateAvailablePath).toHaveBeenCalled();
    });

    it('should handle timerUpdate event correctly', () => {
        let timerUpdateCallback: (data: { timeLeft: number }) => void = () => {};
        mockSocketClientService.on.and.callFake((event: string, callback: any) => {
            if (event === 'timerUpdate') {
                timerUpdateCallback = callback;
            }
            return () => {};
        });
        service.initializeSocketListeners(mockComponent);
        expect(timerUpdateCallback).toBeDefined();
        const timeLeft = 30;
        timerUpdateCallback({ timeLeft });
        expect(mockComponent.turnTimer).toEqual(timeLeft);
    });

    it('should handle playerMovement event correctly when clientPlayer is moving', () => {
        let playerMovementCallback: (data: { grid: Tile[][]; player: Player; isCurrentlyMoving: boolean }) => void = () => {};
        mockSocketClientService.on.and.callFake((event: string, callback: any) => {
            if (event === 'playerMovement') {
                playerMovementCallback = callback;
            }
            return () => {};
        });
        service.initializeSocketListeners(mockComponent);
        expect(playerMovementCallback).toBeDefined();

        const player: Player = { ...MOCK_PLAYER_1, movementPoints: 5, actionPoints: 1, speed: 5 } as Player;
        const isCurrentlyMoving = true;
        mockComponent.clientPlayer = player;
        const grid = MOCK_GRID;
        mockComponent.game = { grid } as Game;

        mockComponent.getClientPlayerPosition.and.returnValue(CLIENT_PLAYER_POSITION);
        mockPlayerMovementService.calculateRemainingMovementPoints.and.returnValue(2);
        mockPlayerMovementService.hasAdjacentIce.and.returnValue(false);
        mockPlayerMovementService.hasAdjacentPlayerOrDoor.and.returnValue(false);
        playerMovementCallback({ grid, player, isCurrentlyMoving });
        expect(mockComponent.game.grid).toEqual(grid);
        expect(mockComponent.movementPointsRemaining).toEqual(3);
        expect(mockComponent.isCurrentlyMoving).toEqual(isCurrentlyMoving);
        expect(mockComponent.updateAvailablePath).toHaveBeenCalled();
        expect(mockComponent.endTurn).not.toHaveBeenCalled();
    });

    it('should not call endTurn when clientPlayer has no action points, no movement points, but has adjacent ice', () => {
        let playerMovementCallback: (data: { grid: Tile[][]; player: Player; isCurrentlyMoving: boolean }) => void = () => {};
        mockSocketClientService.on.and.callFake((event: string, callback: any) => {
            if (event === 'playerMovement') {
                playerMovementCallback = callback;
            }
            return () => {};
        });
        service.initializeSocketListeners(mockComponent);
        expect(playerMovementCallback).toBeDefined();
        const grid = MOCK_GRID;
        const player = MOCK_PLAYER_1;
        const isCurrentlyMoving = false;
        mockComponent.clientPlayer = player;
        mockComponent.game = { grid } as Game;
        const clientPlayerPosition = CLIENT_PLAYER_POSITION;
        mockComponent.getClientPlayerPosition.and.returnValue(clientPlayerPosition);
        mockPlayerMovementService.calculateRemainingMovementPoints.and.returnValue(0);
        mockPlayerMovementService.hasAdjacentIce.and.returnValue(false);
        mockPlayerMovementService.hasAdjacentPlayerOrDoor.and.returnValue(false);
        playerMovementCallback({ grid, player, isCurrentlyMoving });
        expect(mockComponent.endTurn).toHaveBeenCalled();
    });

    it('should not call endTurn when clientPlayer has no action points, no movement points, but has adjacent ice--222', () => {
        let playerMovementCallback: (data: { grid: Tile[][]; player: Player; isCurrentlyMoving: boolean }) => void = () => {};
        mockSocketClientService.on.and.callFake((event: string, callback: any) => {
            if (event === 'playerMovement') {
                playerMovementCallback = callback;
            }
            return () => {};
        });
        service.initializeSocketListeners(mockComponent);
        expect(playerMovementCallback).toBeDefined();
        const grid = MOCK_GRID;
        const player: Player = { ...MOCK_PLAYER_1, actionPoints: 1, speed: 5 } as Player;
        const isCurrentlyMoving = false;
        mockComponent.clientPlayer = player;
        mockComponent.game = { grid } as Game;
        const clientPlayerPosition = CLIENT_PLAYER_POSITION;
        mockComponent.getClientPlayerPosition.and.returnValue(clientPlayerPosition);
        mockPlayerMovementService.calculateRemainingMovementPoints.and.returnValue(0);
        mockPlayerMovementService.hasAdjacentIce.and.returnValue(false);
        mockPlayerMovementService.hasAdjacentPlayerOrDoor.and.returnValue(false);
        playerMovementCallback({ grid, player, isCurrentlyMoving });
        expect(mockComponent.endTurn).toHaveBeenCalled();
    });

    it('should handle attackResult event correctly', () => {
        let attackResultCallback: (data: { success: boolean; attackScore: number; defenseScore: number }) => void = () => {};
        mockSocketClientService.on.and.callFake((event: string, callback: any) => {
            if (event === 'attackResult') {
                attackResultCallback = callback;
            }
            return () => {};
        });
        service.initializeSocketListeners(mockComponent);
        expect(attackResultCallback).toBeDefined();
        const attackResultData = {
            success: true,
            attackScore: 15,
            defenseScore: 10,
        };
        attackResultCallback(attackResultData);
        expect(mockComponent.updateAttackResult).toHaveBeenCalledWith(attackResultData);
    });

    it('should update clientPlayer if updated player is the same as clientPlayer', () => {
        let playerUpdateCallback: (data: { player: Player }) => void = () => {};
        mockSocketClientService.on.and.callFake((event: string, callback: any) => {
            if (event === 'playerUpdate') {
                playerUpdateCallback = callback;
            }
            return () => {};
        });
        service.initializeSocketListeners(mockComponent);
        expect(playerUpdateCallback).toBeDefined();
        const player: Player = { name: 'Player1', movementPoints: 5, actionPoints: 1, speed: 5 } as Player;
        const updatedPlayer: Player = { name: 'Player1', movementPoints: 3, actionPoints: 0, speed: 5 } as Player;
        mockComponent.clientPlayer = player;
        playerUpdateCallback({ player: updatedPlayer });
        expect(mockComponent.clientPlayer).toEqual(updatedPlayer);
    });

    it('should handle playerListUpdate event correctly', () => {
        let playerListUpdateCallback: (data: { players: Player[] }) => void = () => {};
        mockSocketClientService.on.and.callFake((event: string, callback: any) => {
            if (event === 'playerListUpdate') {
                playerListUpdateCallback = callback;
            }
            return () => {};
        });
        service.initializeSocketListeners(mockComponent);
        expect(playerListUpdateCallback).toBeDefined();
        const players: Player[] = [
            { ...MOCK_PLAYER_1, movementPoints: 5, actionPoints: 1, speed: 5 } as Player,
            { ...MOCK_PLAYER_2, movementPoints: 3, speed: 5 } as Player,
        ];
        playerListUpdateCallback({ players });
        expect(mockComponent.playerList).toEqual(players);
    });

    it('should not update grid or properties if game or grid does not exist', () => {
        let doorClickedUpdateCallback: (data: { grid: Tile[][] }) => void = () => {};
        mockSocketClientService.on.and.callFake((event: string, callback: any) => {
            if (event === 'doorClickedUpdate') {
                doorClickedUpdateCallback = callback;
            }
            return () => {};
        });
        service.initializeSocketListeners(mockComponent);
        expect(doorClickedUpdateCallback).toBeDefined();
        const grid = MOCK_GRID;
        mockComponent.game = null;
        mockComponent.clientPlayer = { actionPoints: 1 } as Player;
        mockComponent.isActionMode = true;
        doorClickedUpdateCallback({ grid });
        expect(mockComponent.clientPlayer.actionPoints).toEqual(1);
        expect(mockComponent.isActionMode).toBeTrue();
        expect(mockComponent.updateAvailablePath).not.toHaveBeenCalled();
    });

    it('should handle gameCombatTimerUpdate event correctly', () => {
        let gameCombatTimerUpdateCallback: (data: { timeLeft: number }) => void = () => {};
        mockSocketClientService.on.and.callFake((event: string, callback: any) => {
            if (event === 'timerUpdate') {
                gameCombatTimerUpdateCallback = callback;
            }
            return () => {};
        });
        service.initializeSocketListeners(mockComponent);
        expect(gameCombatTimerUpdateCallback).toBeDefined();
        const timeLeft = 30;
        gameCombatTimerUpdateCallback({ timeLeft });
        expect(mockComponent.turnTimer).toEqual(timeLeft);
    });

    it('should handle gridUpdate event correctly when game and grid exist', () => {
        let gridUpdateCallback: (data: { grid: Tile[][] }) => void = () => {};
        mockSocketClientService.on.and.callFake((event: string, callback: any) => {
            if (event === 'gridUpdate') {
                gridUpdateCallback = callback;
            }
            return () => {};
        });
        service.initializeSocketListeners(mockComponent);
        expect(gridUpdateCallback).toBeDefined();
        const grid = MOCK_GRID;
        mockComponent.game = { grid } as Game;
        gridUpdateCallback({ grid });
        expect(mockComponent.game.grid).toEqual(grid);
    });

    it('should not update grid if game or grid does not exist', () => {
        let gridUpdateCallback: (data: { grid: Tile[][] }) => void = () => {};
        mockSocketClientService.on.and.callFake((event: string, callback: any) => {
            if (event === 'gridUpdate') {
                gridUpdateCallback = callback;
            }
            return () => {};
        });
        service.initializeSocketListeners(mockComponent);
        expect(gridUpdateCallback).toBeDefined();
        const grid = MOCK_GRID;
        mockComponent.game = null;
        gridUpdateCallback({ grid });
        expect(mockComponent.game).toBeNull();
    });

    it('should handle noMoreEscapesLeft event correctly', () => {
        let noMoreEscapesLeftCallback: (data: { player: Player; attemptsLeft: number }) => void = () => {};
        mockSocketClientService.on.and.callFake((event: string, callback: any) => {
            if (event === 'noMoreEscapesLeft') {
                noMoreEscapesLeftCallback = callback;
            }
            return () => {};
        });
        service.initializeSocketListeners(mockComponent);
        expect(noMoreEscapesLeftCallback).toBeDefined();
        const player: Player = { name: 'Player1', movementPoints: 5, actionPoints: 1, speed: 5 } as Player;
        const attemptsLeft = 1;
        noMoreEscapesLeftCallback({ player, attemptsLeft });
        expect(mockComponent.escapeAttempts).toEqual(attemptsLeft);
    });

    it('should toggle debug mode to true and show "Mode debug activé" when adminModeChangedServerSide is triggered', () => {
        let adminModeChangedCallback: () => void = () => {};
        mockSocketClientService.on.and.callFake((event: string, callback: any) => {
            if (event === 'adminModeChangedServerSide') {
                adminModeChangedCallback = callback;
            }
            return () => {};
        });
        service.initializeSocketListeners(mockComponent);
        mockComponent.isDebugMode = false;
        adminModeChangedCallback();
        expect(mockComponent.isDebugMode).toBeTrue();
        expect(mockSnackbarService.showMessage).toHaveBeenCalledWith('Mode debug activé');
    });

    it('should unsubscribe from all socket events', () => {
        service.unsubscribeSocketListeners();
        events.forEach((event) => {
            expect(mockSocketClientService.socket.off).toHaveBeenCalledWith(event);
        });
        expect(mockSocketClientService.socket.off).toHaveBeenCalledTimes(events.length);
    });

    it('should handle combat ended with actionPoints 1 and movementPoints 0 and no adjacent ice, no action available', () => {
        let combatEndedCallback: (data: { winner: Player; hasEvaded: boolean }) => void = () => {};
        mockSocketClientService.on.and.callFake((event: string, callback: any) => {
            if (event === 'combatEnded') {
                combatEndedCallback = callback;
            }
            return () => {};
        });
        service.initializeSocketListeners(mockComponent);
        mockComponent.clientPlayer = {
            name: 'Player1',
            speed: 5,
            movementPoints: 0,
            actionPoints: 1,
            inventory: [null, null],
            isAdmin: false,
            hasAbandoned: false,
            isActive: true,
            combatWon: 0,
        } as Player;

        mockComponent.currentPlayer = {
            name: 'Player1',
            speed: 5,
            movementPoints: 0,
            actionPoints: 1,
            inventory: [null, null],
            isAdmin: false,
            hasAbandoned: false,
            isActive: true,
            combatWon: 0,
        } as Player;

        mockComponent.movementPointsRemaining = 0;

        mockComponent.game = {
            id: 'game1',
            name: 'Test Game',
            size: '10x10',
            mode: 'classic',
            lastModified: new Date('2023-10-01'),
            isVisible: true,
            previewImage: 'image-url',
            description: 'This is a test game',
            grid: [],
        } as Game;

        const clientPlayerPosition: Tile = {
            id: 'tile1',
            type: TileType.Default,
            isOccupied: true,
            imageSrc: 'player-tile.png',
            isOpen: true,
        };
        mockComponent.getClientPlayerPosition.and.returnValue(clientPlayerPosition);
        mockPlayerMovementService.hasAdjacentIce.and.returnValue(false);
        mockPlayerMovementService.hasAdjacentPlayerOrDoor.and.returnValue(false);
        const winner: Player = {
            name: 'Player1',
            speed: 5,
            movementPoints: 0,
            actionPoints: 1,
            inventory: [null, null],
            isAdmin: false,
            hasAbandoned: false,
            isActive: true,
            combatWon: 1,
        } as Player;

        combatEndedCallback({ winner, hasEvaded: false });
        expect(mockComponent.endTurn).toHaveBeenCalled();
    });

    it('should handle combatTimerUpdate event correctly', () => {
        let combatTimerUpdateCallback: (data: { timeLeft: number }) => void = () => {};
        mockSocketClientService.on.and.callFake((event: string, callback: any) => {
            if (event === 'combatTimerUpdate') {
                combatTimerUpdateCallback = callback;
            }
            return () => {};
        });

        service.initializeSocketListeners(mockComponent);
        expect(combatTimerUpdateCallback).toBeDefined();

        const timeLeft = 15;
        combatTimerUpdateCallback({ timeLeft });

        expect(mockComponent.turnTimer).toEqual(timeLeft);
    });

    it('should handle combatTurnStarted event correctly', () => {
        let combatTurnStartedCallback: (data: { fighter: Player; duration: number; escapeAttemptsLeft: number }) => void = () => {};
        mockSocketClientService.on.and.callFake((event: string, callback: any) => {
            if (event === 'combatTurnStarted') {
                combatTurnStartedCallback = callback;
            }
            return () => {};
        });

        service.initializeSocketListeners(mockComponent);
        expect(combatTurnStartedCallback).toBeDefined();

        const fighter: Player = {
            name: 'CombatFighter',
            speed: 6,
            movementPoints: 3,
            actionPoints: 1,
            inventory: [null, null],
            isAdmin: false,
            hasAbandoned: false,
            isActive: true,
            combatWon: 2,
        } as Player;

        combatTurnStartedCallback({
            fighter,
            duration: 30,
            escapeAttemptsLeft: 1,
        });

        expect(mockComponent.currentPlayer).toEqual(fighter);
    });

    it('should handle combatStarted event correctly', () => {
        let combatStartedCallback: () => void = () => {};
        mockSocketClientService.on.and.callFake((event: string, callback: any) => {
            if (event === 'combatStarted') {
                combatStartedCallback = callback;
            }
            return () => {};
        });

        service.initializeSocketListeners(mockComponent);
        expect(combatStartedCallback).toBeDefined();

        mockComponent.isInCombatMode = false;
        combatStartedCallback();

        expect(mockComponent.isInCombatMode).toBeTrue();
    });

    it('should handle game-abandoned event correctly when player is found', () => {
        let gameAbandonedCallback: (data: { player: Player }) => void = () => {};
        mockSocketClientService.on.and.callFake((event: string, callback: any) => {
            if (event === 'game-abandoned') {
                gameAbandonedCallback = callback;
            }
            return () => {};
        });

        service.initializeSocketListeners(mockComponent);
        expect(gameAbandonedCallback).toBeDefined();

        mockComponent.playerList = [MOCK_PLAYER_1, MOCK_PLAYER_2];

        gameAbandonedCallback({ player: MOCK_PLAYER_1 });

        const abandonedPlayer = mockComponent.playerList.find((p) => p.name === 'Player1');
        expect(abandonedPlayer?.hasAbandoned).toBeTrue();
        expect(mockLogbookService.addEntry).toHaveBeenCalledWith('Player1 a abandonné la partie', [
            jasmine.objectContaining({ name: PLAYER_1_NAME, hasAbandoned: true }),
        ]);
    });
});
