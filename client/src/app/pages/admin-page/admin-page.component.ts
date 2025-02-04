import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink } from '@angular/router';
import { PopUpComponent } from '@app/components/pop-up/pop-up.component';
import { Game } from '@app/interfaces/game';
import { GameDecorations } from '@app/interfaces/images';
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
    backgroundImage = GameDecorations.Background;
    constructor(
        private dialogRef: MatDialog,
        public gameService: GameService,
        public gridService: GridService,
    ) {}

    ngOnInit() {
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
                    this.removeGame(id);
                },
                error: () => {
                    alert('Deletion failed.');
                },
            });
        }
    }

    updateCurrentGame(id: string) {
        const game = this.gameService.getGameById(id);
        if (game) {
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

    private removeGame(id: string) {
        this.games = this.games.filter((game) => game.id !== id);
    }
}
