import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TileType } from '@app/enums/global.enums';
import { Tile } from '@app/interfaces/tile';
import { GridComponent } from './grid.component';

describe('GridComponent', () => {
    let component: GridComponent;
    let fixture: ComponentFixture<GridComponent>;

    const mockTile1: Tile = { id: '1', type: TileType.Default } as Tile;
    const mockTile2: Tile = { id: '2', type: TileType.Default } as Tile;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [GridComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(GridComponent);
        component = fixture.componentInstance;
    });

    describe('isInQuickestPath()', () => {
        it('should return false when quickestPath is undefined', () => {
            component.quickestPath = undefined;
            expect(component.isInQuickestPath(mockTile1)).toBeFalse();
        });

        it('should return false when quickestPath is empty', () => {
            component.quickestPath = [];
            expect(component.isInQuickestPath(mockTile1)).toBeFalse();
        });

        it('should return true when tile exists in quickestPath', () => {
            component.quickestPath = [mockTile1, mockTile2];
            expect(component.isInQuickestPath(mockTile1)).toBeTrue();
        });

        it('should return false when tile not in quickestPath', () => {
            component.quickestPath = [mockTile1];
            expect(component.isInQuickestPath(mockTile2)).toBeFalse();
        });
    });

    describe('isAvailablePath()', () => {
        it('should return false when availablePath is undefined', () => {
            component.availablePath = undefined;
            expect(component.isAvailablePath(mockTile1)).toBeFalse();
        });

        it('should return false when availablePath is empty', () => {
            component.availablePath = [];
            expect(component.isAvailablePath(mockTile1)).toBeFalse();
        });

        it('should return true when tile exists in availablePath', () => {
            component.availablePath = [mockTile1, mockTile2];
            expect(component.isAvailablePath(mockTile1)).toBeTrue();
        });

        it('should return false when tile not in availablePath', () => {
            component.availablePath = [mockTile1];
            expect(component.isAvailablePath(mockTile2)).toBeFalse();
        });
    });
});
