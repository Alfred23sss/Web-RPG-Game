/* eslint-disable max-lines */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-empty-function */
import { TestBed } from '@angular/core/testing';
import { Game } from '@app/interfaces/game';
import { Lobby } from '@app/interfaces/lobby';
import { Player } from '@app/interfaces/player';
import { Tile } from '@app/interfaces/tile';
import { AccessCodesCommunicationService } from '@app/services/access-codes-communication/access-codes-communication.service';
import { PlayerMovementService } from '@app/services/player-movement/player-movement.service';
import { of, throwError } from 'rxjs';
import { Socket } from 'socket.io-client';
import { SocketClientService } from './socket-client-service';

const accessCode = 'TEST123';
const game = {} as Game;
const player = {} as Player;
const lobby = {} as Lobby;

class MockSocket {
    id = 'fake-socket-id';
    events: { [event: string]: ((data?: any) => void)[] } = {};

    emit(event: string, data?: any) {
        if (this.onEmit) {
            this.onEmit(event, data);
        }
    }
    on(event: string, callback: (data?: any) => void) {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(callback);
    }

    off(event: string) {
        delete this.events[event];
    }
    once(event: string, callback: (data?: any) => void) {
        this.on(event, callback);
    }
    trigger(event: string, data?: any) {
        if (this.events[event]) {
            const callbacks = [...this.events[event]];
            delete this.events[event];
            callbacks.forEach((cb) => cb(data));
        }
    }
    onEmit?(event: string, data?: any): void;
}

