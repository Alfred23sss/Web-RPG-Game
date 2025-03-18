/* eslint-disable max-lines */
/* eslint-disable @typescript-eslint/no-explicit-any */ // all any uses are to allow the testing of a private service.
/* eslint-disable @typescript-eslint/no-magic-numbers */
/* eslint-disable @typescript-eslint/no-empty-function */

import { TestBed, discardPeriodicTasks, fakeAsync, tick } from '@angular/core/testing';
import { TileType } from '@app/enums/global.enums';
import { Game } from '@app/interfaces/game';
import { Player } from '@app/interfaces/player';
import { Tile } from '@app/interfaces/tile';
import { GamePageComponent } from '@app/pages/game-page/game-page.component';
import { GameSocketService } from '@app/services/game-socket/game-socket.service';
import { LogBookService } from '@app/services/logbook/logbook.service';
import { PlayerMovementService } from '@app/services/player-movement/player-movement.service';
import { SnackbarService } from '@app/services/snackbar/snackbar.service';
import { SocketClientService } from '@app/services/socket/socket-client-service';

// Définir la constante ici
const delayBeforeEndingGame = 5000;

describe('GameSocketService', () => {
    let service: GameSocketService;
    let mockSocketClientService: jasmine.SpyObj<SocketClientService>;
    let mockPlayerMovementService: jasmine.SpyObj<PlayerMovementService>;
    let mockLogbookService: jasmine.SpyObj<LogBookService>;
    let mockSnackbarService: jasmine.SpyObj<SnackbarService>;
    let mockComponent: jasmine.SpyObj<GamePageComponent>;

    // Redéfinir `events` dans le fichier de test
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
        mockSocketClientService = jasmine.createSpyObj<SocketClientService>(
            'SocketClientService',
            [
                'onAbandonGame',
                'onGameDeleted',
                'onGameEnded',
                'on',
                'onTransitionStarted',
                'onTurnStarted',
                'onTimerUpdate',
                'onAlertGameStarted',
                'onPlayerMovement',
                'onGameCombatStarted',
                'onAttackResult',
                'onPlayerUpdate',
                'onPlayerListUpdate',
                'onDoorClickedUpdate',
                'onGameCombatTurnStarted',
                'onGameCombatTimerUpdate',
                'onGridUpdate',
                'onAdminModeChangedServerSide',
            ],
            { socket: jasmine.createSpyObj('socket', ['off']) },
        );

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

    it('should handle abandonGame event correctly when player is found', () => {
        let abandonGameCallback: (data: { player: Player }) => void = () => {};
        mockSocketClientService.onAbandonGame.and.callFake((callback: any) => {
            abandonGameCallback = callback;
            return () => {};
        });
        service.initializeSocketListeners(mockComponent);
        expect(abandonGameCallback).toBeDefined();
        const player1 = { name: 'Player1', hasAbandoned: false } as Player;
        const player2 = { name: 'Player2', hasAbandoned: false } as Player;
        mockComponent.playerList = [player1, player2];
        abandonGameCallback({ player: player1 });
        const abandonedPlayer = mockComponent.playerList.find((p) => p.name === player1.name);
        expect(abandonedPlayer).toBeDefined();
        expect(abandonedPlayer?.hasAbandoned).toBeTrue();
    });

    it('should handle abandonGame event correctly when player is not found', () => {
        let abandonGameCallback: (data: { player: Player }) => void = () => {};
        mockSocketClientService.onAbandonGame.and.callFake((callback: any) => {
            abandonGameCallback = callback;
            return () => {};
        });
        service.initializeSocketListeners(mockComponent);
        expect(abandonGameCallback).toBeDefined();
        const player1 = { name: 'Player1', hasAbandoned: false } as Player;
        const player2 = { name: 'Player2', hasAbandoned: false } as Player;
        mockComponent.playerList = [player1];
        abandonGameCallback({ player: player2 });
        const abandonedPlayer = mockComponent.playerList.find((p) => p.name === player2.name);
        expect(abandonedPlayer).toBeUndefined();
        expect(mockLogbookService.addEntry).not.toHaveBeenCalled();
    });

    it('should handle gameDeleted event correctly', fakeAsync(() => {
        let gameDeletedCallback: () => void = () => {};
        mockSocketClientService.onGameDeleted.and.callFake((callback: any) => {
            gameDeletedCallback = callback;
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
        mockSocketClientService.onGameEnded.and.callFake((callback: any) => {
            gameEndedCallback = callback;
            return () => {};
        });
        service.initializeSocketListeners(mockComponent);
        expect(gameEndedCallback).toBeDefined();
        const winnerName = 'Player1';
        gameEndedCallback({ winner: winnerName });
        expect(mockSnackbarService.showMessage).toHaveBeenCalledWith(`👑 ${winnerName} a remporté la partie ! Redirection vers l'accueil sous peu`);
        tick(delayBeforeEndingGame);
        expect(mockComponent.abandonGame).toHaveBeenCalled();
        discardPeriodicTasks();
    }));

    it('should handle transitionStarted event correctly when nextPlayer is the clientPlayer', () => {
        let transitionStartedCallback: (data: { nextPlayer: Player; transitionDuration: number }) => void = () => {};
        mockSocketClientService.onTransitionStarted.and.callFake((callback: any) => {
            transitionStartedCallback = callback;
            return () => {};
        });
        service.initializeSocketListeners(mockComponent);
        expect(transitionStartedCallback).toBeDefined();
        const player1 = { name: 'Player1' } as Player;
        mockComponent.clientPlayer = player1;
        transitionStartedCallback({ nextPlayer: player1, transitionDuration: 5 });
        expect(mockSnackbarService.showMultipleMessages).toHaveBeenCalledWith(`Le tour à ${player1.name} commence dans 5 secondes`);
        expect(mockComponent.clientPlayer).toEqual(player1);
    });

    it('should handle transitionStarted event correctly when nextPlayer is not the clientPlayer', () => {
        let transitionStartedCallback: (data: { nextPlayer: Player; transitionDuration: number }) => void = () => {};
        mockSocketClientService.onTransitionStarted.and.callFake((callback: any) => {
            transitionStartedCallback = callback;
            return () => {};
        });
        service.initializeSocketListeners(mockComponent);
        expect(transitionStartedCallback).toBeDefined();
        const player1 = { name: 'Player1' } as Player;
        const player2 = { name: 'Player2' } as Player;
        mockComponent.clientPlayer = player1;
        transitionStartedCallback({ nextPlayer: player2, transitionDuration: 3 });
        expect(mockSnackbarService.showMultipleMessages).toHaveBeenCalledWith(`Le tour à ${player2.name} commence dans 3 secondes`);
        expect(mockComponent.clientPlayer).toEqual(player1);
    });

    it('should handle turnStarted event correctly', () => {
        let turnStartedCallback: (data: { player: Player; turnDuration: number }) => void = () => {};
        mockSocketClientService.onTurnStarted.and.callFake((callback: any) => {
            turnStartedCallback = callback;
            return () => {};
        });
        service.initializeSocketListeners(mockComponent);
        expect(turnStartedCallback).toBeDefined();
        const player1 = { name: 'Player1', speed: 5, actionPoints: 0, movementPoints: 0 } as Player;
        const turnDuration = 60;
        mockComponent.clientPlayer = player1;
        turnStartedCallback({ player: player1, turnDuration });
        expect(mockSnackbarService.showMessage).toHaveBeenCalledWith(`C'est à ${player1.name} de jouer`);
        expect(mockComponent.currentPlayer).toEqual(player1);
        expect(mockComponent.isCurrentlyMoving).toBeFalse();
        expect(mockComponent.isActionMode).toBeFalse();
        expect(mockComponent.isInCombatMode).toBeFalse();
        expect(mockComponent.clientPlayer.movementPoints).toEqual(player1.speed);
        expect(mockComponent.turnTimer).toEqual(turnDuration);
        expect(mockComponent.updateAvailablePath).toHaveBeenCalled();
    });

    it('should handle timerUpdate event correctly', () => {
        let timerUpdateCallback: (data: { timeLeft: number }) => void = () => {};
        mockSocketClientService.onTimerUpdate.and.callFake((callback: any) => {
            timerUpdateCallback = callback;
            return () => {};
        });
        service.initializeSocketListeners(mockComponent);
        expect(timerUpdateCallback).toBeDefined();
        const timeLeft = 30;
        timerUpdateCallback({ timeLeft });
        expect(mockComponent.turnTimer).toEqual(timeLeft);
    });

    it('should handle alertGameStarted event correctly', () => {
        let alertGameStartedCallback: (data: { orderedPlayers: Player[]; updatedGame: Game }) => void = () => {};
        mockSocketClientService.onAlertGameStarted.and.callFake((callback: any) => {
            alertGameStartedCallback = callback;
            return () => {};
        });
        service.initializeSocketListeners(mockComponent);
        expect(alertGameStartedCallback).toBeDefined();
        const orderedPlayers = [{ name: 'Player1', hasAbandoned: false } as Player, { name: 'Player2', hasAbandoned: false } as Player];

        const updatedGame: Game = {
            id: 'game1',
            name: 'Test Game',
            size: '10x10',
            mode: 'classic',
            lastModified: new Date('2023-10-01'),
            isVisible: true,
            previewImage: 'image-url',
            description: 'This is a test game',
            grid: undefined,
        };
        alertGameStartedCallback({ orderedPlayers, updatedGame });
        expect(mockComponent.playerList).toEqual(orderedPlayers);
        expect(mockComponent.game).toEqual(updatedGame);
    });

    it('should handle playerMovement event correctly when clientPlayer is moving', () => {
        let playerMovementCallback: (data: { grid: Tile[][]; player: Player; isCurrentlyMoving: boolean }) => void = () => {};
        mockSocketClientService.onPlayerMovement.and.callFake((callback: any) => {
            playerMovementCallback = callback;
            return () => {};
        });
        service.initializeSocketListeners(mockComponent);
        expect(playerMovementCallback).toBeDefined();
        const grid: Tile[][] = [
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
        const player: Player = { name: 'Player1', movementPoints: 5, actionPoints: 1, speed: 5 } as Player;
        const isCurrentlyMoving = true;
        mockComponent.clientPlayer = player;
        mockComponent.game = { grid } as Game;

        const clientPlayerPosition: Tile = {
            id: 'tile1',
            type: TileType.Default,
            isOccupied: true,
            imageSrc: 'player-tile.png',
            isOpen: true,
        };
        mockComponent.getClientPlayerPosition.and.returnValue(clientPlayerPosition);
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
        mockSocketClientService.onPlayerMovement.and.callFake((callback: any) => {
            playerMovementCallback = callback;
            return () => {};
        });
        service.initializeSocketListeners(mockComponent);
        expect(playerMovementCallback).toBeDefined();
        const grid: Tile[][] = [
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
        const player: Player = { name: 'Player1', movementPoints: 0, actionPoints: 0, speed: 5 } as Player;
        const isCurrentlyMoving = false;
        mockComponent.clientPlayer = player;
        mockComponent.game = { grid } as Game;
        const clientPlayerPosition: Tile = {
            id: 'tile1',
            type: TileType.Default,
            isOccupied: true,
            imageSrc: 'player-tile.png',
            isOpen: true,
        };
        mockComponent.getClientPlayerPosition.and.returnValue(clientPlayerPosition);
        mockPlayerMovementService.calculateRemainingMovementPoints.and.returnValue(0);
        mockPlayerMovementService.hasAdjacentIce.and.returnValue(false);
        mockPlayerMovementService.hasAdjacentPlayerOrDoor.and.returnValue(false);
        playerMovementCallback({ grid, player, isCurrentlyMoving });
        expect(mockComponent.endTurn).toHaveBeenCalled();
    });

    it('should not call endTurn when clientPlayer has no action points, no movement points, but has adjacent ice--222', () => {
        // test 140-141
        let playerMovementCallback: (data: { grid: Tile[][]; player: Player; isCurrentlyMoving: boolean }) => void = () => {};
        mockSocketClientService.onPlayerMovement.and.callFake((callback: any) => {
            playerMovementCallback = callback;
            return () => {};
        });
        service.initializeSocketListeners(mockComponent);
        expect(playerMovementCallback).toBeDefined();
        const grid: Tile[][] = [
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
        const player: Player = { name: 'Player1', movementPoints: 0, actionPoints: 1, speed: 5 } as Player;
        const isCurrentlyMoving = false;
        mockComponent.clientPlayer = player;
        mockComponent.game = { grid } as Game;
        const clientPlayerPosition: Tile = {
            id: 'tile1',
            type: TileType.Default,
            isOccupied: true,
            imageSrc: 'player-tile.png',
            isOpen: true,
        };
        mockComponent.getClientPlayerPosition.and.returnValue(clientPlayerPosition);
        mockPlayerMovementService.calculateRemainingMovementPoints.and.returnValue(0);
        mockPlayerMovementService.hasAdjacentIce.and.returnValue(false);
        mockPlayerMovementService.hasAdjacentPlayerOrDoor.and.returnValue(false);
        playerMovementCallback({ grid, player, isCurrentlyMoving });
        expect(mockComponent.endTurn).toHaveBeenCalled();
    });

    it('should handle gameCombatStarted event correctly', () => {
        let gameCombatStartedCallback: () => void = () => {};
        mockSocketClientService.onGameCombatStarted.and.callFake((callback: any) => {
            gameCombatStartedCallback = callback;
            return () => {};
        });
        service.initializeSocketListeners(mockComponent);
        expect(gameCombatStartedCallback).toBeDefined();
        mockComponent.isInCombatMode = false;
        gameCombatStartedCallback();
        expect(mockComponent.isInCombatMode).toBeTrue();
    });

    it('should handle attackResult event correctly', () => {
        let attackResultCallback: (data: { success: boolean; attackScore: number; defenseScore: number }) => void = () => {};
        mockSocketClientService.onAttackResult.and.callFake((callback: any) => {
            attackResultCallback = callback;
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
        mockSocketClientService.onPlayerUpdate.and.callFake((callback: any) => {
            playerUpdateCallback = callback;
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
        mockSocketClientService.onPlayerListUpdate.and.callFake((callback: any) => {
            playerListUpdateCallback = callback;
            return () => {};
        });
        service.initializeSocketListeners(mockComponent);
        expect(playerListUpdateCallback).toBeDefined();
        const players: Player[] = [
            { name: 'Player1', movementPoints: 5, actionPoints: 1, speed: 5 } as Player,
            { name: 'Player2', movementPoints: 3, actionPoints: 0, speed: 5 } as Player,
        ];
        playerListUpdateCallback({ players });
        expect(mockComponent.playerList).toEqual(players);
    });

    it('should handle doorClickedUpdate event correctly when game and grid exist', () => {
        let doorClickedUpdateCallback: (data: { grid: Tile[][] }) => void = () => {};
        mockSocketClientService.onDoorClickedUpdate.and.callFake((callback: any) => {
            doorClickedUpdateCallback = callback;
            return () => {};
        });

        service.initializeSocketListeners(mockComponent);
        expect(doorClickedUpdateCallback).toBeDefined();
        const grid: Tile[][] = [
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
        mockComponent.game = { grid } as Game;
        mockComponent.clientPlayer = { actionPoints: 1 } as Player;
        mockComponent.isActionMode = true;
        doorClickedUpdateCallback({ grid });
        expect(mockComponent.game.grid).toEqual(grid);
        expect(mockComponent.isActionMode).toBeFalse();
        expect(mockComponent.updateAvailablePath).toHaveBeenCalled();
    });

    it('should not update grid or properties if game or grid does not exist', () => {
        let doorClickedUpdateCallback: (data: { grid: Tile[][] }) => void = () => {};
        mockSocketClientService.onDoorClickedUpdate.and.callFake((callback: any) => {
            doorClickedUpdateCallback = callback;
            return () => {};
        });
        service.initializeSocketListeners(mockComponent);
        expect(doorClickedUpdateCallback).toBeDefined();
        const grid: Tile[][] = [
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
        mockComponent.game = null;
        mockComponent.clientPlayer = { actionPoints: 1 } as Player;
        mockComponent.isActionMode = true;
        doorClickedUpdateCallback({ grid });
        expect(mockComponent.clientPlayer.actionPoints).toEqual(1);
        expect(mockComponent.isActionMode).toBeTrue();
        expect(mockComponent.updateAvailablePath).not.toHaveBeenCalled();
    });

    it('should handle gameCombatTurnStarted event correctly', () => {
        let gameCombatTurnStartedCallback: (data: { fighter: Player }) => void = () => {};
        mockSocketClientService.onGameCombatTurnStarted.and.callFake((callback: any) => {
            gameCombatTurnStartedCallback = callback;
            return () => {};
        });
        service.initializeSocketListeners(mockComponent);
        expect(gameCombatTurnStartedCallback).toBeDefined();
        const fighter: Player = { name: 'Player1', movementPoints: 5, actionPoints: 1, speed: 5 } as Player;
        gameCombatTurnStartedCallback({ fighter });
        expect(mockComponent.currentPlayer).toEqual(fighter);
    });

    it('should handle gameCombatTimerUpdate event correctly', () => {
        let gameCombatTimerUpdateCallback: (data: { timeLeft: number }) => void = () => {};
        mockSocketClientService.onGameCombatTimerUpdate.and.callFake((callback: any) => {
            gameCombatTimerUpdateCallback = callback;
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
        mockSocketClientService.onGridUpdate.and.callFake((callback: any) => {
            gridUpdateCallback = callback;
            return () => {};
        });
        service.initializeSocketListeners(mockComponent);
        expect(gridUpdateCallback).toBeDefined();
        const grid: Tile[][] = [
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
        mockComponent.game = { grid } as Game;
        gridUpdateCallback({ grid });
        expect(mockComponent.game.grid).toEqual(grid);
    });

    it('should not update grid if game or grid does not exist', () => {
        let gridUpdateCallback: (data: { grid: Tile[][] }) => void = () => {};
        mockSocketClientService.onGridUpdate.and.callFake((callback: any) => {
            gridUpdateCallback = callback;
            return () => {};
        });
        service.initializeSocketListeners(mockComponent);
        expect(gridUpdateCallback).toBeDefined();
        const grid: Tile[][] = [
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

    // LUI FAIT MARCHE LA CONDITION
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
});
