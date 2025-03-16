import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { TileType } from '@app/enums/global.enums';
import { Tile } from '@app/interfaces/tile';
import { PlayerMovementService } from '@app/services/player-movement/player-movement.service';

@Component({
    selector: 'app-tile-tooltip',
    templateUrl: './tile-tooltip.component.html',
    styleUrls: ['./tile-tooltip.component.scss'],
})
export class TileTooltipComponent {
    movementCost: number;
    tileType = TileType;
    Infinity: number = Infinity;
    constructor(
        public dialogRef: MatDialogRef<TileTooltipComponent>,
        private playerMovementService: PlayerMovementService,
        @Inject(MAT_DIALOG_DATA) public data: { tile: Tile },
    ) {
        this.movementCost = this.playerMovementService.getMoveCost(data.tile);
    }
}
