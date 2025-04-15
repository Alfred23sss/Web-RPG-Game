import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { GameData } from '@app/classes/game-data/game-data';
import { REFRESH_STORAGE } from '@app/constants/global.constants';
import { SocketEvent } from '@app/enums/global.enums';
import { Player } from '@app/interfaces/player';
import { GameStatistics, PlayerStatistics } from '@app/interfaces/statistics';
import { GameStateSocketService } from '@app/services/game-state-socket/game-state-socket.service';
import { SocketClientService } from '@app/services/socket/socket-client-service';
import { GameEndComponent } from './game-end.component';

describe('GameEndComponent', () => {
    let component: GameEndComponent;
    let fixture: ComponentFixture<GameEndComponent>;
    let mockRouter: jasmine.SpyObj<Router>;
    let mockSocketService: jasmine.SpyObj<SocketClientService>;
    let mockGameStateService: jasmine.SpyObj<GameStateSocketService>;

    const mockGameData: GameData = new GameData();
    mockGameData.clientPlayer = { hasAbandoned: false } as Player;
    mockGameData.turnTimer = 60;
    mockGameData.gameStats = {
        playerStats: new Map<string, PlayerStatistics>([
            ['Alice', { playerName: 'Alice', combats: 100 } as PlayerStatistics],
            ['Bob', { playerName: 'Bob', combats: 80 } as PlayerStatistics],
        ]),
    } as GameStatistics;

    beforeEach(async () => {
        mockRouter = jasmine.createSpyObj('Router', ['navigate']);
        mockSocketService = jasmine.createSpyObj('SocketClientService', ['emit', 'on']);
        mockGameStateService = jasmine.createSpyObj('GameStateSocketService', [], {
            gameDataSubjectValue: mockGameData,
        });

        await TestBed.configureTestingModule({
            imports: [GameEndComponent],
            providers: [
                { provide: Router, useValue: mockRouter },
                { provide: SocketClientService, useValue: mockSocketService },
                { provide: GameStateSocketService, useValue: mockGameStateService },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(GameEndComponent);
        component = fixture.componentInstance;
        sessionStorage.clear();

        component.sortedStats = [
            { playerName: 'Charlie', combats: 50 },
            { playerName: 'Alice', combats: 100 },
            { playerName: 'Bob', combats: 75 },
        ] as PlayerStatistics[];
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    describe('ngOnDestroy', () => {
        it('should reset refresh session storage', () => {
            component.ngOnDestroy();
            expect(sessionStorage.getItem(REFRESH_STORAGE)).toBe('false');
        });
    });

    describe('sortBy', () => {
        it('should sort by combats ascending on first call', () => {
            component.sortBy('combats');
            expect(component.sortedStats.map((s) => s.playerName)).toEqual(['Charlie', 'Bob', 'Alice']);
        });

        it('should sort by combats descending on second call', () => {
            component.sortBy('combats');
            component.sortBy('combats');
            expect(component.sortedStats.map((s) => s.playerName)).toEqual(['Alice', 'Bob', 'Charlie']);
        });

        it('should switch sort column and reset to ascending', () => {
            component.sortBy('combats');
            component.sortBy('playerName');
            expect(component.sortKey).toBe('playerName');
            expect(component.sortAsc).toBeTrue();
            expect(component.sortedStats.map((s) => s.playerName)).toEqual(['Alice', 'Bob', 'Charlie']);
        });
    });

    describe('goHome', () => {
        it('should set abandon flag and navigate to home', () => {
            component.gameData = mockGameData;
            component.goHome();

            expect(mockGameData.clientPlayer.hasAbandoned).toBeTrue();
            expect(mockSocketService.emit).toHaveBeenCalledWith(SocketEvent.ManualDisconnect, { isInGame: false });
            expect(mockRouter.navigate).toHaveBeenCalledWith(['/home']);
        });
    });
});
