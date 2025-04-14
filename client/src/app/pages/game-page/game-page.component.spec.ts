/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-empty-function, @angular-eslint/no-empty-lifecycle-method */
/* eslint-disable max-classes-per-file */
/* eslint-disable @angular-eslint/use-lifecycle-interface */
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, Input } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { GameData } from '@app/classes/game-data/game-data';
import { Item } from '@app/classes/item/item';
import { DiceType, ItemName, TileType } from '@app/enums/global.enums';
import { Lobby } from '@app/interfaces/lobby';
import { Player } from '@app/interfaces/player';
import { Tile } from '@app/interfaces/tile';
import { AccessCodesCommunicationService } from '@app/services/access-codes-communication/access-codes-communication.service';
import { GameStateSocketService } from '@app/services/game-state-socket/game-state-socket.service';
import { GameplayService } from '@app/services/gameplay/gameplay.service';
import { MessageService } from '@app/services/message/message.service';
import { SocketListenerService } from '@app/services/socket-listener/socket-listener.service';
import { SocketClientService } from '@app/services/socket/socket-client-service';
import { BehaviorSubject, of } from 'rxjs';
import { GamePageComponent } from './game-page.component';

@Component({
    selector: 'app-chat',
    template: '<div>Mock Chat Component</div>',
    standalone: true,
    imports: [CommonModule, FormsModule],
})
class MockChatComponent {
    @Input() author: string = '';
    messages$ = of([]);
    newMessage: string = '';
    sendMessage() {}
    ngOnDestroy() {}
}

@Component({ selector: 'app-grid', template: '<div>Mock Grid Component</div>', standalone: true })
class MockGridComponent {}

@Component({ selector: 'app-log-book', template: '<div>Mock Log Book Component</div>', standalone: true })
class MockLogBookComponent {}

@Component({ selector: 'app-player-info', template: '<div>Mock Player Info Component</div>', standalone: true })
class MockPlayerInfoComponent {}

