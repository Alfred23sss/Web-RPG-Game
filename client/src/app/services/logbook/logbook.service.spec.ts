import { TestBed } from '@angular/core/testing';
import { DiceType } from '@app/enums/global.enums';
import { Player } from '@app/interfaces/player';
import { LogBookService } from '@app/services/logbook/logbook.service';

describe('LogBookService', () => {
    let service: LogBookService;
    let mockPlayer: Player;

    beforeEach(() => {
        TestBed.configureTestingModule({});
        service = TestBed.inject(LogBookService);

        mockPlayer = {
            name: '',
            avatar: '',
            speed: 4,
            vitality: 4,
            attack: { value: 4, bonusDice: DiceType.Uninitialized },
            defense: { value: 4, bonusDice: DiceType.Uninitialized },
            hp: { current: 10, max: 10 },
            movementPoints: 3,
            actionPoints: 3,
            inventory: [null, null],
            isAdmin: false,
            hasAbandoned: false,
        };
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should add an entry to the logBook without players', () => {
        const entry = 'Nouvelle entrée sans joueurs';
        service.addEntry(entry);

        expect(service.logBook.length).toBe(1);
        expect(service.logBook[0]).toContain(entry);
        expect(service.logBook[0]).toMatch(/\[\d{2}:\d{2}:\d{2}\] - Nouvelle entrée sans joueurs/);
    });

    it('should add an entry to the logBook with players', () => {
        const entry = 'Nouvelle entrée avec joueurs';
        const players: Player[] = [mockPlayer, mockPlayer];

        service.addEntry(entry, players);

        expect(service.logBook.length).toBe(1);
        expect(service.logBook[0]).toContain(entry);
        expect(service.logBook[0]).toContain('Joueur1, Joueur2');
        expect(service.logBook[0]).toMatch(/\[\d{2}:\d{2}:\d{2}\] - Nouvelle entrée avec joueurs \(Joueurs impliqués : Joueur1, Joueur2\)/);
    });

    it('should format time correctly', () => {
        const date = new Date(2023, 9, 15, 14, 30, 45);
        const formattedTime = service['formatTime'](date);

        expect(formattedTime).toBe('14:30:45');
    });

    it('should emit logBookUpdated when an entry is added', () => {
        const entry = 'Nouvelle entrée';
        let emittedLogBook: string[] | undefined;

        service.logBookUpdated.subscribe((logBook: string[]) => {
            emittedLogBook = logBook;
        });

        service.addEntry(entry);

        expect(emittedLogBook).toBeDefined();
        expect(emittedLogBook?.length).toBe(1);
        expect(emittedLogBook?.[0]).toContain(entry);
    });
});
