/* eslint-disable @typescript-eslint/no-explicit-any */
import { ChangeDetectorRef } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ClientNotifierServices } from '@app/services/client-notifier/client-notifier.service';
import { Subject } from 'rxjs';
import { LogBookComponent } from './log-book.component';

describe('LogBookComponent', () => {
    let component: LogBookComponent;
    let fixture: ComponentFixture<LogBookComponent>;
    let logBookUpdatedSubject: Subject<string[]>;
    let mockClientNotifier: jasmine.SpyObj<ClientNotifierServices>;
    let mockCdr: jasmine.SpyObj<ChangeDetectorRef>;

    beforeEach(async () => {
        logBookUpdatedSubject = new Subject<string[]>();
        mockClientNotifier = jasmine.createSpyObj('ClientNotifierServices', [], {
            logBook: ['Log1 (Joueurs impliqués: Player1)', 'Log2 (Joueurs impliqués: Player2)'],
            logBookUpdated: logBookUpdatedSubject.asObservable(),
        });
        mockCdr = jasmine.createSpyObj('ChangeDetectorRef', ['detectChanges']);

        await TestBed.configureTestingModule({
            imports: [LogBookComponent],
            providers: [
                { provide: ClientNotifierServices, useValue: mockClientNotifier },
                { provide: ChangeDetectorRef, useValue: mockCdr },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(LogBookComponent);
        component = fixture.componentInstance;
        component.playerName = 'Player1';
        fixture.detectChanges();
    });

    afterEach(() => {
        logBookUpdatedSubject.complete();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should initialize with current logs', () => {
        expect(component.logs).toEqual(['Log1 (Joueurs impliqués: Player1)', 'Log2 (Joueurs impliqués: Player2)']);
        expect(component.filteredLogs).toEqual(component.logs);
    });

    it('should update logs when logBookUpdated emits', () => {
        const newLogs = ['Log3 (Joueurs impliqués: Player1, Player2)', 'Log4 (Joueurs impliqués: Player3)'];
        logBookUpdatedSubject.next(newLogs);
        expect(component.logs).toEqual(newLogs);
    });

    describe('toggleFilter()', () => {
        it('should toggle filterByPlayer and update filtered logs', () => {
            component.logs = ['Log1 (Joueurs impliqués: Player1)', 'Log2 (Joueurs impliqués: Player2)', 'Log3 (Joueurs impliqués: Player1, Player2)'];

            expect(component.filterByPlayer).toBeFalse();
            component.toggleFilter();
            expect(component.filterByPlayer).toBeTrue();
            expect(component.filteredLogs).toEqual(['Log1 (Joueurs impliqués: Player1)', 'Log3 (Joueurs impliqués: Player1, Player2)']);
            component.toggleFilter();
            expect(component.filterByPlayer).toBeFalse();
            expect(component.filteredLogs).toEqual(component.logs);
        });
    });

    describe('updateFilteredLogs()', () => {
        beforeEach(() => {
            component.logs = [
                'Log1 (Joueurs impliqués: Player1)',
                'Log2 (Joueurs impliqués: Player2)',
                'Log3 (Joueurs impliqués: Player1, Player2)',
                'Log4 (Invalid format)',
                'Log5 (Joueurs impliqués: )',
                'Log6',
            ];
        });

        it('should filter logs by player name when filter is active', () => {
            component.filterByPlayer = true;
            component.updateFilteredLogs();

            expect(component.filteredLogs).toEqual(['Log1 (Joueurs impliqués: Player1)', 'Log3 (Joueurs impliqués: Player1, Player2)']);
        });

        it('should return all logs when filter is inactive', () => {
            component.filterByPlayer = false;
            component.updateFilteredLogs();

            expect(component.filteredLogs).toEqual(component.logs);
        });

        it('should return all logs when playerName is empty', () => {
            component.filterByPlayer = true;
            component.playerName = '';
            component.updateFilteredLogs();

            expect(component.filteredLogs).toEqual(component.logs);
        });

        it('should handle logs with invalid format', () => {
            component.filterByPlayer = true;
            component.updateFilteredLogs();

            expect(component.filteredLogs).not.toContain('Log4 (Invalid format)');
            expect(component.filteredLogs).not.toContain('Log5 (Joueurs impliqués: )');
            expect(component.filteredLogs).not.toContain('Log6');
        });
    });

    describe('scrollToBottom()', () => {
        it('should scroll to bottom of log container', fakeAsync(() => {
            const mockElement = {
                scrollTop: 0,
                scrollHeight: 500,
            };
            component.logContainerRef = { nativeElement: mockElement } as any;

            component.scrollToBottom();
            tick();

            expect(mockElement.scrollTop).toBe(mockElement.scrollHeight);
        }));

        it('should handle missing log container', () => {
            component.logContainerRef = undefined as any;
            expect(() => component.scrollToBottom()).not.toThrow();
        });
    });
});
