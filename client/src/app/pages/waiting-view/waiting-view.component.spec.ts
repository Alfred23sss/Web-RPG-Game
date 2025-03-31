/* eslint-disable @typescript-eslint/no-explicit-any */
import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { Router } from '@angular/router';
import { DiceType, ErrorMessages, Routes } from '@app/enums/global.enums';
import { Lobby } from '@app/interfaces/lobby';
import { Player } from '@app/interfaces/player';
import { LobbyService } from '@app/services/lobby/lobby.service';
import { SnackbarService } from '@app/services/snackbar/snackbar.service';
import { SocketClientService } from '@app/services/socket/socket-client-service';
import { BehaviorSubject } from 'rxjs';
import { WaitingViewComponent } from './waiting-view.component';

const MIN_PLAYERS = 2;

describe('WaitingViewComponent', () => {
    let component: WaitingViewComponent;
    let fixture: ComponentFixture<WaitingViewComponent>;
    let mockRouter: jasmine.SpyObj<Router>;
    let mockLobbyService: jasmine.SpyObj<LobbyService>;
    let mockSnackbarService: jasmine.SpyObj<SnackbarService>;
    let mockSocketClientService: jasmine.SpyObj<SocketClientService>;

    const MOCK_PLAYER: Player = {
        name: 'Test Player',
        isAdmin: true,
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
        hasAbandoned: false,
        isActive: false,
        combatWon: 0,
    };

    const mockLobby: Lobby = {
        accessCode: '1234',
        players: [MOCK_PLAYER],
        maxPlayers: 4,
        isLocked: false,
        game: null,
    };

    beforeEach(async () => {
        // Create more comprehensive mock services
        mockRouter = jasmine.createSpyObj('Router', ['navigate']);

        mockLobbyService = jasmine.createSpyObj(
            'LobbyService',
            ['initializeLobby', 'removePlayerAndCleanup', 'removeSocketListeners', 'setIsGameStarting'],
            {
                player$: new BehaviorSubject(MOCK_PLAYER),
                lobby$: new BehaviorSubject(mockLobby),
                isLoading$: new BehaviorSubject(false),
                isGameStarting$: new BehaviorSubject(false),
                accessCode: '1234',
            },
        );

        mockSnackbarService = jasmine.createSpyObj('SnackbarService', ['showMessage']);

        mockSocketClientService = jasmine.createSpyObj('SocketClientService', [
            'emit',
            'on', // Add this to address potential 'on' method error
            'unlockLobby',
            'lockLobby',
            'kickPlayer',
            'alertGameStarted',
        ]);

        // Configure the testing module with all necessary providers
        await TestBed.configureTestingModule({
            imports: [WaitingViewComponent],
            providers: [
                { provide: Router, useValue: mockRouter },
                { provide: LobbyService, useValue: mockLobbyService },
                { provide: SnackbarService, useValue: mockSnackbarService },
                { provide: SocketClientService, useValue: mockSocketClientService },
            ],
        }).compileComponents();

        // Create the component
        fixture = TestBed.createComponent(WaitingViewComponent);
        component = fixture.componentInstance;

        // Detect changes to resolve any initial bindings
        fixture.detectChanges();
    });

    it('should create the component', () => {
        expect(component).toBeTruthy();
    });

    it('should initialize with correct default values', () => {
        expect(component.accessCode).toBe('1234');
        expect(component.player).toEqual(MOCK_PLAYER);
        expect(component.lobby).toEqual(mockLobby);
        expect(component.isLoading).toBeFalse();
        expect(component.isGameStarting).toBeFalse();
    });

    describe('ngOnDestroy', () => {
        it('should clean up resources', () => {
            spyOn((component as any).subscriptions, 'unsubscribe');

            component.ngOnDestroy();

            expect((component as any).subscriptions.unsubscribe).toHaveBeenCalled();
            expect(mockLobbyService.removePlayerAndCleanup).toHaveBeenCalledWith(MOCK_PLAYER, mockLobby);
            expect(mockLobbyService.removeSocketListeners).toHaveBeenCalled();
            expect(mockLobbyService.setIsGameStarting).toHaveBeenCalledWith(false);
        });
    });

    describe('changeLobbyLockStatus', () => {
        it('should emit unlockLobby event when unlocking lobby', () => {
            mockLobby.isLocked = true;
            mockLobby.players = [MOCK_PLAYER];

            component.changeLobbyLockStatus();

            expect(mockSocketClientService.emit).toHaveBeenCalledWith('unlockLobby', '1234');
        });

        it('should show message when trying to unlock full lobby', () => {
            mockLobby.isLocked = true;
            mockLobby.players = new Array(mockLobby.maxPlayers).fill(MOCK_PLAYER);

            component.changeLobbyLockStatus();

            expect(mockSnackbarService.showMessage).toHaveBeenCalledWith('Le lobby est plein, impossible de le déverrouiller.');
        });

        it('should emit lockLobby event when locking lobby', () => {
            mockLobby.isLocked = false;

            component.changeLobbyLockStatus();

            expect(mockSocketClientService.emit).toHaveBeenCalledWith('lockLobby', '1234');
        });

        it('should do nothing if lobby is null', () => {
            component.lobby = null;
            component.changeLobbyLockStatus();
            expect(mockSocketClientService.emit).not.toHaveBeenCalled();
        });
    });

    describe('kickPlayer', () => {
        it('should emit kickPlayer event with correct parameters', () => {
            const testPlayer = { name: 'Test' } as Player;
            component.kickPlayer(testPlayer);
            expect(mockSocketClientService.emit).toHaveBeenCalledWith('kickPlayer', {
                accessCode: '1234',
                playerName: 'Test',
            });
        });
    });

    describe('navigateToGame', () => {
        it('should do nothing if lobby is null', () => {
            component.lobby = null;
            component.navigateToGame();

            expect(mockSnackbarService.showMessage).not.toHaveBeenCalled();
            expect(mockSocketClientService.emit).not.toHaveBeenCalled();
            expect(mockRouter.navigate).not.toHaveBeenCalled();
        });

        it('should show error if lobby not locked', () => {
            component.lobby = { ...mockLobby, isLocked: false };
            component.navigateToGame();
            expect(mockSnackbarService.showMessage).toHaveBeenCalledWith(ErrorMessages.LobbyNotLocked);
        });

        it('should show error if not enough players', () => {
            component.lobby = {
                ...mockLobby,
                isLocked: true,
                players: new Array(MIN_PLAYERS - 1).fill(MOCK_PLAYER),
            };
            component.navigateToGame();
            expect(mockSnackbarService.showMessage).toHaveBeenCalledWith(ErrorMessages.NotEnoughPlayers);
        });

        it('should emit createGame event and navigate if conditions met', fakeAsync(() => {
            component.lobby = {
                ...mockLobby,
                isLocked: true,
                players: new Array(MIN_PLAYERS).fill(MOCK_PLAYER),
            };
            component.player = { ...MOCK_PLAYER, isAdmin: true };

            component.navigateToGame();
            tick();

            expect(mockSocketClientService.emit).toHaveBeenCalledWith('createGame', { accessCode: '1234' });
            expect(mockLobbyService.setIsGameStarting).toHaveBeenCalledWith(true);
            expect(sessionStorage.getItem('lobby')).toBe(JSON.stringify(component.lobby));
            expect(mockRouter.navigate).toHaveBeenCalledWith([Routes.Game]);
            expect(component.isGameStartedEmitted).toBeTrue();
        }));

        it('should not emit createGame event multiple times', () => {
            component.isGameStartedEmitted = true;
            component.navigateToGame();
            expect(mockSocketClientService.emit).not.toHaveBeenCalled();
        });

        it('should do nothing if no player', () => {
            component.player = null;
            component.navigateToGame();
            expect(mockSocketClientService.emit).not.toHaveBeenCalled();
        });
    });

    describe('Observable subscriptions', () => {
        it('should update isLoading when service emits', () => {
            (mockLobbyService.isLoading$ as BehaviorSubject<boolean>).next(true);
            expect(component.isLoading).toBeTrue();
        });

        it('should update isGameStarting when service emits', () => {
            (mockLobbyService.isGameStarting$ as BehaviorSubject<boolean>).next(true);
            expect(component.isGameStarting).toBeTrue();
        });
    });

    it('navigateToHome should navigate to home page', () => {
        component.navigateToHome();

        expect(mockRouter.navigate).toHaveBeenCalledWith([Routes.HomePage]);
    });
});
