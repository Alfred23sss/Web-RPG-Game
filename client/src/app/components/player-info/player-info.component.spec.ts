import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GameData } from '@app/classes/gameData';
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
            declarations: [PlayerInfoComponent],
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

    it('should subscribe to gameData$ on construction', () => {
        const mockGameData = new GameData();
        mockGameData.lobby.players = [];

        gameDataSubject.next(mockGameData);
        fixture.detectChanges();

        expect(component.gameData).toEqual(mockGameData);
    });

    it('should unsubscribe from gameData$ on destroy', () => {
        const subscriptionSpy = spyOn(component['gameDataSubscription'], 'unsubscribe');

        component.ngOnDestroy();

        expect(subscriptionSpy).toHaveBeenCalled();
    });

    it('should handle initial gameData correctly', () => {
        const initialGameData = new GameData();

        fixture.detectChanges();

        expect(component.gameData).toEqual(initialGameData);
    });

    it('should update gameData when new data is emitted', () => {
        const initialGameData = new GameData();
        const updatedGameData = new GameData();
        updatedGameData.lobby.players = [];

        gameDataSubject.next(initialGameData);
        fixture.detectChanges();
        gameDataSubject.next(updatedGameData);
        fixture.detectChanges();

        expect(component.gameData).toEqual(updatedGameData);
    });
});
