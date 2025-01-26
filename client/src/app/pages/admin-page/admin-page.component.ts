import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink } from '@angular/router';
import { PopUpComponent } from '@app/components/pop-up/pop-up.component';
import { GameService } from '@app/services/game.service';
import { GridService } from '@app/services/grid-service.service';

@Component({
    selector: 'app-admin-page',
    templateUrl: './admin-page.component.html',
    styleUrls: ['./admin-page.component.scss'],
    imports: [RouterLink, CommonModule, MatTooltipModule],
})
export class AdminPageComponent {
    constructor(
        private dialogRef: MatDialog,
        public gameService: GameService,
        public gridService: GridService,
    ) {}

    openDialog() {
        this.dialogRef.open(PopUpComponent);
    }

    deleteGame(name: string) {
        if (confirm(`Confirm deleting ${name}?`)) {
            this.gameService.removeGame(name);
        }
    }

    updateCurrentGame(name: string) {
        const game = this.gameService.getGameByName(name);
        if (game) {
            // this.gridService.setGrid(game.grid);
            this.gameService.updateCurrentGame(game);
        }
    }

    toggleVisibility(name: string, event: Event) {
        const inputElement = event.target as HTMLInputElement;
        const isVisible = inputElement.checked;
        const game = this.gameService.getGameByName(name);

        if (game) {
            game.isVisible = isVisible;
        }
    }
}
