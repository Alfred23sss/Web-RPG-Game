import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { GameData } from '@app/classes/gameData';
import { Item } from '@app/classes/item';
import { DiceType, TileType } from '@app/enums/global.enums';
import { Game } from '@app/interfaces/game';
import { Lobby } from '@app/interfaces/lobby';
import { Player } from '@app/interfaces/player';
import { Tile } from '@app/interfaces/tile';
import { GameStateSocketService } from '@app/services/game-state-socket/game-state-socket.service';
import { GameplayService } from '@app/services/gameplay/gameplay.service';
import { Subject } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import { GameCombatComponent } from './game-combat.component';

describe('GameCombatComponent', () => {
    let component: GameCombatComponent;
    let fixture: ComponentFixture<GameCombatComponent>;
    let mockDialogRef: jasmine.SpyObj<MatDialogRef<GameCombatComponent>>;
    let mockGameStateService: jasmine.SpyObj<GameStateSocketService>;
    let mockGameplayService: jasmine.SpyObj<GameplayService>;

    let gameDataSubject: Subject<GameData>;
    let closePopupSubject: Subject<void>;

    const createMockItem = (): Item =>
        new Item({
            id: uuidv4(),
            imageSrc: 'item.png',
            imageSrcGrey: 'item-grey.png',
            name: 'Test Item',
            itemCounter: 1,
            description: 'Test Description',
        });

    const createMockPlayer = (name: string): Player => ({
        name,
        avatar: 'avatar.png',
        speed: 5,
        attack: { value: 10, bonusDice: DiceType.D6 },
        defense: { value: 5, bonusDice: DiceType.D4 },
        hp: { current: 100, max: 100 },
        movementPoints: 3,
        actionPoints: 2,
        inventory: [createMockItem(), null],
        isAdmin: false,
        isVirtual: false,
        hasAbandoned: false,
        isActive: true,
        combatWon: 0,
        spawnPoint: { x: 1, y: 1, tileId: 'spawn1' },
    });

    const createMockTile = (player?: Player): Tile => ({
        id: uuidv4(),
        imageSrc: 'tile.png',
        isOccupied: !!player,
        type: TileType.Water,
        isOpen: true,
        item: createMockItem(),
        player: player || undefined,
    });

    const createMockGame = (): Game => ({
        id: 'game1',
        name: 'Test Game',
        size: 'medium',
        mode: 'coop',
        lastModified: new Date(),
        isVisible: true,
        previewImage: 'image.jpg',
        description: 'Test description',
        grid: [
            [createMockTile(), createMockTile(createMockPlayer('Player1'))],
            [createMockTile(), createMockTile()],
        ],
    });

    const createMockLobby = (): Lobby => ({
        isLocked: false,
        accessCode: 'ABCD',
        game: createMockGame(),
        players: [createMockPlayer('Player1'), createMockPlayer('Player2')],
        maxPlayers: 4,
    });

    const createMockGameData = (): GameData => {
        const data = new GameData();
        data.game = createMockGame();
        data.clientPlayer = createMockPlayer('Client Player');
        data.currentPlayer = createMockPlayer('Current Player');
        data.lobby = createMockLobby();
        data.isInCombatMode = true;
        data.escapeAttempts = 2;
        data.availablePath = [createMockTile()];
        data.quickestPath = [createMockTile()];
        data.playerTile = createMockTile(data.clientPlayer);
        return data;
    };

    beforeEach(async () => {
        gameDataSubject = new Subject<GameData>();
        closePopupSubject = new Subject<void>();

        mockDialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);
        mockGameStateService = jasmine.createSpyObj('GameStateSocketService', [], {
            gameData$: gameDataSubject.asObservable(),
            closePopup$: closePopupSubject.asObservable(),
        });
        mockGameplayService = jasmine.createSpyObj('GameplayService', ['attack', 'evade']);

        await TestBed.configureTestingModule({
            imports: [GameCombatComponent],
            providers: [
                { provide: MatDialogRef, useValue: mockDialogRef },
                { provide: GameStateSocketService, useValue: mockGameStateService },
                { provide: GameplayService, useValue: mockGameplayService },
                {
                    provide: MAT_DIALOG_DATA,
                    useValue: {
                        gameData: createMockGameData(),
                        attacker: createMockPlayer('Attacker'),
                        defender: createMockPlayer('Defender'),
                    },
                },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(GameCombatComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    afterEach(() => {
        gameDataSubject.complete();
        closePopupSubject.complete();
    });

    it('should create with all dependencies', () => {
        expect(component).toBeTruthy();

        expect(component.attacker.inventory[0]?.name).toBe('Test Item');
    });

    it('should initialize with complete game state', () => {
        expect(component.gameData.game.grid?.[0][0].type).toBe(TileType.Water);
        expect(component.gameData.game.grid?.[0][1].isOccupied).toBeTrue();
        expect(component.gameData.playerTile?.player?.name).toBe('Client Player');
        expect(component.defender.spawnPoint?.tileId).toBe('spawn1');
    });

    it('should update game state when receiving new data', fakeAsync(() => {
        const newData = createMockGameData();
        newData.game.name = 'Updated Game';
        newData.game.grid = [[createMockTile(), createMockTile()]];

        gameDataSubject.next(newData);
        tick();

        expect(component.gameData.game.name).toBe('Updated Game');
        expect(component.gameData.game.grid?.[0][0].item?.name).toBe('Test Item');
    }));

    it('should handle combat actions with tile interactions', () => {
        const attackTile = createMockTile(component.attacker);
        component.gameData.playerTile = attackTile;

        component.onAttack();
        expect(mockGameplayService.attack).toHaveBeenCalledWith(
            jasmine.objectContaining({
                playerTile: jasmine.objectContaining({
                    player: jasmine.objectContaining({ name: 'Attacker' }),
                }),
            }),
        );
        const evadeTile = createMockTile(component.defender);
        component.gameData.availablePath = [evadeTile];

        component.onEvade();
        expect(mockGameplayService.evade).toHaveBeenCalledWith(
            jasmine.objectContaining({
                availablePath: jasmine.arrayContaining([
                    jasmine.objectContaining({
                        player: jasmine.objectContaining({ name: 'Defender' }),
                    }),
                ]),
            }),
        );
    });

    it('should handle tile items correctly', () => {
        const itemTile = component.gameData.game.grid?.[0][0];
        expect(itemTile?.item?.imageSrc).toBe('item.png');

        const playerTile = component.gameData.game.grid?.[0][1];
        expect(playerTile?.player?.name).toBe('Player1');
    });

    it('should properly clean up subscriptions', () => {
        const gameDataUnsub = spyOn(component['gameDataSubscription'], 'unsubscribe');
        const closePopupUnsub = spyOn(component['closePopupSubscription'], 'unsubscribe');

        component.ngOnDestroy();

        expect(gameDataUnsub).toHaveBeenCalled();
        expect(closePopupUnsub).toHaveBeenCalled();
    });

    it('should handle all interface variants', () => {
        const emptyTile: Tile = {
            id: 'empty',
            imageSrc: 'empty.png',
            isOccupied: false,
            type: TileType.Wall,
            isOpen: false,
        };
        component.gameData.availablePath = [emptyTile];

        expect(component.gameData.availablePath?.[0].item).toBeUndefined();
        expect(component.gameData.availablePath?.[0].player).toBeUndefined();
    });

    it('should close the dialog when onClose is called', () => {
        component.onClose();
        expect(mockDialogRef.close).toHaveBeenCalled();
    });

    it('should call onClose when closePopup$ emits', () => {
        const onCloseSpy = spyOn(component, 'onClose');
        closePopupSubject.next();
        expect(onCloseSpy).toHaveBeenCalled();
    });
});
