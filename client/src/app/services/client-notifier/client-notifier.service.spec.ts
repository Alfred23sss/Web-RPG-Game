/* eslint-disable @typescript-eslint/no-magic-numbers */
import { TestBed } from '@angular/core/testing';
import { DiceType } from '@app/enums/global.enums';
import { Player } from '@app/interfaces/player';
import { ClientNotifierServices } from '@app/services/client-notifier/client-notifier.service';
import { SnackbarService } from '@app/services/snackbar/snackbar.service';
import { take } from 'rxjs';

describe('ClientNotifierServices', () => {
    let service: ClientNotifierServices;
    let mockPlayer: Player;
    let snackbarServiceSpy: jasmine.SpyObj<SnackbarService>;

    beforeEach(() => {
        snackbarServiceSpy = jasmine.createSpyObj('SnackbarService', ['showMessage', 'showMultipleMessages']);

        TestBed.configureTestingModule({
            providers: [{ provide: SnackbarService, useValue: snackbarServiceSpy }],
        });

        service = TestBed.inject(ClientNotifierServices);

        mockPlayer = {
            name: 'Test Player',
            avatar: '',
            speed: 4,
            attack: { value: 4, bonusDice: DiceType.Uninitialized },
            defense: { value: 4, bonusDice: DiceType.Uninitialized },
            hp: { current: 10, max: 10 },
            movementPoints: 3,
            actionPoints: 3,
            inventory: [null, null],
            isAdmin: false,
            hasAbandoned: false,
            combatWon: 0,
            isActive: true,
            isVirtual: false,
        };
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should add a log entry and notify subscribers', (done) => {
        const entry = 'New log entry';

        service.logBookUpdated.pipe(take(1)).subscribe((logs) => {
            expect(logs.length).toBe(1);
            expect(logs[0]).toContain(entry);
            done();
        });

        service.addLogbookEntry(entry);
    });

    it('should format log entries correctly with a timestamp', () => {
        const entry = 'Log entry test';
        const formattedTime = service['formatTime'](new Date());
        service.addLogbookEntry(entry);
        expect(service.logBook[0]).toContain(`[${formattedTime}] - ${entry}`);
    });

    it('should include player names in log entries', () => {
        const entry = 'Player action';
        service.addLogbookEntry(entry, [mockPlayer]);
        expect(service.logBook[0]).toContain(`(Joueurs impliqués : ${mockPlayer.name})`);
    });

    it('should call snackbarService.showMessage when displaying a message', () => {
        const message = 'Snackbar test message';
        service.displayMessage(message);
        expect(snackbarServiceSpy.showMessage).toHaveBeenCalledWith(message);
    });

    it('should call snackbarService.showMultipleMessages when showing multiple messages', () => {
        const message = 'Multiple messages';
        service.showMultipleMessages(message);
        expect(snackbarServiceSpy.showMultipleMessages).toHaveBeenCalledWith(message, jasmine.any(String), jasmine.any(Number));
    });
});
