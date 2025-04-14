import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GameData } from '@app/classes/game-data';
import { GameStateSocketService } from '@app/services/game-state-socket/game-state-socket.service';
import { BehaviorSubject } from 'rxjs';
import { PlayerInfoComponent } from './player-info.component';

describe('PlayerInfoComponent', () => {
    let component: PlayerInfoComponent;
    let fixture: ComponentFixture<PlayerInfoComponent>;
    let gameDataSubject: BehaviorSubject<GameData>;

    beforeEach(async () => {
        const initialGameData = new GameData();
        gameDataSubject = new BehaviorSubject<GameData>(initialGameData);

        const spy = jasmine.createSpyObj('GameStateSocketService', ['updateGameData'], {
            gameData$: gameDataSubject.asObservable(),
            gameDataSubjectValue: initialGameData,
        });

        await TestBed.configureTestingModule({
            imports: [PlayerInfoComponent],
            providers: [
                {
                    provide: GameStateSocketService,
                    useValue: spy,
                },
            ],
        }).compileComponents();

        TestBed.inject(GameStateSocketService) as jasmine.SpyObj<GameStateSocketService>;
        fixture = TestBed.createComponent(PlayerInfoComponent);
        component = fixture.componentInstance;
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
    it('should unsubscribe from gameData$ on destroy', () => {
        const subscriptionSpy = spyOn(component['gameDataSubscription'], 'unsubscribe');
        component.ngOnDestroy();
        expect(subscriptionSpy).toHaveBeenCalled();
    });
});
