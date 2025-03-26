import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { GameData } from '@app/classes/gameData';
import { Tile } from '@app/interfaces/tile';
import { GameStateSocketService } from '@app/services/game-state-socket/game-state-socket.service';
import { GameplayService } from '@app/services/gameplay/gameplay.service';
import { SocketListenerService } from '@app/services/socket-listener/socket-listener.service';
import { of } from 'rxjs';
import { GamePageComponent } from './game-page.component';

describe('GamePageComponent', () => {
    let component: GamePageComponent;
    let fixture: ComponentFixture<GamePageComponent>;
    let mockDialog: jasmine.SpyObj<MatDialog>;
    let mockGameplayService: jasmine.SpyObj<GameplayService>;
    let mockGameStateSocketService: jasmine.SpyObj<GameStateSocketService>;
    let mockSocketListenerService: jasmine.SpyObj<SocketListenerService>;

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
        ]);
        mockGameStateSocketService = jasmine.createSpyObj('GameStateSocketService', [], {
            gameData$: of(new GameData()), // ✅ Fix here
        });
        mockSocketListenerService = jasmine.createSpyObj('SocketListenerService', ['initializeAllSocketListeners', 'unsubscribeSocketListeners']);

        await TestBed.configureTestingModule({
            declarations: [GamePageComponent],
            providers: [
                { provide: MatDialog, useValue: mockDialog },
                { provide: GameplayService, useValue: mockGameplayService },
                { provide: GameStateSocketService, useValue: mockGameStateSocketService },
                { provide: SocketListenerService, useValue: mockSocketListenerService },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(GamePageComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should subscribe to gameData$', () => {
        expect(component.gameData).toBeDefined();
    });

    it('should call gameplayService handleTileClick on handleTileClick', () => {
        const tile = {} as Tile;
        component.handleTileClick(tile);
        expect(mockGameplayService.handleTileClick).toHaveBeenCalledWith(component.gameData, tile);
    });

    it('should open combat popup', () => {
        component.openCombatPopup();
        expect(mockDialog.open).toHaveBeenCalledWith(jasmine.any(Function), { width: '650px', disableClose: true });
    });

    it('should execute attack method', () => {
        component.attack();
        expect(mockGameplayService.attack).toHaveBeenCalledWith(component.gameData);
    });

    it('should execute evade method', () => {
        component.evade();
        expect(mockGameplayService.evade).toHaveBeenCalledWith(component.gameData);
    });

    it('should clean up on destroy', () => {
        spyOn(sessionStorage, 'setItem');
        component.ngOnDestroy();
        expect(mockSocketListenerService.unsubscribeSocketListeners).toHaveBeenCalled();
        expect(sessionStorage.setItem).toHaveBeenCalledWith('refreshed', 'false');
    });
});