describe('GamePageComponent', () => {
    let component: GamePageComponent;
    let fixture: ComponentFixture<GamePageComponent>;

    let mockDialog: jasmine.SpyObj<MatDialog>;
    let mockGameplayService: jasmine.SpyObj<GameplayService>;
    let mockGameStateSocketService: jasmine.SpyObj<GameStateSocketService>;
    let mockSocketListenerService: jasmine.SpyObj<SocketListenerService>;
    let mockMessageService: jasmine.SpyObj<MessageService>;
    let mockSocketClientService: jasmine.SpyObj<SocketClientService>;
    let mockAccessCodesCommunicationService: jasmine.SpyObj<AccessCodesCommunicationService>;
    let mockHttpClient: jasmine.SpyObj<HttpClient>;

    const mockGameData: GameData = new GameData();
    const mockItem: Item = new Item({
        id: 'item1',
        name: 'Test Item',
        description: 'A test item',
        imageSrc: '/path/to/item.png',
        imageSrcGrey: '/path/to/item-grey.png',
        itemCounter: 1,
    });

    const mockPlayer: Player = {
        name: 'TestPlayer',
        avatar: 'avatar.png',
        speed: 5,
        attack: { value: 4, bonusDice: DiceType.D6 },
        defense: { value: 4, bonusDice: DiceType.D4 },
        hp: { current: 10, max: 15 },
        movementPoints: 4,
        actionPoints: 1,
        inventory: [null, null],
        isAdmin: false,
        isVirtual: false,
        hasAbandoned: false,
        isActive: true,
        combatWon: 0,
        spawnPoint: { x: 0, y: 0, tileId: 'spawn1' },
    };

    const mockTile: Tile = {
        id: '1',
        imageSrc: 'image.png',
        isOccupied: false,
        type: TileType.Wall,
        isOpen: true,
        item: mockItem,
        player: mockPlayer,
    };

    beforeEach(async () => {
        mockDialog = jasmine.createSpyObj('MatDialog', ['open']);
        mockGameplayService = jasmine.createSpyObj('GameplayService', [
            'handleDoorClick',
            'handleAttackClick',
            'handleTileClick',
            'handleTeleport',
            'updateQuickestPath',
            'endTurn',
            'executeNextAction',
            'abandonGame',
            'attack',
            'evade',
            'emitAdminModeUpdate',
            'handleWallClick',
        ]);
        mockGameStateSocketService = jasmine.createSpyObj('GameStateSocketService', ['gameData$'], {
            gameData$: of(mockGameData),
        });
        mockSocketListenerService = jasmine.createSpyObj('SocketListenerService', ['initializeAllSocketListeners', 'unsubscribeSocketListeners']);

        mockMessageService = jasmine.createSpyObj(
            'MessageService',
            ['messages$', 'updateMessages', 'updateAccessCode', 'emitMessage', 'addMessage'],
            {
                messages$: new BehaviorSubject<string[]>([]),
            },
        );

        mockSocketClientService = jasmine.createSpyObj(
            'SocketClientService',
            [
                'connect',
                'off',
                'createLobby',
                'joinLobby',
                'removeAccessCode',
                'kickPlayer',
                'getLobbyPlayers',
                'getLobby',
                'getSocketId',
                'emit',
                'on',
                'sendPlayerMovementUpdate',
            ],
            {
                socket: {
                    id: 'test-socket-id',
                    on: jasmine.createSpy(),
                    off: jasmine.createSpy(),
                    emit: jasmine.createSpy(),
                    once: jasmine.createSpy(),
                },
            },
        );

        mockAccessCodesCommunicationService = jasmine.createSpyObj('AccessCodesCommunicationService', ['validateAccessCode', 'removeAccessCode']);
        mockHttpClient = jasmine.createSpyObj('HttpClient', ['get']);

        await TestBed.configureTestingModule({
            imports: [
                CommonModule,
                FormsModule,
                MockChatComponent,
                MockGridComponent,
                MockLogBookComponent,
                MockPlayerInfoComponent,
                GamePageComponent,
            ],
            providers: [
                { provide: MatDialog, useValue: mockDialog },
                { provide: GameplayService, useValue: mockGameplayService },
                { provide: GameStateSocketService, useValue: mockGameStateSocketService },
                { provide: SocketListenerService, useValue: mockSocketListenerService },
                { provide: MessageService, useValue: mockMessageService },
                { provide: SocketClientService, useValue: mockSocketClientService },
                { provide: AccessCodesCommunicationService, useValue: mockAccessCodesCommunicationService },
                { provide: HttpClient, useValue: mockHttpClient },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(GamePageComponent);
        component = fixture.componentInstance;

        mockGameData.clientPlayer = mockPlayer;
        mockGameData.currentPlayer = mockPlayer;
        mockGameData.lobby = {
            players: [{ hasAbandoned: false, inventory: [null, null] } as Player, { hasAbandoned: true, inventory: [null, null] } as Player],
        } as Lobby;
        component.gameData = mockGameData;

        mockMessageService.updateAccessCode.and.callThrough();
        mockSocketListenerService.initializeAllSocketListeners.and.callThrough();

        fixture.detectChanges();
    });

    afterEach(() => {
        fixture.destroy();
    });

    it('should create with all dependencies', () => {
        expect(component).toBeTruthy();
        expect(component.gameData).toEqual(mockGameData);
        expect(mockSocketListenerService.initializeAllSocketListeners).toHaveBeenCalled();
    });

    it('should create the component', () => {
        expect(component).toBeTruthy();
    });

    it('should initialize socket listeners', () => {
        expect(mockSocketListenerService.initializeAllSocketListeners).toHaveBeenCalled();
    });

    it('should handle tile click', () => {
        component.handleTileClick(mockTile);
        expect(mockGameplayService.handleTileClick).toHaveBeenCalledWith(mockGameData, mockTile);
    });

    it('should handle teleport', () => {
        component.handleTeleport(mockTile);
        expect(mockGameplayService.handleTeleport).toHaveBeenCalledWith(mockGameData, mockTile);
    });

    it('should update quickest path', () => {
        component.updateQuickestPath(mockTile);
        expect(mockGameplayService.updateQuickestPath).toHaveBeenCalledWith(mockGameData, mockTile);
    });

    it('should abandon game by calling gameplay service', () => {
        component.abandonGame();
        expect(mockGameplayService.abandonGame).toHaveBeenCalledWith(mockGameData);
    });

    it('should handle tile interactions', () => {
        component.handleDoorClick(mockTile);
        expect(mockGameplayService.handleDoorClick).toHaveBeenCalledWith(mockGameData, mockTile);

        component.handleAttackClick(mockTile);
        expect(mockGameplayService.handleAttackClick).toHaveBeenCalledWith(mockGameData, mockTile);
    });

    it('should handle turn management', () => {
        component.endTurn();
        expect(mockGameplayService.endTurn).toHaveBeenCalledWith(mockGameData);

        component.executeNextAction();
        expect(mockGameplayService.executeNextAction).toHaveBeenCalledWith(mockGameData);
    });
    it('should emit admin mode update when admin presses "d"', () => {
        component.gameData.clientPlayer.isAdmin = true;
        const event = new KeyboardEvent('keydown', { key: 'd' });
        component['handleKeyPress'](event);
        expect(mockGameplayService.emitAdminModeUpdate).toHaveBeenCalledWith(mockGameData);
    });

    it('should exclude abandoned players from activePlayerCount', () => {
        expect(component.activePlayerCount).toBe(1);
    });

    it('should call gameplayService.handleWallClick with gameData, targetTile, and clientPlayer', () => {
        component.handleWallClick(mockTile);

        expect(mockGameplayService.handleWallClick).toHaveBeenCalledWith(component.gameData, mockTile, mockPlayer);
    });

    it('should return flag image if there is a flag and default image if not', () => {
        expect(component.getFlagImage(mockPlayer)).toBe('./assets/items/banner-medieval.png');
        mockPlayer.inventory = [{ name: ItemName.Flag, imageSrc: 'test' } as Item, null];
        expect(component.getFlagImage(mockPlayer)).toBe('test');
    });
});
