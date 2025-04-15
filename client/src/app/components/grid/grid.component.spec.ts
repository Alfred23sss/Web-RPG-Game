/* eslint-disable @typescript-eslint/no-explicit-any */ // all any uses are to allow the testing of a private service.
import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { POPUP_DELAY } from '@app/constants/global.constants';
import { Tile } from '@app/interfaces/tile';
import { ItemName, TileType } from '@common/enums';
import { of } from 'rxjs';
import { GridComponent } from './grid.component';

describe('GridComponent', () => {
    let component: GridComponent;
    let fixture: ComponentFixture<GridComponent>;
    let mockDialog: jasmine.SpyObj<MatDialog>;

    const playerTile: Tile = { id: '2', type: TileType.Default, player: {} } as Tile;
    const doorTile: Tile = { id: '3', type: TileType.Door } as Tile;
    const wallTile: Tile = { id: '3', type: TileType.Wall } as Tile;

    const mockTile1: Tile = { id: '1', type: TileType.Default } as Tile;
    const mockTile2: Tile = { id: '2', type: TileType.Default } as Tile;

    beforeEach(async () => {
        mockDialog = jasmine.createSpyObj('MatDialog', ['open']);

        await TestBed.configureTestingModule({
            imports: [GridComponent],
            providers: [{ provide: MatDialog, useValue: mockDialog }],
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

    describe('onTileClick()', () => {
        it('should emit playerAttacked if the tile contains a player', () => {
            spyOn(component.playerAttacked, 'emit');
            component.onTileClick(playerTile);
            expect(component.playerAttacked.emit).toHaveBeenCalledWith(playerTile);
        });

        it('should emit doorClicked if the tile is a door', () => {
            spyOn(component.doorClicked, 'emit');
            component.onTileClick(doorTile);
            expect(component.doorClicked.emit).toHaveBeenCalledWith(doorTile);
        });

        it('should emit wallClicked if the tile is a wall', () => {
            spyOn(component.wallClicked, 'emit');
            component.onTileClick(wallTile);
            expect(component.wallClicked.emit).toHaveBeenCalledWith(wallTile);
        });

        it('should emit tileClicked if the tile is in availablePath', () => {
            spyOn(component.tileClicked, 'emit');
            component.availablePath = [mockTile1];
            component.onTileClick(mockTile1);
            expect(component.tileClicked.emit).toHaveBeenCalledWith(mockTile1);
        });

        it('should not emit tileClicked if the tile is not in availablePath', () => {
            spyOn(component.tileClicked, 'emit');
            component.availablePath = [];
            component.onTileClick(mockTile1);
            expect(component.tileClicked.emit).not.toHaveBeenCalled();
        });
    });

    describe('hasLightningItem()', () => {
        it('should return true if player has Lightning item', () => {
            component.clientPlayer = {
                inventory: [{ name: ItemName.Lightning }, null],
            } as any;

            expect(component.hasLightningItem()).toBeTrue();
        });

        it('should return false if player does not have Lightning item', () => {
            component.clientPlayer = {
                inventory: [{ name: ItemName.Fire }, null],
            } as any;

            expect(component.hasLightningItem()).toBeFalse();
        });
    });

    describe('isAccessible()', () => {
        it('should return true when one of the neighbor tiles has the same player name', () => {
            const tile = { id: 'A', type: TileType.Default } as Tile;
            const neighborWithPlayer = { player: { name: 'Mehdi' } } as Tile;
            component.grid = [[tile]];
            component.clientPlayer = { name: 'Mehdi' } as any;
            component['playerMovementService'] = {
                getNeighbors: () => [neighborWithPlayer],
            } as any;

            expect(component.isAccessible(tile)).toBeTrue();
        });

        it('should return false when no neighbors match the player name', () => {
            const tile = { id: 'B', type: TileType.Default } as Tile;
            const otherNeighbor = { player: { name: 'Other' } } as Tile;

            component.grid = [[tile]];
            component.clientPlayer = { name: 'Mehdi' } as any;

            component['playerMovementService'] = {
                getNeighbors: () => [otherNeighbor],
            } as any;

            expect(component.isAccessible(tile)).toBeFalse();
        });
    });

    describe('onTileRightClick()', () => {
        it('should open dialog with TileTooltipComponent and close the dialog after POPUP_DELAY', fakeAsync(() => {
            const mockEvent = new MouseEvent('contextmenu', { clientX: 100, clientY: 200 });
            const mockDialogRef = { close: jasmine.createSpy('close'), afterClosed: () => of(null) };

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            mockDialog.open.and.returnValue(mockDialogRef as any);

            component.onTileRightClick(mockEvent, mockTile1);

            expect(mockDialog.open).toHaveBeenCalledWith(jasmine.any(Function), {
                data: { tile: mockTile1 },
                panelClass: 'custom-tooltip-dialog',
                hasBackdrop: false,
                position: { left: '100px', top: '200px' },
            });

            tick(POPUP_DELAY);
            expect(mockDialogRef.close).toHaveBeenCalled();
        }));
    });

    it('when in debug mode should emit teleport event with clicked tile', () => {
        const mockEvent = new MouseEvent('contextmenu');
        const testTile = { id: 'debug-tile' } as Tile;
        component.isDebugMode = true;
        spyOn(component.teleportClicked, 'emit');
        component.onTileRightClick(mockEvent, testTile);
        expect(component.teleportClicked.emit).toHaveBeenCalledWith(testTile);
        expect(mockDialog.open).not.toHaveBeenCalled();
    });
});
