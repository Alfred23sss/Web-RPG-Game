/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable max-lines */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { EventEmit, GameModeType } from '@app/enums/enums';
import { VirtualPlayerEvents } from '@app/gateways/virtual-player/virtual-player.gateway.events';
import { AttackScore } from '@app/interfaces/attack-score';
import { DiceType } from '@app/interfaces/dice';
import { Item } from '@app/interfaces/item';
import { Player } from '@app/interfaces/player';
import { VirtualPlayer } from '@app/interfaces/virtual-player';
import { Tile, TileType } from '@app/model/database/tile';
import { AccessCodesService } from '@app/services/access-codes/access-codes.service';
import { GameCombatService } from '@app/services/combat-manager/combat-manager.service';
import { GameSessionService } from '@app/services/game-session/game-session.service';
import { GameStatisticsService } from '@app/services/game-statistics/game-statistics.service';
import { LobbyService } from '@app/services/lobby/lobby.service';
import { Test, TestingModule } from '@nestjs/testing';
import { Server, Socket } from 'socket.io';

import { GameGateway } from './game.gateway';

const MOCK_PLAYER: Player = {
    name: 'test-player',
    avatar: 'avatar.png',
    speed: 5,
    attack: { value: 4, bonusDice: DiceType.D6 },
    defense: { value: 4, bonusDice: DiceType.D4 },
    hp: { current: 10, max: 10 },
    movementPoints: 3,
    actionPoints: 3,
    inventory: [null, null],
    isAdmin: false,
    hasAbandoned: false,
    isActive: false,
    combatWon: 0,
    isVirtual: false,
};
const ACCESS_CODE = 'test123';
const ATTACKER_NAME = 'attacker';
const DEFENDER_NAME = 'defender';
const MOCK_PAYLOAD = {
    accessCode: ACCESS_CODE,
    name: 'mock-payload',
    attackerName: ATTACKER_NAME,
    defenderName: DEFENDER_NAME,
    isDebugMode: false,
    grid: [],
    player: MOCK_PLAYER,
};
const MOCK_CLIENT = { leave: jest.fn() } as unknown as Socket;

