import { DragDropModule } from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { TileTooltipComponent } from '@app/components/tile-tooltip/tile-tooltip.component'; // ajustez le chemin si nécessaire
import { TileComponent } from '@app/components/tile/tile.component';
import { TileType } from '@app/enums/global.enums';
import { Tile } from '@app/interfaces/tile';

@Component({
    selector: 'app-grid',
    standalone: true,
    imports: [TileComponent, CommonModule, DragDropModule],
    templateUrl: './grid.component.html',
    styleUrls: ['./grid.component.scss'],
})
export class GridComponent {
    @Input() grid: Tile[][] | undefined = [];
    @Input() availablePath: Tile[] | undefined = [];
    @Input() quickestPath: Tile[] | undefined = [];
    @Input() isEditionMode: boolean = false;
    @Input() isActionMode: boolean = false;

    @Output() tileHovered = new EventEmitter<Tile>();
    @Output() tileClicked = new EventEmitter<Tile>();
    @Output() playerAttacked = new EventEmitter<Tile>();
    @Output() doorClicked = new EventEmitter<Tile>();
    @Output() tileRightClicked = new EventEmitter<{ tile: Tile; event: MouseEvent }>();

    tileType = TileType;

    constructor(private dialog: MatDialog) {}

    isInQuickestPath(tile: Tile): boolean {
        return this.quickestPath ? this.quickestPath.some((t) => t.id === tile.id) : false;
    }

    isAvailablePath(tile: Tile): boolean {
        return this.availablePath ? this.availablePath.some((t) => t.id === tile.id) : false;
    }

    onTileClick(tile: Tile): void {
        if (tile.player) {
            this.playerAttacked.emit(tile);
        } else if (tile.type === TileType.Door) {
            this.doorClicked.emit(tile);
        } else if (this.isAvailablePath(tile)) {
            this.tileClicked.emit(tile);
        }
    }

    onTileRightClick(event: MouseEvent, tile: Tile): void {
        event.preventDefault(); // Empêche l'ouverture du menu contextuel

        // Ouvre le tooltip personnalisé sous forme de dialog
        const dialogRef = this.dialog.open(TileTooltipComponent, {
            data: { tile },
            panelClass: 'custom-tooltip-dialog',
            hasBackdrop: false,
            position: { left: `${event.clientX}px`, top: `${event.clientY}px` },
        });

        // Ferme automatiquement après 2 secondes
        setTimeout(() => {
            dialogRef.close();
        }, 2000);
    }
}
