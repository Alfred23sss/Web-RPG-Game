import { TestBed } from '@angular/core/testing';
import { Game } from '@app/interfaces/game';
import { Lobby } from '@app/interfaces/lobby';
import { Player } from '@app/interfaces/player';
import { AccessCodesCommunicationService } from '@app/services/access-codes-communication/access-codes-communication.service';
import { of, throwError } from 'rxjs';
import { Socket } from 'socket.io-client';
import { SocketClientService } from './socket-client-service';

// Fake implémentation de Socket pour simuler les méthodes on, once, emit et déclencher les callbacks
class FakeSocket {
    id = 'fake-socket-id';
    events: { [event: string]: ((data?: any) => void)[] } = {};

    emit(event: string, data?: any) {
        // pour vérifier l’appel dans les tests, nous laisserons la possibilité de spyOn
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
    once(event: string, callback: (data?: any) => void) {
        this.on(event, callback);
    }
    // Méthode utilitaire pour déclencher un event
    trigger(event: string, data?: any) {
        if (this.events[event]) {
            // Pour simuler une fois, on vide la liste après déclenchement
            const callbacks = [...this.events[event]];
            delete this.events[event];
            callbacks.forEach((cb) => cb(data));
        }
    }
    // Permettre de brancher un spy sur emit
    onEmit?(event: string, data?: any): void;
}

describe('SocketClientService', () => {
    let service: SocketClientService;
    let fakeSocket: FakeSocket;
    let fakeAccessCodesService: Partial<AccessCodesCommunicationService>;

    beforeEach(() => {
        fakeSocket = new FakeSocket();
        fakeAccessCodesService = {
            validateAccessCode: jasmine.createSpy('validateAccessCode'),
            removeAccessCode: jasmine.createSpy('removeAccessCode').and.returnValue(of(null)),
        };

        TestBed.configureTestingModule({
            providers: [SocketClientService, { provide: AccessCodesCommunicationService, useValue: fakeAccessCodesService }],
        });
        service = TestBed.inject(SocketClientService);
        // On remplace le socket créé par le service par notre fakeSocket
        service.socket = fakeSocket as unknown as Socket;
    });

    // ---------------------------
    // Tests pour createLobby()
    // ---------------------------
    it('createLobby: devrait créer un lobby avec succès et rejoindre le lobby', async () => {
        const game = {} as Game;
        const player = {} as Player;
        const accessCode = 'ABC123';
        // simulate validation réussie
        (fakeAccessCodesService.validateAccessCode as jasmine.Spy).and.returnValue(of(true));

        // Espionner les émissions pour joinLobby
        spyOn(fakeSocket, 'emit').and.callThrough();

        const createLobbyPromise = service.createLobby(game, player);

        // Vérifier que createLobby émet bien l’événement
        expect(fakeSocket.events['lobbyCreated']).toBeDefined();

        // Simuler la réponse du serveur pour la création du lobby
        fakeSocket.trigger('lobbyCreated', { accessCode });
        // Le joinLobby interne va émettre 'joinLobby' et attendre 'joinedLobby'
        // Simuler l’événement "joinedLobby"
        expect(fakeSocket.events['joinedLobby']).toBeDefined();
        fakeSocket.trigger('joinedLobby');

        const result = await createLobbyPromise;
        expect(result).toEqual(accessCode);
        // Vérifier que createLobby et joinLobby ont bien émis les événements
        expect(fakeSocket.emit).toHaveBeenCalledWith('createLobby', { game });
        expect(fakeSocket.emit).toHaveBeenCalledWith('joinLobby', { accessCode, player });
    });

    it('createLobby: devrait rejeter si aucun accessCode n’est reçu', async () => {
        const game = {} as Game;
        const player = {} as Player;
        const createLobbyPromise = service.createLobby(game, player);

        // Simuler une réponse sans accessCode
        fakeSocket.trigger('lobbyCreated', {});
        await expectAsync(createLobbyPromise).toBeRejectedWithError('Failed to create lobby: No access code received');
    });

    it('createLobby: devrait rejeter sur une erreur émise par le socket', async () => {
        const game = {} as Game;
        const player = {} as Player;
        const createLobbyPromise = service.createLobby(game, player);
        fakeSocket.trigger('error', 'Some error');
        await expectAsync(createLobbyPromise).toBeRejectedWithError('Lobby creation failed: Some error');
    });

    // ---------------------------
    // Tests pour joinLobby()
    // ---------------------------
    it('joinLobby: devrait rejoindre le lobby quand le code d’accès est valide', async () => {
        const accessCode = 'ABC123';
        const player = {} as Player;
        // validation réussie
        (fakeAccessCodesService.validateAccessCode as jasmine.Spy).and.returnValue(of(true));
        spyOn(fakeSocket, 'emit').and.callThrough();

        const joinPromise = service.joinLobby(accessCode, player);
        // joinLobby émet "joinLobby" et attend "joinedLobby"
        expect(fakeSocket.events['joinedLobby']).toBeDefined();
        fakeSocket.trigger('joinedLobby');
        await expectAsync(joinPromise).toBeResolved();
        expect(fakeSocket.emit).toHaveBeenCalledWith('joinLobby', { accessCode, player });
    });

    it('joinLobby: devrait rejeter si le code d’accès est invalide', async () => {
        const accessCode = 'INVALID';
        const player = {} as Player;
        (fakeAccessCodesService.validateAccessCode as jasmine.Spy).and.returnValue(of(false));

        await expectAsync(service.joinLobby(accessCode, player)).toBeRejectedWithError('Invalid access code');
    });

    it('joinLobby: devrait rejeter si une erreur survient pendant la validation', async () => {
        const accessCode = 'ABC123';
        const player = {} as Player;
        (fakeAccessCodesService.validateAccessCode as jasmine.Spy).and.returnValue(throwError(() => new Error('Validation failed')));

        await expectAsync(service.joinLobby(accessCode, player)).toBeRejectedWithError('Access code validation failed');
    });

    it('joinLobby: devrait rejeter en cas d’erreur lors du join (joinError)', async () => {
        const accessCode = 'ABC123';
        const player = {} as Player;
        (fakeAccessCodesService.validateAccessCode as jasmine.Spy).and.returnValue(of(true));

        const joinPromise = service.joinLobby(accessCode, player);
        // Simuler l’erreur joinError
        fakeSocket.trigger('joinError', 'Join error occurred');
        await expectAsync(joinPromise).toBeRejectedWithError('Join failed: Join error occurred');
    });

    // ---------------------------
    // Test pour removeAccessCode()
    // ---------------------------
    it('removeAccessCode: devrait appeler removeAccessCode du service access', () => {
        service.removeAccessCode('XYZ');
        expect(fakeAccessCodesService.removeAccessCode).toHaveBeenCalledWith('XYZ');
    });

    // ---------------------------
    // Test pour getLobbyPlayers()
    // ---------------------------
    it('getLobbyPlayers: devrait renvoyer une Observable qui émet les joueurs et gérer les erreurs', () => {
        const players: Player[] = [{}, {}] as Player[];
        let emittedPlayers: Player[] | undefined;
        let error: any;
        // On espionne l’émission pour vérifier le paramètre
        spyOn(fakeSocket, 'emit').and.callThrough();

        service.getLobbyPlayers('CODE123').subscribe({
            next: (data) => (emittedPlayers = data),
            error: (err) => (error = err),
        });

        expect(fakeSocket.emit).toHaveBeenCalledWith('getLobbyPlayers', 'CODE123');
        // Simuler l’événement updatePlayers
        fakeSocket.trigger('updatePlayers', players);
        expect(emittedPlayers).toEqual(players);

        // Simuler une erreur
        service.getLobbyPlayers('CODE123').subscribe({
            next: () => {},
            error: (err) => (error = err),
        });
        fakeSocket.trigger('error', 'Players error');
        expect(error).toEqual('Players error');
    });

    // ---------------------------
    // Test pour getLobby()
    // ---------------------------
    it('getLobby: devrait renvoyer une Observable qui renvoie le lobby et se complète', (done) => {
        const lobby = {} as Lobby;
        service.getLobby('CODE123').subscribe({
            next: (l) => {
                expect(l).toEqual(lobby);
            },
            complete: () => done(),
        });
        // Simuler l’événement updateLobby
        fakeSocket.trigger('updateLobby', lobby);
    });

    it('getLobby: devrait renvoyer une erreur si le socket émet une erreur', (done) => {
        service.getLobby('CODE123').subscribe({
            next: () => {},
            error: (err) => {
                expect(err).toEqual('Lobby error');
                done();
            },
        });
        fakeSocket.trigger('error', 'Lobby error');
    });

    // ---------------------------
    // Test pour alertGameStarted()
    // ---------------------------
    it('alertGameStarted: devrait émettre "createGame" avec le bon accessCode', () => {
        spyOn(fakeSocket, 'emit');
        service.alertGameStarted('CODE123');
        expect(fakeSocket.emit).toHaveBeenCalledWith('createGame', { accessCode: 'CODE123' });
    });

    // ---------------------------
    // Test pour onAlertGameStarted()
    // ---------------------------
    it('onAlertGameStarted: devrait enregistrer un callback sur "gameStarted"', () => {
        const callback = jasmine.createSpy('callback');
        service.onAlertGameStarted(callback);
        // Simuler l’événement gameStarted
        fakeSocket.trigger('gameStarted', { orderedPlayers: [{}], updatedGame: {} });
        expect(callback).toHaveBeenCalledWith({ orderedPlayers: [{}], updatedGame: {} });
    });

    // ---------------------------
    // Test pour addPlayerToLobby()
    // ---------------------------
    it('addPlayerToLobby: devrait émettre "joinLobby" avec le bon accessCode et player', () => {
        spyOn(fakeSocket, 'emit');
        const player = { name: 'John' };
        service.addPlayerToLobby('CODE123', player);
        expect(fakeSocket.emit).toHaveBeenCalledWith('joinLobby', { accessCode: 'CODE123', player });
    });

    // ---------------------------
    // Test pour removePlayerFromLobby()
    // ---------------------------
    it('removePlayerFromLobby: devrait émettre "leaveLobby" avec le bon accessCode et playerName', () => {
        spyOn(fakeSocket, 'emit');
        service.removePlayerFromLobby('CODE123', 'John');
        expect(fakeSocket.emit).toHaveBeenCalledWith('leaveLobby', { accessCode: 'CODE123', playerName: 'John' });
    });

    // ---------------------------
    // Test pour deleteLobby()
    // ---------------------------
    it('deleteLobby: devrait émettre "deleteLobby" avec le bon accessCode', () => {
        spyOn(fakeSocket, 'emit');
        service.deleteLobby('CODE123');
        expect(fakeSocket.emit).toHaveBeenCalledWith('deleteLobby', 'CODE123');
    });

    // ---------------------------
    // Test pour les méthodes d’écoute sur les events du socket
    // ---------------------------
    it('onLobbyUpdate: devrait enregistrer un callback sur "updatePlayers"', () => {
        const callback = jasmine.createSpy('callback');
        service.onLobbyUpdate(callback);
        fakeSocket.trigger('updatePlayers', [{}]);
        expect(callback).toHaveBeenCalledWith([{}]);
    });

    it('onLobbyError: devrait enregistrer un callback sur "error"', () => {
        const callback = jasmine.createSpy('callback');
        service.onLobbyError(callback);
        fakeSocket.trigger('error', 'Some error');
        expect(callback).toHaveBeenCalledWith('Some error');
    });

    it('onLobbyCreated: devrait enregistrer un callback sur "lobbyCreated"', () => {
        const callback = jasmine.createSpy('callback');
        service.onLobbyCreated(callback);
        fakeSocket.trigger('lobbyCreated', [{}]);
        expect(callback).toHaveBeenCalledWith([{}]);
    });

    it('onLobbyDeleted: devrait enregistrer un callback sur "lobbyDeleted"', () => {
        const callback = jasmine.createSpy('callback');
        service.onLobbyDeleted(callback);
        fakeSocket.trigger('lobbyDeleted');
        expect(callback).toHaveBeenCalled();
    });

    it('onLeaveLobby: devrait enregistrer un callback sur "leftLobby"', () => {
        const callback = jasmine.createSpy('callback');
        service.onLeaveLobby(callback);
        fakeSocket.trigger('leftLobby');
        expect(callback).toHaveBeenCalled();
    });

    it('onJoinLobby: devrait enregistrer un callback sur "joinedLobby"', () => {
        const callback = jasmine.createSpy('callback');
        service.onJoinLobby(callback);
        fakeSocket.trigger('joinedLobby');
        expect(callback).toHaveBeenCalled();
    });

    it('lockLobby: devrait émettre "lockLobby" avec le bon accessCode', () => {
        spyOn(fakeSocket, 'emit');
        service.lockLobby('CODE123');
        expect(fakeSocket.emit).toHaveBeenCalledWith('lockLobby', 'CODE123');
    });

    it('unlockLobby: devrait émettre "unlockLobby" avec le bon accessCode', () => {
        spyOn(fakeSocket, 'emit');
        service.unlockLobby('CODE123');
        expect(fakeSocket.emit).toHaveBeenCalledWith('unlockLobby', 'CODE123');
    });

    it('onLobbyLocked: devrait enregistrer un callback sur "lobbyLocked"', () => {
        const callback = jasmine.createSpy('callback');
        service.onLobbyLocked(callback);
        fakeSocket.trigger('lobbyLocked', { accessCode: 'CODE123', isLocked: true });
        expect(callback).toHaveBeenCalledWith({ accessCode: 'CODE123', isLocked: true });
    });

    it('onLobbyUnlocked: devrait enregistrer un callback sur "lobbyUnlocked"', () => {
        const callback = jasmine.createSpy('callback');
        service.onLobbyUnlocked(callback);
        fakeSocket.trigger('lobbyUnlocked', { accessCode: 'CODE123', isLocked: false });
        expect(callback).toHaveBeenCalledWith({ accessCode: 'CODE123', isLocked: false });
    });

    it('getSocketId: devrait renvoyer l’id du socket', () => {
        expect(service.getSocketId()).toEqual('fake-socket-id');
    });

    it('on: devrait enregistrer un callback sur l’event passé', () => {
        const callback = jasmine.createSpy('callback');
        service.on('customEvent', callback);
        fakeSocket.trigger('customEvent', { data: 123 });
        expect(callback).toHaveBeenCalledWith({ data: 123 });
    });

    it('emit: devrait émettre l’event passé avec les données', () => {
        spyOn(fakeSocket, 'emit');
        service.emit('customEvent', { data: 456 });
        expect(fakeSocket.emit).toHaveBeenCalledWith('customEvent', { data: 456 });
    });

    it('onUpdateUnavailableOptions: devrait enregistrer un callback sur "updateUnavailableOptions"', () => {
        const callback = jasmine.createSpy('callback');
        service.onUpdateUnavailableOptions(callback);
        fakeSocket.trigger('updateUnavailableOptions', { names: ['a'], avatars: ['b'] });
        expect(callback).toHaveBeenCalledWith({ names: ['a'], avatars: ['b'] });
    });

    it('onJoinError: devrait enregistrer un callback sur "joinError"', () => {
        const callback = jasmine.createSpy('callback');
        service.onJoinError(callback);
        fakeSocket.trigger('joinError', 'Join error');
        expect(callback).toHaveBeenCalledWith('Join error');
    });

    it('abandonGame: devrait émettre "abandonedGame" avec le bon player et accessCode', () => {
        spyOn(fakeSocket, 'emit');
        const player = { name: 'John' } as Player;
        service.abandonGame(player, 'CODE123');
        expect(fakeSocket.emit).toHaveBeenCalledWith('abandonedGame', { player, accessCode: 'CODE123' });
    });

    it('onAbandonGame: devrait enregistrer un callback sur "game-abandoned"', () => {
        const callback = jasmine.createSpy('callback');
        service.onAbandonGame(callback);
        fakeSocket.trigger('game-abandoned', { player: { name: 'John' } });
        expect(callback).toHaveBeenCalledWith({ player: { name: 'John' } });
    });

    it('onTransitionStarted: devrait enregistrer un callback sur "transitionStarted"', () => {
        const callback = jasmine.createSpy('callback');
        service.onTransitionStarted(callback);
        fakeSocket.trigger('transitionStarted', { nextPlayer: { name: 'Alice' }, transitionDuration: 5 });
        expect(callback).toHaveBeenCalledWith({ nextPlayer: { name: 'Alice' }, transitionDuration: 5 });
    });

    it('onTurnStarted: devrait enregistrer un callback sur "turnStarted"', () => {
        const callback = jasmine.createSpy('callback');
        service.onTurnStarted(callback);
        fakeSocket.trigger('turnStarted', { player: { name: 'Bob' }, turnDuration: 10 });
        expect(callback).toHaveBeenCalledWith({ player: { name: 'Bob' }, turnDuration: 10 });
    });

    it('onTimerUpdate: devrait enregistrer un callback sur "timerUpdate"', () => {
        const callback = jasmine.createSpy('callback');
        service.onTimerUpdate(callback);
        fakeSocket.trigger('timerUpdate', { timeLeft: 30 });
        expect(callback).toHaveBeenCalledWith({ timeLeft: 30 });
    });

    it('endTurn: devrait émettre "endTurn" avec le bon accessCode', () => {
        spyOn(fakeSocket, 'emit');
        service.endTurn('CODE123');
        expect(fakeSocket.emit).toHaveBeenCalledWith('endTurn', { accessCode: 'CODE123' });
    });

    it('onGameDeleted: devrait enregistrer un callback sur "gameDeleted"', () => {
        const callback = jasmine.createSpy('callback');
        service.onGameDeleted(callback);
        fakeSocket.trigger('gameDeleted');
        expect(callback).toHaveBeenCalled();
    });
});
