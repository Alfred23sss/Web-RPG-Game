import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GameData } from '@app/classes/game-data/game-data';
import { GameStateSocketService } from '@app/services/game-state-socket/game-state-socket.service';
import { ItemName } from '@common/enums';
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

    describe('hasGreatShield', () => {
        it('should return false if clientPlayer or inventory is missing', () => {
            component.gameData.clientPlayer = undefined as any;
            expect(component.hasGreatShield()).toBeFalse();

            component.gameData.clientPlayer = { inventory: undefined } as any;
            expect(component.hasGreatShield()).toBeFalse();
        });

        it('should return false if GreatShield is not in inventory', () => {
            component.gameData.clientPlayer = {
                inventory: [{ name: ItemName.BlackSword }, { name: ItemName.Armor }],
            } as any;
            expect(component.hasGreatShield()).toBeFalse();
        });

        it('should return true if GreatShield is in inventory', () => {
            component.gameData.clientPlayer = {
                inventory: [{ name: ItemName.BlackSword }, { name: ItemName.GreatShield }, { name: ItemName.Armor }],
            } as any;
            expect(component.hasGreatShield()).toBeTrue();
        });

        it('should skip null or undefined items in inventory', () => {
            component.gameData.clientPlayer = {
                inventory: [null, undefined, { name: ItemName.GreatShield }],
            } as any;
            expect(component.hasGreatShield()).toBeTrue();
        });
    });
});
