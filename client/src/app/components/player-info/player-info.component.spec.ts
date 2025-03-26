import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { GameData } from '@app/classes/gameData';
import { GameCombatComponent } from '@app/components/game-combat/game-combat.component';
import { Player } from '@app/interfaces/player';
import { GameStateSocketService } from '@app/services/game-state-socket/game-state-socket.service';
import { GameplayService } from '@app/services/gameplay/gameplay.service';
import { of } from 'rxjs';

describe('GameCombatComponent', () => {
    let component: GameCombatComponent;
    let fixture: ComponentFixture<GameCombatComponent>;
    let mockDialogRef: jasmine.SpyObj<MatDialogRef<GameCombatComponent>>;
    let mockGameStateService: jasmine.SpyObj<GameStateSocketService>;
    let mockGameplayService: jasmine.SpyObj<GameplayService>;
    let mockGameData: GameData;
    let mockAttacker: Player;
    let mockDefender: Player;

    beforeEach(async () => {
        mockGameData = new GameData();
        mockAttacker = {} as Player;
        mockDefender = {} as Player;

        mockDialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);
        mockGameStateService = jasmine.createSpyObj('GameStateSocketService', [], {
            gameData$: of(mockGameData),
            closePopup$: of(undefined),
        });
        mockGameplayService = jasmine.createSpyObj('GameplayService', ['attack', 'evade']);

        await TestBed.configureTestingModule({
            declarations: [GameCombatComponent],
            providers: [
                { provide: MatDialogRef, useValue: mockDialogRef },
                { provide: GameStateSocketService, useValue: mockGameStateService },
                { provide: GameplayService, useValue: mockGameplayService },
                { provide: MAT_DIALOG_DATA, useValue: { gameData: mockGameData, attacker: mockAttacker, defender: mockDefender } },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(GameCombatComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should subscribe to gameData$', () => {
        expect(component.gameData).toEqual(mockGameData);
    });

    it('should call attack method on onAttack', () => {
        component.onAttack();
        expect(mockGameplayService.attack).toHaveBeenCalledWith(mockGameData);
    });

    it('should call evade method on onEvade', () => {
        component.onEvade();
        expect(mockGameplayService.evade).toHaveBeenCalledWith(mockGameData);
    });

    it('should close dialog on onClose', () => {
        component.onClose();
        expect(mockDialogRef.close).toHaveBeenCalled();
    });

    it('should unsubscribe on destroy', () => {
        spyOn(component['gameDataSubscription'], 'unsubscribe');
        spyOn(component['closePopupSubscription'], 'unsubscribe');
        component.ngOnDestroy();
        expect(component['gameDataSubscription'].unsubscribe).toHaveBeenCalled();
        expect(component['closePopupSubscription'].unsubscribe).toHaveBeenCalled();
    });
});