describe('SocketClientService', () => {
    let service: SocketClientService;
    let mockSocket: MockSocket;
    let fakeAccessCodesService: Partial<AccessCodesCommunicationService>;
    let mockPlayerMovementService: jasmine.SpyObj<PlayerMovementService>;

    beforeEach(() => {
        mockSocket = new MockSocket();
        fakeAccessCodesService = {
            validateAccessCode: jasmine.createSpy('validateAccessCode'),
            removeAccessCode: jasmine.createSpy('removeAccessCode').and.returnValue(of(null)),
        };
        mockPlayerMovementService = jasmine.createSpyObj<PlayerMovementService>('PlayerMovementService', ['quickestPath']);

        TestBed.configureTestingModule({
            providers: [
                SocketClientService,
                { provide: AccessCodesCommunicationService, useValue: fakeAccessCodesService },
                { provide: PlayerMovementService, useValue: mockPlayerMovementService },
            ],
        });
        service = TestBed.inject(SocketClientService);
        service.socket = mockSocket as unknown as Socket;
    });

    describe('createLobby', () => {
        it('should create lobby and join', async () => {
            (fakeAccessCodesService.validateAccessCode as jasmine.Spy).and.returnValue(of(true));

            spyOn(mockSocket, 'emit').and.callThrough();

            const createLobbyPromise = service.createLobby(game, player);

            expect(mockSocket.events['lobbyCreated']).toBeDefined();

            mockSocket.trigger('lobbyCreated', { accessCode });
            expect(mockSocket.events['joinedLobby']).toBeDefined();
            mockSocket.trigger('joinedLobby');

            const result = await createLobbyPromise;
            expect(result).toEqual(accessCode);
            expect(mockSocket.emit).toHaveBeenCalledWith('createLobby', { game });
            expect(mockSocket.emit).toHaveBeenCalledWith('joinLobby', { accessCode, player });
        });

        it('should reject if no accessCode', async () => {
            const createLobbyPromise = service.createLobby(game, player);

            mockSocket.trigger('lobbyCreated', {});
            await expectAsync(createLobbyPromise).toBeRejectedWithError('Failed to create lobby: No access code received');
        });

        it('should reject if error is sent from socket', async () => {
            const createLobbyPromise = service.createLobby(game, player);
            mockSocket.trigger('error', 'Some error');
            await expectAsync(createLobbyPromise).toBeRejectedWithError('Lobby creation failed: Some error');
        });
    });
    describe('joinLobby', () => {
        it('should join lobby if accessCode is valid', async () => {
            (fakeAccessCodesService.validateAccessCode as jasmine.Spy).and.returnValue(of(true));
            spyOn(mockSocket, 'emit').and.callThrough();

            const joinPromise = service.joinLobby(accessCode, player);
            expect(mockSocket.events['joinedLobby']).toBeDefined();
            mockSocket.trigger('joinedLobby');
            await expectAsync(joinPromise).toBeResolved();
            expect(mockSocket.emit).toHaveBeenCalledWith('joinLobby', { accessCode, player });
        });

        it('should reject if accessCode is invalid', async () => {
            (fakeAccessCodesService.validateAccessCode as jasmine.Spy).and.returnValue(of(false));

            await expectAsync(service.joinLobby(accessCode, player)).toBeRejectedWithError('Invalid access code');
        });

        it('should reject if an error happens in validation', async () => {
            (fakeAccessCodesService.validateAccessCode as jasmine.Spy).and.returnValue(throwError(() => new Error('Validation failed')));

            await expectAsync(service.joinLobby(accessCode, player)).toBeRejectedWithError('Access code validation failed');
        });

        it('should reject if there is an error in joinError', async () => {
            (fakeAccessCodesService.validateAccessCode as jasmine.Spy).and.returnValue(of(true));

            const joinPromise = service.joinLobby(accessCode, player);
            mockSocket.trigger('joinError', 'Join error occurred');
            await expectAsync(joinPromise).toBeRejectedWithError('Join failed: Join error occurred');
        });
    });

    it('removeAccessCode should call removeAccessCode in service access', () => {
        service.removeAccessCode('XYZ');
        expect(fakeAccessCodesService.removeAccessCode).toHaveBeenCalledWith('XYZ');
    });

    it('kickPlayer should emit kickPlayer event with correct parameters', () => {
        spyOn(mockSocket, 'emit');
        const playerName = 'player1';

        service.kickPlayer(accessCode, playerName);

        expect(mockSocket.emit).toHaveBeenCalledWith('kickPlayer', { accessCode, playerName });
    });

    it('getLobbyPlayers return Observable that emits players and errors', () => {
        const players: Player[] = [{}, {}] as Player[];
        let emittedPlayers: Player[] | undefined;
        let error: any;
        spyOn(mockSocket, 'emit').and.callThrough();

        service.getLobbyPlayers('CODE123').subscribe({
            next: (data) => (emittedPlayers = data),
            error: (err) => (error = err),
        });

        expect(mockSocket.emit).toHaveBeenCalledWith('getLobbyPlayers', 'CODE123');
        mockSocket.trigger('updatePlayers', players);
        expect(emittedPlayers).toEqual(players);

        service.getLobbyPlayers('CODE123').subscribe({
            next: () => {},
            error: (err) => (error = err),
        });
        mockSocket.trigger('error', 'Players error');
        expect(error).toEqual('Players error');
    });

    describe('getLobby', () => {
        it('should return an Observable that emits the lobby and completes', (done) => {
            service.getLobby('CODE123').subscribe({
                next: (l) => {
                    expect(l).toEqual(lobby);
                },
                complete: () => done(),
            });
            mockSocket.trigger('updateLobby', lobby);
        });

        it('should return an error if the socket emits an error', (done) => {
            service.getLobby('CODE123').subscribe({
                next: () => {},
                error: (err) => {
                    expect(err).toEqual('Lobby error');
                    done();
                },
            });
            mockSocket.trigger('error', 'Lobby error');
        });
    });

    it('getSocketId should return the socket ID', () => {
        expect(service.getSocketId()).toEqual('fake-socket-id');
    });

    it('emit should emit the given event with the provided data', () => {
        spyOn(mockSocket, 'emit');
        service.emit('customEvent', { data: 456 });
        expect(mockSocket.emit).toHaveBeenCalledWith('customEvent', { data: 456 });
    });

    it('on should register a callback for the given event', () => {
        const callback = jasmine.createSpy('callback');
        service.on('customEvent', callback);
        mockSocket.trigger('customEvent', { data: 123 });
        expect(callback).toHaveBeenCalledWith({ data: 123 });
    });

    describe('sendPlayerMovementUpdate', () => {
        const currentTile: Tile = { id: 'tile-1-1' } as Tile;
        const targetTile: Tile = { id: 'tile-1-2' } as Tile;
        const grid: Tile[][] = [[currentTile], [targetTile]];

        it('should emit playerMovementUpdate with valid path', () => {
            const mockPath = [currentTile, targetTile];
            mockPlayerMovementService.quickestPath.and.returnValue(mockPath);
            spyOn(mockSocket, 'emit');

            service.sendPlayerMovementUpdate(currentTile, targetTile, accessCode, grid);

            expect(mockPlayerMovementService.quickestPath).toHaveBeenCalledWith(currentTile, targetTile, grid);
            expect(mockSocket.emit).toHaveBeenCalledWith('playerMovementUpdate', {
                previousTile: currentTile,
                newTile: targetTile,
                movement: mockPath,
                accessCode,
            });
        });

        it('should not emit when no path is available', () => {
            mockPlayerMovementService.quickestPath.and.returnValue(undefined);
            spyOn(mockSocket, 'emit');

            service.sendPlayerMovementUpdate(currentTile, targetTile, accessCode, grid);

            expect(mockPlayerMovementService.quickestPath).toHaveBeenCalledWith(currentTile, targetTile, grid);
            expect(mockSocket.emit).not.toHaveBeenCalled();
        });
    });

    describe('off', () => {
        it('should remove all listeners for a specific event', () => {
            const callback1 = jasmine.createSpy('callback1');
            const callback2 = jasmine.createSpy('callback2');

            service.on('testEvent', callback1);
            service.on('testEvent', callback2);

            mockSocket.trigger('testEvent', { data: 'initial' });
            expect(callback1).toHaveBeenCalledWith({ data: 'initial' });
            expect(callback2).toHaveBeenCalledWith({ data: 'initial' });

            service.off('testEvent');

            mockSocket.trigger('testEvent', { data: 'after off' });
            expect(callback1).toHaveBeenCalledTimes(1);
            expect(callback2).toHaveBeenCalledTimes(1);
        });

        it('should not throw an error when removing a listener for an event that does not exist', () => {
            expect(() => service.off('nonExistentEvent')).not.toThrow();
        });

        it('should only remove listeners for the specified event and keep others intact', () => {
            const callback1 = jasmine.createSpy('callback1');
            const callback2 = jasmine.createSpy('callback2');

            service.on('event1', callback1);
            service.on('event2', callback2);

            service.off('event1');

            mockSocket.trigger('event1', {});
            mockSocket.trigger('event2', {});

            expect(callback1).not.toHaveBeenCalled();
            expect(callback2).toHaveBeenCalledTimes(1);
        });
    });
});
