/* eslint-disable @typescript-eslint/no-magic-numbers */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { GameData } from '@app/classes/game-data/game-data';
import { REFRESH_STORAGE } from '@app/constants/global.constants';
import { SocketEvent } from '@app/enums/global.enums';
import { Player } from '@app/interfaces/player';
import { GameStatistics, PlayerStatistics } from '@app/interfaces/statistics';
import { CharacterService } from '@app/services/character-form/character-form.service';
import { GameStateSocketService } from '@app/services/game-state-socket/game-state-socket.service';
import { SocketClientService } from '@app/services/socket/socket-client-service';
import { Subject } from 'rxjs';
import { GameEndComponent } from './game-end.component';

describe('GameEndComponent', () => {
    let component: GameEndComponent;
    let fixture: ComponentFixture<GameEndComponent>;
    let mockRouter: jasmine.SpyObj<Router>;
    let mockSocketService: jasmine.SpyObj<SocketClientService>;
    let mockGameStateService: jasmine.SpyObj<GameStateSocketService>;
    let mockCharacterService: { unavailableAvatarsSubject: Subject<string[]> };

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
        mockCharacterService = {
            unavailableAvatarsSubject: new Subject<string[]>(),
        };

        await TestBed.configureTestingModule({
            imports: [GameEndComponent],
            providers: [
                { provide: Router, useValue: mockRouter },
                { provide: SocketClientService, useValue: mockSocketService },
                { provide: GameStateSocketService, useValue: mockGameStateService },
                { provide: CharacterService, useValue: mockCharacterService },
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

    describe('ngOnInit', () => {
        beforeEach(() => {
            spyOn(sessionStorage, 'getItem').and.callThrough();
            spyOn(sessionStorage, 'setItem').and.callThrough();

            Object.defineProperty(mockGameStateService, 'gameDataSubjectValue', {
                get: () => mockGameData,
            });

            fixture = TestBed.createComponent(GameEndComponent);
            component = fixture.componentInstance;
        });

        it('should navigate to homepage if page is refreshed', () => {
            sessionStorage.setItem(REFRESH_STORAGE, 'true');
            component.ngOnInit();

            expect(mockRouter.navigate).toHaveBeenCalledWith(['/home']);
        });

        it('should navigate to homepage if gameStats is missing', () => {
            mockGameData.gameStats = undefined as unknown as GameStatistics;
            sessionStorage.setItem(REFRESH_STORAGE, 'false');
            component.ngOnInit();

            expect(mockRouter.navigate).toHaveBeenCalledWith(['/home']);
        });

        it('should initialize game data and sort player stats by name', () => {
            mockGameData.gameStats = {
                playerStats: {
                    zed: { playerName: 'Zed' } as PlayerStatistics,
                    alice: { playerName: 'Alice' } as PlayerStatistics,
                    bob: { playerName: 'Bob' } as PlayerStatistics,
                },
            } as unknown as GameStatistics;

            sessionStorage.setItem(REFRESH_STORAGE, 'false');
            component.ngOnInit();

            expect(component.gameData).toBe(mockGameData);
            expect(component.gameStats).toEqual(mockGameData.gameStats);
            expect(component.sortedStats.map((s) => s.playerName)).toEqual(['Alice', 'Bob', 'Zed']);
            expect(sessionStorage.setItem).toHaveBeenCalledWith(REFRESH_STORAGE, 'true');
        });

        it('should initialize sortedStats as empty if playerStats is empty', () => {
            mockGameData.gameStats = {
                playerStats: {},
            } as GameStatistics;

            component.ngOnInit();

            expect(component.sortedStats).toEqual([]);
        });
    });
});
