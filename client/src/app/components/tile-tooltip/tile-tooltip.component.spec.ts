import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { TileType } from '@app/enums/global.enums';
import { Tile } from '@app/interfaces/tile';
import { PlayerMovementService } from '@app/services/player-movement/player-movement.service';
import { TileTooltipComponent } from './tile-tooltip.component';

describe('TileTooltipComponent', () => {
    let component: TileTooltipComponent;
    let fixture: ComponentFixture<TileTooltipComponent>;
    let mockPlayerMovementService: jasmine.SpyObj<PlayerMovementService>;

    beforeEach(async () => {
        mockPlayerMovementService = jasmine.createSpyObj('PlayerMovementService', ['getMoveCost']);

        mockPlayerMovementService.getMoveCost.and.returnValue(2);

        await TestBed.configureTestingModule({
            providers: [
                { provide: MatDialogRef, useValue: jasmine.createSpyObj('MatDialogRef', ['close']) },
                { provide: MAT_DIALOG_DATA, useValue: { tile: { id: '1-1', type: TileType.Default } as Tile } },
                { provide: PlayerMovementService, useValue: mockPlayerMovementService },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(TileTooltipComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should initialize movementCost correctly', () => {
        expect(component.movementCost).toBe(2);
    });

    it('should return true for isInfinity when cost is Infinity', () => {
        expect(component.isInfinity(Infinity)).toBeTrue();
    });

    it('should return false for isInfinity when cost is finite', () => {
        expect(component.isInfinity(3)).toBeFalse();
    });
});
