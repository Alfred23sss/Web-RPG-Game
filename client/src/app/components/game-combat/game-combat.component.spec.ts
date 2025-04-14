import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { GameData } from '@app/classes/game-data/game-data';
import { Item } from '@app/classes/item';
import { DiceType, TileType } from '@app/enums/global.enums';
import { AttackScore } from '@app/interfaces/attack-score';
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
        type: TileType.Default,
        isOpen: true,
        item: player ? undefined : createMockItem(),
        player: player || undefined,
    });

    const createMockAttackScore = (): AttackScore => ({
        score: 15,
        diceRolled: 5,
    });

    const createMockGameData = (): GameData => {
        const mockPlayer = createMockPlayer('Test Player');
        const data = new GameData();

        data.game = {
            id: 'game1',
            name: 'Test Game',
            grid: [
                [createMockTile(), createMockTile(mockPlayer)],
                [createMockTile(), createMockTile()],
            ],
            mode: 'test',
            size: 'medium',
            lastModified: new Date(),
            isVisible: true,
            previewImage: '',
            description: '',
        };

        data.clientPlayer = mockPlayer;
        data.currentPlayer = mockPlayer;
        data.playersInFight = [mockPlayer, mockPlayer];
        data.lobby = {
            accessCode: '1234',
            isLocked: false,
            game: null,
            players: [mockPlayer],
            maxPlayers: 4,
        };
        data.isInCombatMode = true;
        data.attackResult = {
            success: true,
            attackScore: createMockAttackScore(),
            defenseScore: createMockAttackScore(),
        };
        data.movementPointsRemaining = 3;
        data.availablePath = [createMockTile()];
        data.quickestPath = [createMockTile()];
        data.playerTile = createMockTile(mockPlayer);

        return data;
    };

    beforeEach(async () => {
        gameDataSubject = new Subject<GameData>();
        closePopupSubject = new Subject<void>();

        mockDialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);
        mockGameStateService = jasmine.createSpyObj('GameStateSocketService', [], {
            gameData$: gameDataSubject.asObservable(),
            closePopup$: closePopupSubject.asObservable(),
            gameDataSubjectValue: createMockGameData(),
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

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should set players from playersInFight if available', () => {
        const testGameData = createMockGameData();
        testGameData.playersInFight = [createMockPlayer('Fighter1'), createMockPlayer('Fighter2')];

        TestBed.resetTestingModule();
        TestBed.configureTestingModule({
            imports: [GameCombatComponent],
            providers: [
                { provide: MatDialogRef, useValue: mockDialogRef },
                { provide: GameStateSocketService, useValue: mockGameStateService },
                { provide: GameplayService, useValue: mockGameplayService },
                {
                    provide: MAT_DIALOG_DATA,
                    useValue: {
                        gameData: testGameData,
                        attacker: createMockPlayer('Attacker'),
                        defender: createMockPlayer('Defender'),
                    },
                },
            ],
        });

        const testFixture = TestBed.createComponent(GameCombatComponent);
        const testComponent = testFixture.componentInstance;
        testFixture.detectChanges();

        expect(testComponent.attacker.name).toBe('Fighter1');
        expect(testComponent.defender.name).toBe('Fighter2');
    });

    describe('Subscriptions', () => {
        it('should update gameData when gameData$ emits', () => {
            const newGameData = createMockGameData();
            newGameData.isInCombatMode = false;
            newGameData.attackResult = null;

            gameDataSubject.next(newGameData);

            expect(component.gameData.isInCombatMode).toBeFalse();
            expect(component.gameData.attackResult).toBeNull();
        });

        it('should close dialog when closePopup$ emits', () => {
            closePopupSubject.next();
            expect(mockDialogRef.close).toHaveBeenCalled();
        });
    });

    describe('Methods', () => {
        it('should call attack service', () => {
            component.onAttack();
            expect(mockGameplayService.attack).toHaveBeenCalledWith(component.gameData);
            expect(mockGameStateService.gameDataSubjectValue.actionTaken).toBeTrue();
        });

        it('should call evade service', () => {
            component.onEvade();
            expect(mockGameplayService.evade).toHaveBeenCalledWith(component.gameData);
            expect(mockGameStateService.gameDataSubjectValue.actionTaken).toBeTrue();
        });

        it('should close dialog', () => {
            component.onClose();
            expect(mockDialogRef.close).toHaveBeenCalled();
        });
    });
});
