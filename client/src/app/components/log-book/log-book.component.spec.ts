import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ClientNotifierServices } from '@app/services/client-notifier/client-notifier.service';
import { Subject } from 'rxjs';
import { LogBookComponent } from './log-book.component';

describe('LogBookComponent', () => {
    let component: LogBookComponent;
    let fixture: ComponentFixture<LogBookComponent>;
    let logBookUpdatedSubject: Subject<string[]>;
    let mockClientNotifier: jasmine.SpyObj<ClientNotifierServices>;

    beforeEach(async () => {
        logBookUpdatedSubject = new Subject<string[]>();
        mockClientNotifier = jasmine.createSpyObj('ClientNotifierServices', [], {
            logBook: ['Initial log 1', 'Initial log 2'],
            logBookUpdated: logBookUpdatedSubject.asObservable(),
        });
        await TestBed.configureTestingModule({
            imports: [LogBookComponent],
            providers: [{ provide: ClientNotifierServices, useValue: mockClientNotifier }],
        }).compileComponents();

        fixture = TestBed.createComponent(LogBookComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should initialize with current logs', () => {
        expect(component.logs).toEqual(['Initial log 1', 'Initial log 2']);
    });

    it('should update logs when logBookUpdated emits', () => {
        const newLogs = ['New log 1', 'New log 2', 'New log 3'];
        logBookUpdatedSubject.next(newLogs);
        expect(component.logs).toEqual(newLogs);
    });
});