describe('GameGateway', () => {
    let gateway: GameGateway;
    let serverMock: Partial<Server>;
    let gameSessionServiceMock: Partial<GameSessionService>;
    let lobbyServiceMock: Partial<LobbyService>;
    let combatServiceMock: Partial<GameCombatService>;
    let accessCodeServiceMock: Partial<AccessCodesService>;
    let gameStatisticsServiceMock: Partial<GameStatisticsService>;

    const mockTile: Tile = {
        id: 'tile1',
        imageSrc: '',
        isOccupied: false,
        isOpen: true,
        player: MOCK_PLAYER,
        type: TileType.Water,
    };

    beforeEach(async () => {
        serverMock = {
            to: jest.fn().mockReturnThis(),
            emit: jest.fn(),
        };

        gameSessionServiceMock = {
            createGameSession: jest.fn().mockReturnValue({
                turn: { orderedPlayers: [] },
                game: {},
            }),
            getGameSession: jest.fn().mockReturnValue({
                turn: { orderedPlayers: [] },
                game: {},
            }),
            handlePlayerAbandoned: jest.fn().mockReturnValue(MOCK_PLAYER),
            endTurn: jest.fn(),
            deleteGameSession: jest.fn(),
            updatePlayerPosition: jest.fn().mockResolvedValue(undefined),
            updateDoorTile: jest.fn(),
            callTeleport: jest.fn(),
            handleItemDropped: jest.fn(),
            updateWallTile: jest.fn(),
            handlePlayerItemReset: jest.fn(),
        };
        serverMock = {
            to: jest.fn().mockReturnThis(),
            emit: jest.fn(),
            sockets: {
                sockets: {
                    get: jest.fn().mockImplementation(() => ({ leave: jest.fn() })),
                },
            },
        } as unknown as Server;

        lobbyServiceMock = {
            getLobby: jest.fn().mockReturnValue({ players: [MOCK_PLAYER, MOCK_PLAYER, MOCK_PLAYER] }),
            leaveLobby: jest.fn(),
            clearLobby: jest.fn(),
            getPlayerSocket: jest.fn().mockImplementation((name) => `socket_${name}`),
            getLobbyPlayers: jest.fn().mockReturnValue([MOCK_PLAYER]),
            getPlayerBySocketId: jest.fn().mockReturnValue(MOCK_PLAYER),
        };

        gameStatisticsServiceMock = {
            getGameStatistics: jest.fn(),
        };

        combatServiceMock = {
            startCombat: jest.fn(),
            performAttack: jest.fn(),
            attemptEscape: jest.fn(),
            handleCombatSessionAbandon: jest.fn(),
        };

        accessCodeServiceMock = {
            removeAccessCode: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                GameGateway,
                { provide: LobbyService, useValue: lobbyServiceMock },
                { provide: GameSessionService, useValue: gameSessionServiceMock },
                { provide: GameCombatService, useValue: combatServiceMock },
                { provide: AccessCodesService, useValue: accessCodeServiceMock },
                { provide: GameStatisticsService, useValue: gameStatisticsServiceMock },
            ],
        }).compile();

        gateway = module.get<GameGateway>(GameGateway);
        gateway.server = serverMock as Server;
    });

    it('should be defined', () => {
        expect(gateway).toBeDefined();
    });

    describe('handleCreateGame', () => {
        it('should create a game session and emit gameStarted', () => {
            const payload = {
                accessCode: ACCESS_CODE,
                gameMode: GameModeType.Classic,
            };
            gateway.handleCreateGame(MOCK_CLIENT, payload);

            expect(gameSessionServiceMock.createGameSession).toHaveBeenCalledWith(payload.accessCode, payload.gameMode);
            expect(serverMock.to).toHaveBeenCalledWith(payload.accessCode);
            expect(serverMock.emit).toHaveBeenCalledWith('gameStarted', {
                orderedPlayers: [],
                updatedGame: {},
            });
        });
    });

    describe('handleEndTurn', () => {
        it('should end the current turn', () => {
            gateway.handleEndTurn(MOCK_CLIENT, MOCK_PAYLOAD);

            expect(gameSessionServiceMock.endTurn).toHaveBeenCalledWith(MOCK_PAYLOAD.accessCode);
        });
    });

    describe('handleStartCombat', () => {
        it('should start combat between players', () => {
            gateway.handleStartCombat(MOCK_CLIENT, MOCK_PAYLOAD);

            expect(combatServiceMock.startCombat).toHaveBeenCalledWith(
                MOCK_PAYLOAD.accessCode,
                MOCK_PAYLOAD.attackerName,
                MOCK_PAYLOAD.defenderName,
                MOCK_PAYLOAD.isDebugMode,
            );
        });
    });

    describe('handlePerformAttack', () => {
        it('should perform an attack', () => {
            gateway.handlePerformAttack(MOCK_CLIENT, MOCK_PAYLOAD);

            expect(combatServiceMock.performAttack).toHaveBeenCalledWith(MOCK_PAYLOAD.accessCode, MOCK_PAYLOAD.attackerName);
        });
    });

    describe('handlePlayerMovementUpdate', () => {
        it('should update player position', async () => {
            const previousTile = { ...mockTile, player: MOCK_PLAYER };
            const newTile = { ...mockTile, player: null };
            const movement = [mockTile];
            const payload = {
                accessCode: ACCESS_CODE,
                previousTile,
                newTile,
                movement,
            };

            await gateway.handlePlayerMovementUpdate(MOCK_CLIENT, payload);

            expect(gameSessionServiceMock.updatePlayerPosition).toHaveBeenCalledWith(payload.accessCode, payload.movement, MOCK_PLAYER);
        });
    });

    describe('handleDecrementItem', () => {
        it('should call decrementItem via manual injection', () => {
            const mockItem: Item = {
                id: '1',
                name: 'Elixir',
                description: '',
                imageSrc: '',
                imageSrcGrey: '',
                itemCounter: 1,
            };

            const spy = jest.fn();
            (gateway as any).statisticsService = { decrementItem: spy };

            const payload = {
                selectedItem: mockItem,
                accessCode: ACCESS_CODE,
                player: MOCK_PLAYER,
            };

            gateway.handleDecrementItem({} as Socket, payload);
            expect(spy).toHaveBeenCalledWith(ACCESS_CODE, mockItem, MOCK_PLAYER);
        });
    });

    describe('handlePlayerItemReset', () => {
        it('should call gameSessionService.handlePlayerItemReset with correct parameters', () => {
            const spy = jest.fn();
            (gateway as any).gameSessionService = {
                handlePlayerItemReset: spy,
            };

            const payload = {
                accessCode: ACCESS_CODE,
                player: MOCK_PLAYER,
            };

            gateway.handlePlayerItemReset({} as Socket, payload);

            expect(spy).toHaveBeenCalledWith(ACCESS_CODE, MOCK_PLAYER);
        });
    });

    describe('handleDoorUpdate', () => {
        it('should update door tile', () => {
            const payload = { accessCode: ACCESS_CODE, currentTile: mockTile, targetTile: mockTile };

            gateway.handleDoorUpdate(MOCK_CLIENT, payload);

            expect(gameSessionServiceMock.updateDoorTile).toHaveBeenCalledWith(
                payload.accessCode,
                payload.currentTile,
                payload.targetTile,
                MOCK_PLAYER,
            );
        });
    });

    describe('handleEvade', () => {
        it('should attempt escape', () => {
            const payload = { accessCode: ACCESS_CODE, player: MOCK_PLAYER };

            gateway.handleEvade(payload);

            expect(combatServiceMock.attemptEscape).toHaveBeenCalledWith(payload.accessCode, MOCK_PLAYER);
        });
    });

    describe('handleAdminModeUpdate', () => {
        it('should emit admin mode change', () => {
            gateway.handleAdminModeUpdate(MOCK_CLIENT, MOCK_PAYLOAD);

            expect(serverMock.emit).toHaveBeenCalledWith('adminModeChangedServerSide');
        });
    });

    describe('handleTeleportPlayer', () => {
        it('should teleport player', () => {
            const payload = { accessCode: ACCESS_CODE, player: MOCK_PLAYER, targetTile: mockTile };

            gateway.handleTeleportPlayer(MOCK_CLIENT, payload);

            expect(gameSessionServiceMock.callTeleport).toHaveBeenCalledWith(payload.accessCode, payload.player, payload.targetTile);
        });
    });

    describe('handleNoMoreEscapeAttempts', () => {
        it('should notify player about failed escape attempts', () => {
            const payload = {
                attemptsLeft: 2,
                isEscapeSuccessful: false,
                accessCode: ACCESS_CODE,
                player: MOCK_PLAYER,
            };

            gateway.handleNoMoreEscapeAttempts(payload);

            expect(serverMock.to).toHaveBeenCalledWith('test123');
            expect(serverMock.emit).toHaveBeenCalledWith('escapeAttempt', {
                attemptsLeft: 2,
                isEscapeSuccessful: false,
                player: MOCK_PLAYER,
            });
        });
    });

    describe('handleDoorUpdateEvent', () => {
        it('should broadcast door state changes', () => {
            const mockGrid = [[mockTile]];
            const payload = {
                accessCode: ACCESS_CODE,
                grid: mockGrid,
                isOpen: true,
                player: MOCK_PLAYER as VirtualPlayer,
            };

            gateway.handleDoorUpdateEvent(payload);

            expect(serverMock.emit).toHaveBeenCalledWith('doorClicked', {
                grid: [
                    [
                        expect.objectContaining({
                            id: 'tile1',
                            type: TileType.Water,
                        }),
                    ],
                ],
                isOpen: true,
                player: MOCK_PLAYER,
            });
        });
    });

    describe('handlePlayerMovement', () => {
        it('should broadcast player movement status', () => {
            const payload = {
                accessCode: ACCESS_CODE,
                grid: [[mockTile]],
                player: MOCK_PLAYER,
                isCurrentlyMoving: true,
            };

            gateway.handlePlayerMovement(payload);

            expect(serverMock.to).toHaveBeenCalledWith(ACCESS_CODE);
            expect(serverMock.emit).toHaveBeenCalledWith('playerMovement', {
                grid: payload.grid,
                player: MOCK_PLAYER,
                isCurrentlyMoving: true,
            });
        });
    });

    describe('handleTransitionStarted', () => {
        it('should initiate turn transition sequence', () => {
            const TRANSITION_PAYLOAD = {
                accessCode: ACCESS_CODE,
                nextPlayer: MOCK_PLAYER,
            };

            gateway.handleTransitionStarted(TRANSITION_PAYLOAD);

            expect(serverMock.to).toHaveBeenCalledWith(ACCESS_CODE);
            expect(serverMock.emit).toHaveBeenCalledWith('transitionStarted', {
                nextPlayer: MOCK_PLAYER,
                transitionDuration: 3,
            });
        });
    });

    describe('handleCombatResult', () => {
        it('should broadcast attack results to combat participants', () => {
            const payload = {
                currentFighter: MOCK_PLAYER,
                defenderPlayer: MOCK_PLAYER,
                attackSuccessful: true,
                attackerScore: { score: 15, diceRolled: 3 },
                defenseScore: { score: 15, diceRolled: 3 },
                accessCode: ACCESS_CODE,
            };

            gateway.handleCombatResult(payload);

            expect(lobbyServiceMock.getPlayerSocket).toHaveBeenCalledTimes(2);
            expect(serverMock.to).toHaveBeenCalledWith(['socket_test-player', 'socket_test-player']);
            expect(serverMock.emit).toHaveBeenCalledWith('attackResult', {
                success: true,
                attackScore: { score: 15, diceRolled: 3 },
                defenseScore: { score: 15, diceRolled: 3 },
            });
        });
    });

    describe('Event Handlers', () => {
        it('should handle combat ended event', () => {
            const payload = { attacker: MOCK_PLAYER, defender: MOCK_PLAYER, currentFighter: MOCK_PLAYER, hasEvaded: false, accessCode: '1234' };
            gateway.handleCombatEnded(payload);

            expect(serverMock.to).toHaveBeenCalledWith(['socket_test-player', 'socket_test-player']);
            expect(serverMock.emit).toHaveBeenCalledWith('combatEnded', {
                winner: MOCK_PLAYER,
                hasEvaded: false,
            });
        });

        it('should emit VPActionDone if attacker is virtual and is currentFighter', () => {
            const attacker = { ...MOCK_PLAYER, name: 'Bot1', isVirtual: true };
            const payload = {
                attacker,
                defender: MOCK_PLAYER,
                currentFighter: attacker,
                hasEvaded: false,
                accessCode: ACCESS_CODE,
            };

            const emitEventSpy = jest.fn();
            (gateway as any).gameCombatService = {
                emitEvent: emitEventSpy,
            };
            (gateway as any).lobbyService = {
                getPlayerSocket: jest.fn().mockReturnValue('socket-Bot1'),
            };

            gateway.handleCombatEnded(payload);

            expect(emitEventSpy).toHaveBeenCalledWith(EventEmit.VPActionDone, ACCESS_CODE);
        });
        it('should emit EndVirtualPlayerTurn if attacker is virtual and not the currentFighter', () => {
            const attacker = { ...MOCK_PLAYER, name: 'Bot1', isVirtual: true };
            const currentFighter = { ...MOCK_PLAYER, name: 'Human1', isVirtual: false };
            const defender = { ...MOCK_PLAYER, name: 'Defender1' };

            const payload = {
                attacker,
                defender,
                currentFighter,
                hasEvaded: false,
                accessCode: ACCESS_CODE,
            };

            const emitEventSpy = jest.fn();
            (gateway as any).gameCombatService = {
                emitEvent: emitEventSpy,
            };
            (gateway as any).lobbyService = {
                getPlayerSocket: jest.fn().mockReturnValue('socket-id'),
            };

            gateway.handleCombatEnded(payload);

            expect(emitEventSpy).toHaveBeenCalledWith(VirtualPlayerEvents.EndVirtualPlayerTurn, { accessCode: ACCESS_CODE });
        });

        it('should handle grid update event', () => {
            gateway.handleGridUpdateEvent(MOCK_PAYLOAD);

            expect(serverMock.emit).toHaveBeenCalledWith('gridUpdate', { grid: MOCK_PAYLOAD.grid });
        });
    });

    describe('handleCombatResult', () => {
        it('should send attack results to both combatants', () => {
            const mockAttacker = { ...MOCK_PLAYER, name: 'attacker' };
            const mockDefender = { ...MOCK_PLAYER, name: 'defender' };

            const payload: {
                currentFighter: Player;
                defenderPlayer: Player;
                attackSuccessful: boolean;
                attackerScore: AttackScore;
                defenseScore: AttackScore;
                accessCode: string;
            } = {
                currentFighter: mockAttacker,
                defenderPlayer: mockDefender,
                attackSuccessful: true,
                attackerScore: { diceRolled: 0, score: 15 },
                defenseScore: { diceRolled: 0, score: 12 },
                accessCode: ACCESS_CODE,
            };

            gateway.handleCombatResult(payload);

            expect(lobbyServiceMock.getPlayerSocket).toHaveBeenCalledWith('attacker');
            expect(lobbyServiceMock.getPlayerSocket).toHaveBeenCalledWith('defender');

            expect(serverMock.to).toHaveBeenCalledWith(['socket_attacker', 'socket_defender']);
            expect(serverMock.emit).toHaveBeenCalledWith('attackResult', {
                success: true,
                attackScore: { diceRolled: 0, score: 15 },
                defenseScore: { diceRolled: 0, score: 12 },
            });
        });
    });

    describe('handleTurnStarted', () => {
        it('should announce new turn start to the game room', () => {
            gateway.handleTurnStarted(MOCK_PAYLOAD);

            expect(serverMock.to).toHaveBeenCalledWith(MOCK_PAYLOAD.accessCode);
            expect(serverMock.emit).toHaveBeenCalledWith('turnStarted', {
                player: MOCK_PLAYER,
                turnDuration: 30,
            });
        });
    });

    describe('handleGameEnded', () => {
        it('should log, clean up services, and emit gameEnded with correct stats', () => {
            const accessCode = 'test-room';
            const winner = ['Player1'];

            const mockStats = {
                playerStats: new Map<string, any>([
                    [
                        'Player1',
                        {
                            kills: 3,
                            deaths: 1,
                            uniqueItemsCollected: new Map<string, number>([
                                ['item1', 1],
                                ['item2', 2],
                            ]),
                        },
                    ],
                ]),
                totalTurns: 10,
            };

            const calculateStatsSpy = jest.fn().mockReturnValue(mockStats);
            const cleanUpSpy = jest.fn();
            const deleteGameSessionSpy = jest.fn();
            const removeAccessCodeSpy = jest.fn();
            const loggerSpy = jest.fn();
            const emitSpy = jest.fn();

            (gateway as any).statisticsService = {
                calculateStats: calculateStatsSpy,
                cleanUp: cleanUpSpy,
            };
            (gateway as any).gameSessionService = {
                deleteGameSession: deleteGameSessionSpy,
            };
            (gateway as any).accessCodesService = {
                removeAccessCode: removeAccessCodeSpy,
            };
            (gateway as any).server = {
                to: jest.fn().mockReturnThis(),
                emit: emitSpy,
            };
            (gateway as any).logger = {
                log: loggerSpy,
            };

            gateway.handleGameEnded({ accessCode, winner });

            const expectedStatsObject = {
                ...mockStats,

                playerStats: {
                    // eslint-disable-next-line @typescript-eslint/naming-convention
                    Player1: {
                        kills: 3,
                        deaths: 1,
                        uniqueItemsCollected: {
                            item1: 1,
                            item2: 2,
                        },
                    },
                },
            };

            expect(calculateStatsSpy).toHaveBeenCalledWith(accessCode);
            expect(cleanUpSpy).toHaveBeenCalledWith(accessCode);
            expect(deleteGameSessionSpy).toHaveBeenCalledWith(accessCode);
            expect(removeAccessCodeSpy).toHaveBeenCalledWith(accessCode);
            expect(emitSpy).toHaveBeenCalledWith('gameEnded', { winner, stats: expectedStatsObject });
        });
    });

    describe('handleGameTurnResumed', () => {
        it('should announce game turn resumed to the game room', () => {
            gateway.handleGameTurnResumed(MOCK_PAYLOAD);

            expect(serverMock.to).toHaveBeenCalledWith(MOCK_PAYLOAD.accessCode);
            expect(serverMock.emit).toHaveBeenCalledWith('gameTurnResumed', {
                player: MOCK_PLAYER,
            });
        });
    });

    describe('handleDefenderHealthUpdate', () => {
        it('should send player update to specific socket', () => {
            gateway.handleDefenderHealthUpdate(MOCK_PAYLOAD);

            const expectedSocketId = 'test123';
            expect(serverMock.to).toHaveBeenCalledWith(expectedSocketId);
            expect(serverMock.emit).toHaveBeenCalledWith('playerUpdate', {
                player: MOCK_PAYLOAD.player,
            });
        });
    });

    describe('handleUpdatePlayerList', () => {
        it('should broadcast updated player list to the game room', () => {
            const mockPlayers = [MOCK_PLAYER, MOCK_PLAYER];
            const payload = {
                accessCode: ACCESS_CODE,
                players: mockPlayers,
            };

            gateway.handleUpdatePlayerList(payload);

            expect(serverMock.to).toHaveBeenCalledWith(payload.accessCode);
            expect(serverMock.emit).toHaveBeenCalledWith('playerListUpdate', {
                players: mockPlayers,
            });
        });
    });

    describe('handleTimerUpdate', () => {
        it('should broadcast timer updates to the game room', () => {
            const payload = {
                accessCode: ACCESS_CODE,
                timeLeft: 45,
            };

            gateway.handleTimerUpdate(payload);

            expect(serverMock.to).toHaveBeenCalledWith(payload.accessCode);
            expect(serverMock.emit).toHaveBeenCalledWith('timerUpdate', {
                timeLeft: payload.timeLeft,
            });
        });
    });

    describe('handleCombatStarted', () => {
        it('should notify combat participants about combat start', () => {
            const payload = {
                accessCode: ACCESS_CODE,
                attacker: MOCK_PLAYER,
                defender: MOCK_PLAYER,
                currentPlayerName: ATTACKER_NAME,
            };

            const mockAttackerSocketId = 'socket_attacker';
            const mockDefenderSocketId = 'socket_defender';
            lobbyServiceMock.getPlayerSocket = jest.fn().mockReturnValueOnce(mockAttackerSocketId).mockReturnValueOnce(mockDefenderSocketId);

            gateway.handleCombatStarted(payload);

            expect(lobbyServiceMock.getPlayerSocket).toHaveBeenCalledWith(payload.attacker.name);
            expect(lobbyServiceMock.getPlayerSocket).toHaveBeenCalledWith(payload.defender.name);
            expect(serverMock.to).toHaveBeenCalledWith([mockAttackerSocketId, mockDefenderSocketId]);

            expect(serverMock.emit).toHaveBeenCalledWith('combatStarted', {
                attacker: payload.attacker,
                defender: payload.defender,
            });
        });
    });

    describe('handleCombatTimerUpdate', () => {
        it('should emit combat timer updates to attacker and defender sockets', () => {
            const mockAttacker = { ...MOCK_PLAYER, name: 'attacker' };
            const mockDefender = { ...MOCK_PLAYER, name: 'defender' };
            const payload = {
                accessCode: ACCESS_CODE,
                attacker: mockAttacker,
                defender: mockDefender,
                timeLeft: 30,
            };

            gateway.handleCombatTimerUpdate(payload);

            expect(lobbyServiceMock.getPlayerSocket).toHaveBeenCalledWith('attacker');
            expect(lobbyServiceMock.getPlayerSocket).toHaveBeenCalledWith('defender');

            expect(serverMock.to).toHaveBeenCalledWith(['socket_attacker', 'socket_defender']);
            expect(serverMock.emit).toHaveBeenCalledWith('combatTimerUpdate', {
                timeLeft: payload.timeLeft,
            });
        });
    });

    describe('handleAdminModeDisabled', () => {
        it('should emit admin mode disabled event', () => {
            gateway.handleAdminModeDisabled(MOCK_PAYLOAD);

            expect(serverMock.to).toHaveBeenCalledWith(MOCK_PAYLOAD.accessCode);
            expect(serverMock.emit).toHaveBeenCalledWith('adminModeDisabled');
        });
    });

    describe('handleCombatTurnStarted', () => {
        it('should emit combat turn started event to attacker and defender sockets', () => {
            const mockAttacker = { ...MOCK_PLAYER, name: 'attacker' };
            const mockDefender = { ...MOCK_PLAYER, name: 'defender' };
            const payload = {
                accessCode: ACCESS_CODE,
                player: mockAttacker,
                defender: mockDefender,
            };

            gateway.handleCombatTurnStarted(payload);

            expect(lobbyServiceMock.getPlayerSocket).toHaveBeenCalledWith('attacker');
            expect(lobbyServiceMock.getPlayerSocket).toHaveBeenCalledWith('defender');

            expect(serverMock.to).toHaveBeenCalledWith(['socket_attacker', 'socket_defender']);
            expect(serverMock.emit).toHaveBeenCalledWith('combatTurnStarted', {
                fighter: mockAttacker,
            });
        });
    });
    it('should log player update and emit playerClientUpdate event with correct player data', () => {
        const mockPlayer = { ...MOCK_PLAYER, name: 'UpdatedPlayer' };
        const accessCode = 'update-access-code';

        gateway.handlePlayerClientUpdate({
            accessCode,
            player: mockPlayer,
        });

        expect(serverMock.to).toHaveBeenCalledWith(accessCode);
        expect(serverMock.emit).toHaveBeenCalledWith('playerClientUpdate', {
            player: mockPlayer,
        });
    });
    it('should emit itemChoice event with 3 items to the correct player socket', () => {
        const mockItems = [
            { id: 'item1', name: 'Sword', description: '', effect: () => {} },
            { id: 'item2', name: 'Shield', description: '', effect: () => {} },
            { id: 'item3', name: 'Potion', description: '', effect: () => {} },
        ] as unknown as [Item, Item, Item];

        const mockPlayer = { ...MOCK_PLAYER, name: 'ItemPlayer' };
        const mockSocketId = 'socket_ItemPlayer';

        (lobbyServiceMock.getPlayerSocket as jest.Mock).mockReturnValue(mockSocketId);

        gateway.handleItemChoiceEvent({
            player: mockPlayer,
            items: mockItems,
        });

        expect(lobbyServiceMock.getPlayerSocket).toHaveBeenCalledWith(mockPlayer.name);
        expect(serverMock.to).toHaveBeenCalledWith(mockSocketId);
        expect(serverMock.emit).toHaveBeenCalledWith('itemChoice', {
            items: mockItems,
        });
    });
    it('should emit wallClicked event with grid and log the event', () => {
        const mockGrid: Tile[][] = [
            [
                {
                    id: 'tile1',
                    imageSrc: '',
                    isOccupied: false,
                    isOpen: true,
                    player: MOCK_PLAYER,
                    type: TileType.Default,
                },
            ],
        ];
        const accessCode = 'wall-room';

        gateway.handleWallUpdateEvent({
            accessCode,
            grid: mockGrid,
        });

        expect(serverMock.to).toHaveBeenCalledWith(accessCode);
        expect(serverMock.emit).toHaveBeenCalledWith('wallClicked', {
            grid: mockGrid,
        });
    });
    it('should call gameSessionService.handleItemDropped with correct payload', () => {
        const mockItem: Item = {
            id: 'item1',
            name: 'Magic Wand',
            description: 'Casts spells',
            imageSrc: '',
            imageSrcGrey: '',
            itemCounter: 0,
        };

        const payload = {
            accessCode: ACCESS_CODE,
            player: MOCK_PLAYER,
            item: mockItem,
        };

        gateway.handleItemDrop(MOCK_CLIENT, payload);

        expect(gameSessionServiceMock.handleItemDropped).toHaveBeenCalledWith(payload.accessCode, payload.player, payload.item);
    });

    it('should call gameSessionService.updateWallTile with correct data and log it', () => {
        const currentTile: Tile = {
            id: 'tileA',
            imageSrc: '',
            isOccupied: false,
            isOpen: false,
            player: MOCK_PLAYER,
            type: TileType.Door,
        };

        const targetTile: Tile = {
            id: 'tileB',
            imageSrc: '',
            isOccupied: false,
            isOpen: true,
            player: null,
            type: TileType.Door,
        };

        const payload = {
            accessCode: ACCESS_CODE,
            currentTile,
            targetTile,
            player: MOCK_PLAYER,
        };

        gateway.handleWallUpdate(MOCK_CLIENT, payload);

        expect(gameSessionServiceMock.updateWallTile).toHaveBeenCalledWith(
            payload.accessCode,
            payload.currentTile,
            payload.targetTile,
            payload.player,
        );
    });
    describe('handleTeamCreated', () => {
        it('should emit teamCreated event with red and blue teams', () => {
            const redTeam: Player[] = [
                { ...MOCK_PLAYER, name: 'Red1' },
                { ...MOCK_PLAYER, name: 'Red2' },
            ];
            const blueTeam: Player[] = [
                { ...MOCK_PLAYER, name: 'Blue1' },
                { ...MOCK_PLAYER, name: 'Blue2' },
            ];
            const accessCode = '1234';

            gateway.handleTeamCreated({
                redTeam,
                blueTeam,
                accessCode,
            });

            expect(serverMock.to).toHaveBeenCalledWith(accessCode);
            expect(serverMock.emit).toHaveBeenCalledWith('teamCreated', {
                redTeam,
                blueTeam,
            });
        });
    });
});
