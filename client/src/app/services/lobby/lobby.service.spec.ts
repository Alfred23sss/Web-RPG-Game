import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { MIN_PLAYERS } from '@app/constants/global.constants';
import { ErrorMessages } from '@app/enums/global.enums';
import { Lobby } from '@app/interfaces/lobby';
import { Player } from '@app/interfaces/player';
import { AccessCodeService } from '@app/services/access-code/access-code.service';
import { SnackbarService } from '@app/services/snackbar/snackbar.service';
import { SocketClientService } from '@app/services/socket/socket-client-service';
import { of, throwError } from 'rxjs';
import { LobbyService } from './lobby.service';

describe('LobbyService', () => {
    let service: LobbyService;
    let routerSpy: jasmine.SpyObj<Router>;
    let socketSpy: jasmine.SpyObj<SocketClientService>;
    let accessCodeSpy: jasmine.SpyObj<AccessCodeService>;
    let snackbarSpy: jasmine.SpyObj<SnackbarService>;

    let mockPlayer: Player;
    let mockLobby: Lobby;

    beforeEach(() => {
        mockPlayer = { name: 'test', avatar: 'avatar1', isAdmin: false } as Player;
        mockLobby = { accessCode: '1234', players: [mockPlayer], isLocked: false } as Lobby;

        const routerMock = jasmine.createSpyObj('Router', ['navigate']);
        const socketMock = jasmine.createSpyObj('SocketClientService', [
            'getLobby',
            'getLobbyPlayers',
            'removePlayerFromLobby',
            'deleteLobby',
            'onJoinLobby',
            'onLeaveLobby',
            'onLobbyUpdate',
            'onKicked',
            'onLobbyLocked',
            'onLobbyUnlocked',
            'onLobbyDeleted',
            'onAlertGameStarted',
            'onAdminLeft',
            'socket',
        ]);
        const accessCodeMock = jasmine.createSpyObj('AccessCodeService', ['getAccessCode']);
        const snackbarMock = jasmine.createSpyObj('SnackbarService', ['showMessage']);

        TestBed.configureTestingModule({
            providers: [
                LobbyService,
                { provide: Router, useValue: routerMock },
                { provide: SocketClientService, useValue: socketMock },
                { provide: AccessCodeService, useValue: accessCodeMock },
                { provide: SnackbarService, useValue: snackbarMock },
            ],
        });

        service = TestBed.inject(LobbyService);
        routerSpy = TestBed.inject(Router) as jasmine.SpyObj<Router>;
        socketSpy = TestBed.inject(SocketClientService) as jasmine.SpyObj<SocketClientService>;
        accessCodeSpy = TestBed.inject(AccessCodeService) as jasmine.SpyObj<AccessCodeService>;
        snackbarSpy = TestBed.inject(SnackbarService) as jasmine.SpyObj<SnackbarService>;

        accessCodeSpy.getAccessCode.and.returnValue('1234');
        socketSpy.getLobby.and.returnValue(of(mockLobby));
        socketSpy.getLobbyPlayers.and.returnValue(of([mockPlayer]));
        socketSpy.socket = jasmine.createSpyObj('Socket', ['on', 'off']);
    });

    afterEach(() => {
        sessionStorage.clear();
    });

    describe('setIsGameStarting', () => {
        it('should update isGameStartingSubject with the provided value', (done) => {
            service.setIsGameStarting(true);

            service.isGameStarting$.subscribe((isStarting) => {
                expect(isStarting).toBeTrue();
                done();
            });
        });

        it('should update isGameStartingSubject with the provided value (false)', (done) => {
            service.setIsGameStarting(false);

            service.isGameStarting$.subscribe((isStarting) => {
                expect(isStarting).toBeFalse();
                done();
            });
        });
    });

    describe('initializeLobby', () => {
        it('should fetch lobby and set loading to false on success', (done) => {
            sessionStorage.setItem('player', JSON.stringify(mockPlayer));
            service.initializeLobby();

            service.player$.subscribe((player) => {
                expect(player).toEqual(mockPlayer);

                service.isLoading$.subscribe((isLoading) => {
                    expect(isLoading).toBeFalse();
                    done();
                });
            });

            expect(accessCodeSpy.getAccessCode).toHaveBeenCalled();
            expect(socketSpy.getLobby).toHaveBeenCalledWith('1234');
        });

        it('should handle errors by navigating to home', (done) => {
            socketSpy.getLobby.and.returnValue(throwError(() => new Error()));
            service.initializeLobby();

            service.isLoading$.subscribe((isLoading) => {
                expect(isLoading).toBeFalse();
                expect(routerSpy.navigate).toHaveBeenCalledWith(['/home']);
                done();
            });
        });
    });

    describe('removePlayerAndCleanup', () => {
        it('should remove player and delete lobby if admin', () => {
            mockPlayer.isAdmin = true;
            sessionStorage.setItem('player', JSON.stringify(mockPlayer));

            service.initializeLobby();

            service.removePlayerAndCleanup(mockPlayer, mockLobby);

            expect(socketSpy.removePlayerFromLobby).toHaveBeenCalledWith('1234', 'test');
            expect(socketSpy.deleteLobby).toHaveBeenCalledWith('1234');
        });

        it('should do nothing if game is starting', () => {
            sessionStorage.setItem('player', JSON.stringify(mockPlayer));

            service.initializeLobby();

            service.setIsGameStarting(true);

            service.removePlayerAndCleanup(mockPlayer, mockLobby);

            expect(socketSpy.removePlayerFromLobby).not.toHaveBeenCalled();
        });

        it('should do nothing if player is null', () => {
            service.removePlayerAndCleanup(null, mockLobby);

            expect(socketSpy.removePlayerFromLobby).not.toHaveBeenCalled();
        });
    });

    describe('navigateToGame', () => {
        it('should block navigation if lobby is not locked', () => {
            socketSpy.getLobby.and.returnValue(of(mockLobby));
            service.initializeLobby();

            service.navigateToGame();

            expect(snackbarSpy.showMessage).toHaveBeenCalledWith(ErrorMessages.LobbyNotLocked);
            expect(routerSpy.navigate).not.toHaveBeenCalled();
        });

        it('should block navigation if not enough players', () => {
            mockLobby.isLocked = true;
            socketSpy.getLobby.and.returnValue(of(mockLobby));
            service.initializeLobby();

            service.navigateToGame();

            expect(snackbarSpy.showMessage).toHaveBeenCalledWith(ErrorMessages.NotEnoughPlayers);
            expect(routerSpy.navigate).not.toHaveBeenCalled();
        });

        it('should navigate when conditions are met', () => {
            mockLobby.players = Array(MIN_PLAYERS).fill(mockPlayer);
            mockLobby.isLocked = true;
            socketSpy.getLobby.and.returnValue(of(mockLobby));
            service.initializeLobby();

            service.navigateToGame();

            expect(sessionStorage.getItem('lobby')).toBeTruthy();
            expect(routerSpy.navigate).toHaveBeenCalledWith(['/game']);

            service.isGameStarting$.subscribe((isStarting) => {
                expect(isStarting).toBeTrue();
            });
        });
    });

    describe('socket listeners', () => {
        it('should call updatePlayers on joinLobby event', () => {
            service.initializeLobby();

            const joinLobbyCallback = socketSpy.onJoinLobby as jasmine.Spy;
            const handler = joinLobbyCallback.calls.mostRecent().args[0];

            handler();

            expect(socketSpy.getLobbyPlayers).toHaveBeenCalledWith('1234');
        });

        it('should call updatePlayers on leaveLobby event', () => {
            service.initializeLobby();

            const leaveLobbyCallback = socketSpy.onLeaveLobby as jasmine.Spy;
            const handler = leaveLobbyCallback.calls.mostRecent().args[0];

            handler();

            expect(socketSpy.getLobbyPlayers).toHaveBeenCalledWith('1234');
        });

        it('should update lobby and player on lobbyUpdate event', () => {
            sessionStorage.setItem('player', JSON.stringify(mockPlayer));
            service.initializeLobby();

            const lobbyUpdateCallback = socketSpy.onLobbyUpdate as jasmine.Spy;
            const handler = lobbyUpdateCallback.calls.mostRecent().args[0];

            const updatedPlayers = [
                { ...mockPlayer, name: 'Updated Player' } as Player,
                { name: 'Player 2', avatar: 'avatar2', isAdmin: false } as Player,
            ];

            handler(updatedPlayers);

            service.lobby$.subscribe((lobby) => {
                expect(lobby?.players).toEqual(updatedPlayers);
            });

            service.player$.subscribe((player) => {
                expect(player?.name).toEqual('Updated Player');
            });

            expect(sessionStorage.getItem('player')).toEqual(JSON.stringify({ ...mockPlayer, name: 'Updated Player' }));
        });

        it('should handle kicked event', () => {
            sessionStorage.setItem('player', JSON.stringify(mockPlayer));

            service.initializeLobby();

            const kickedCallback = socketSpy.onKicked as jasmine.Spy;
            const handler = kickedCallback.calls.mostRecent().args[0];

            handler({ accessCode: '1234', playerName: 'test' });

            expect(snackbarSpy.showMessage).toHaveBeenCalledWith('Vous avez été expulsé du lobby.');
            expect(routerSpy.navigate).toHaveBeenCalledWith(['/home']);
        });

        it('should update lobby on lock event', (done) => {
            service.initializeLobby();
            const lockCallback = socketSpy.onLobbyLocked as jasmine.Spy;
            const handler = lockCallback.calls.mostRecent().args[0];

            handler({ accessCode: '1234', isLocked: true });

            service.lobby$.subscribe((lobby) => {
                expect(lobby).toEqual({ ...mockLobby, isLocked: true });
                done();
            });
        });

        it('should update lobby on Unlock event', (done) => {
            service.initializeLobby();
            const UnlockCallback = socketSpy.onLobbyUnlocked as jasmine.Spy;
            const handler = UnlockCallback.calls.mostRecent().args[0];

            handler({ accessCode: '1234', isLocked: false });

            service.lobby$.subscribe((lobby) => {
                expect(lobby).toEqual({ ...mockLobby, isLocked: false });
                done();
            });
        });

        it('should navigate to home on lobby deleted event', () => {
            service.initializeLobby();
            const deleteCallback = socketSpy.onLobbyDeleted as jasmine.Spy;
            const handler = deleteCallback.calls.mostRecent().args[0];
            handler();
            expect(routerSpy.navigate).toHaveBeenCalledWith(['/home']);
        });

        it('should navigate to game and store data on game started event', () => {
            mockLobby.isLocked = true;
            mockLobby.players = Array(MIN_PLAYERS).fill(mockPlayer);
            socketSpy.getLobby.and.returnValue(of(mockLobby));
            service.initializeLobby();

            const gameStartedCallback = socketSpy.onAlertGameStarted as jasmine.Spy;
            const handler = gameStartedCallback.calls.mostRecent().args[0];

            const gameData = {
                updatedGame: { id: 'game1', name: 'Test Game' },
                orderedPlayers: [{ name: 'Player1', avatar: 'avatar1' }],
            };

            handler(gameData);

            expect(sessionStorage.getItem('game')).toEqual(JSON.stringify(gameData.updatedGame));
            expect(sessionStorage.getItem('orderedPlayers')).toEqual(JSON.stringify(gameData.orderedPlayers));

            expect(routerSpy.navigate).toHaveBeenCalledWith(['/game']);
        });

        it('should show message when admin leaves', () => {
            service.initializeLobby();
            const adminLeftCallback = socketSpy.onAdminLeft as jasmine.Spy;
            const handler = adminLeftCallback.calls.mostRecent().args[0];
            const message = 'The admin has left the lobby.';
            handler({ message });
            expect(snackbarSpy.showMessage).toHaveBeenCalledWith(message);
        });
    });

    describe('removeSocketListeners', () => {
        it('should remove all socket listeners', () => {
            service.removeSocketListeners();

            expect(socketSpy.socket.off).toHaveBeenCalledWith('joinLobby');
            expect(socketSpy.socket.off).toHaveBeenCalledWith('lobbyUpdate');
            expect(socketSpy.socket.off).toHaveBeenCalledWith('leaveLobby');
            expect(socketSpy.socket.off).toHaveBeenCalledWith('kicked');
            expect(socketSpy.socket.off).toHaveBeenCalledWith('lobbyLocked');
            expect(socketSpy.socket.off).toHaveBeenCalledWith('lobbyUnlocked');
            expect(socketSpy.socket.off).toHaveBeenCalledWith('lobbyDeleted');
            expect(socketSpy.socket.off).toHaveBeenCalledWith('alertGameStarted');
        });
    });
});
