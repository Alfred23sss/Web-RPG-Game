import { DiceType } from '@app/interfaces/Dice';
import { Player } from '@app/interfaces/Player';
import { WaitingLineService } from './waiting-line.service';

describe('WaitingLineService', () => {
    let service: WaitingLineService;
    const roomId = 'room1';
    const player1: Player = {
        playerInfo: {
            name: 'Player1',
            avatar: 'avatar1.png',
            speed: 5,
            vitality: 10,
            attack: { value: 3, bonusDice: DiceType.D4 },
            defense: { value: 2, bonusDice: DiceType.D4 },
            hp: { current: 10, max: 10 },
            movementPoints: 3,
            actionPoints: 2,
            inventory: [null, null],
            isAdmin: true,
        },
    };
    const player2: Player = {
        playerInfo: {
            name: 'Player2',
            avatar: 'avatar2.png',
            speed: 6,
            vitality: 12,
            attack: { value: 4, bonusDice: DiceType.D6 },
            defense: { value: 3, bonusDice: DiceType.D6 },
            hp: { current: 12, max: 12 },
            movementPoints: 4,
            actionPoints: 3,
            inventory: [null, null],
            isAdmin: false,
        },
    };

    beforeEach(() => {
        service = new WaitingLineService();
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    describe('addPlayer', () => {
        it('should add a player to the waiting line for a room', () => {
            service.addPlayer(roomId, player1);
            const waitingLine = service.getWaitingLine(roomId);
            expect(waitingLine).toContain(player1);
        });

        it('should initialize the waiting line if it does not exist', () => {
            service.addPlayer(roomId, player1);
            expect(service.getWaitingLine(roomId)).toEqual([player1]);
        });
    });

    describe('removePlayer', () => {
        it('should remove a player from the waiting line for a room', () => {
            service.addPlayer(roomId, player1);
            service.addPlayer(roomId, player2);
            service.removePlayer(roomId, player1.playerInfo.name);
            const waitingLine = service.getWaitingLine(roomId);
            expect(waitingLine).not.toContain(player1);
            expect(waitingLine).toContain(player2);
        });

        it('should do nothing if the room does not exist', () => {
            service.removePlayer('nonExistentRoom', player1.playerInfo.name);
            expect(service.getWaitingLine('nonExistentRoom')).toEqual([]);
        });
    });

    describe('getWaitingLine', () => {
        it('should return the waiting line for a room', () => {
            service.addPlayer(roomId, player1);
            const waitingLine = service.getWaitingLine(roomId);
            expect(waitingLine).toEqual([player1]);
        });

        it('should return an empty array if the room does not exist', () => {
            const waitingLine = service.getWaitingLine('nonExistentRoom');
            expect(waitingLine).toEqual([]);
        });
    });

    describe('clearWaitingLine', () => {
        it('should clear the waiting line for a room', () => {
            service.addPlayer(roomId, player1);
            service.clearWaitingLine(roomId);
            expect(service.getWaitingLine(roomId)).toEqual([]);
        });

        it('should do nothing if the room does not exist', () => {
            service.clearWaitingLine('nonExistentRoom');
            expect(service.getWaitingLine('nonExistentRoom')).toEqual([]);
        });
    });

    describe('isAdmin', () => {
        it('should return true if the player is the admin', () => {
            service.addPlayer(roomId, player1);
            const isAdmin = service.isAdmin(roomId, player1.playerInfo.name);
            expect(isAdmin).toBe(true);
        });

        it('should return false if the player is not the admin', () => {
            service.addPlayer(roomId, player2);
            const isAdmin = service.isAdmin(roomId, player2.playerInfo.name);
            expect(isAdmin).toBe(false);
        });

        it('should return false if the room does not exist', () => {
            const isAdmin = service.isAdmin('nonExistentRoom', player1.playerInfo.name);
            expect(isAdmin).toBe(false);
        });

        it('should return false if the player does not exist in the room', () => {
            service.addPlayer(roomId, player1);
            const isAdmin = service.isAdmin(roomId, 'nonExistentPlayer');
            expect(isAdmin).toBe(false);
        });
    });

    describe('getAllWaitingLines', () => {
        it('should return all waiting lines', () => {
            service.addPlayer(roomId, player1);
            service.addPlayer('room2', player2);
            const allWaitingLines = service.getAllWaitingLines();
            expect(allWaitingLines.size).toBe(2);
            expect(allWaitingLines.get(roomId)).toEqual([player1]);
            expect(allWaitingLines.get('room2')).toEqual([player2]);
        });
    });
});
