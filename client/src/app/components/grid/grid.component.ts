import { DragDropModule } from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { TileTooltipComponent } from '@app/components/tile-tooltip/tile-tooltip.component';
import { TileComponent } from '@app/components/tile/tile.component';
import { POPUP_DELAY } from '@app/constants/global.constants';
import { Player } from '@app/interfaces/player';
import { Tile } from '@app/interfaces/tile';
import { GameStateSocketService } from '@app/services/game-state-socket/game-state-socket.service';
import { PlayerMovementService } from '@app/services/player-movement/player-movement.service';
import { ItemName, TileType } from '@common/enums';

@Component({
    selector: 'app-grid',
    standalone: true,
    imports: [TileComponent, CommonModule, DragDropModule],
    templateUrl: './grid.component.html',
    styleUrls: ['./grid.component.scss'],
})
export class GridComponent implements OnChanges {
    @Input() grid: Tile[][] | undefined = [];
    @Input() availablePath: Tile[] | undefined = [];
    @Input() quickestPath: Tile[] | undefined = [];
    @Input() isEditionMode: boolean = false;
    @Input() isActionMode: boolean = false;
    @Input() isDebugMode: boolean = false;
    @Input() clientPlayer: Player;

    @Output() tileHovered = new EventEmitter<Tile>();
    @Output() tileClicked = new EventEmitter<Tile>();
    @Output() playerAttacked = new EventEmitter<Tile>();
    @Output() doorClicked = new EventEmitter<Tile>();
    @Output() wallClicked = new EventEmitter<Tile>();
    @Output() tileRightClicked = new EventEmitter<{ tile: Tile; event: MouseEvent }>();
    @Output() teleportClicked = new EventEmitter<Tile>();

    tileType = TileType;

    constructor(
        private dialog: MatDialog,
        private cdr: ChangeDetectorRef,
        private playerMovementService: PlayerMovementService,
        private gameStateService: GameStateSocketService,
    ) {}

    isInQuickestPath(tile: Tile): boolean {
        return this.quickestPath ? this.quickestPath.some((t) => t.id === tile.id) : false;
    }

    isAvailablePath(tile: Tile): boolean {
        return this.availablePath ? this.availablePath.some((t) => t.id === tile.id) : false;
    }

    onTileClick(tile: Tile, event: MouseEvent): void {
        const gameData = this.gameStateService.gameDataSubjectValue;
        if (gameData.hasTurnEnded && event.button === 0) {
            //test this
            return;
        }
        if (tile.player) {
            this.playerAttacked.emit(tile);
        } else if (tile.type === TileType.Door && !tile.item) {
            this.doorClicked.emit(tile);
        } else if (tile.type === TileType.Wall) {
            this.wallClicked.emit(tile);
        }
        if (this.isAvailablePath(tile)) {
            this.tileClicked.emit(tile);
        }
    }

    onTileRightClick(event: MouseEvent, tile: Tile): void {
        if (this.isDebugMode) {
            event.preventDefault();

            this.teleportClicked.emit(tile);
        } else {
            event.preventDefault();

            const dialogRef = this.dialog.open(TileTooltipComponent, {
                data: { tile },
                panelClass: 'custom-tooltip-dialog',
                hasBackdrop: false,
                position: { left: `${event.clientX}px`, top: `${event.clientY}px` },
            });

            setTimeout(() => {
                dialogRef.close();
            }, POPUP_DELAY);
        }
    }

    hasPickaxeItem(): boolean {
        return this.clientPlayer.inventory.some((item) => item?.name === ItemName.Pickaxe);
    }

    isAccessible(tile: Tile): boolean {
        const accessibleTiles = this.playerMovementService.getNeighbors(tile, this.grid as Tile[][]);
        return accessibleTiles.some((t) => t.player?.name === this.clientPlayer.name);
    }

    ngOnChanges(): void {
        if (this.clientPlayer) {
            this.cdr.detectChanges();
        }
    }
}
