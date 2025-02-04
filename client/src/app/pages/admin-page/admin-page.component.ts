import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink } from '@angular/router';
import { PopUpComponent } from '@app/components/pop-up/pop-up.component';
import { Game } from '@app/interfaces/game';
import { GameService } from '@app/services/game/game.service';
import { GridService } from '@app/services/grid/grid-service.service';
@Component({
    selector: 'app-admin-page',
    templateUrl: './admin-page.component.html',
    styleUrls: ['./admin-page.component.scss'],
    imports: [RouterLink, CommonModule, MatTooltipModule],
})
export class AdminPageComponent implements OnInit {
    games: Game[] = this.gameService.games;
    constructor(
        private dialogRef: MatDialog,
        public gameService: GameService,
        public gridService: GridService,
    ) {}

    ngOnInit(): void {
        this.gameService.fetchGames().subscribe((response) => {
            this.games = response;
        });
    }

    openDialog() {
        this.dialogRef.open(PopUpComponent);
    }

    deleteGame(id: string) {
        if (confirm(`Are you sure you want to delete ${id}?`)) {
            this.gameService.deleteGame(id).subscribe({
                next: () => {
                    console.log(`${id} was deleted successfully.`);
                    this.removeGame(id);
                },
                error: (err) => {
                    console.error('Error deleting game:', err);
                },
            });
        }
    }

    removeGame(id: string) {
        this.games = this.games.filter((game) => game.id !== id);
    }
    updateCurrentGame(id: string) {
        const game = this.gameService.getGameById(id);
        if (game) {
            // this.gridService.setGrid(game.grid);
            this.gameService.updateCurrentGame(game);
        }
    }

    toggleVisibility(id: string, event: Event) {
        const inputElement = event.target as HTMLInputElement;
        const isVisible = inputElement.checked;
        const game = this.gameService.getGameById(id);

        if (game) {
            game.isVisible = isVisible;
        }
    }
}
