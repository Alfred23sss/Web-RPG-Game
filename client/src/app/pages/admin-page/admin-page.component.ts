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
import { SnackbarService } from '@app/services/snackbar/snackbar.service';

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
        private snackbarService: SnackbarService,
    ) {}

    ngOnInit() {
        this.loadGames();
    }

    openDialog() {
        this.dialogRef.open(PopUpComponent);
    }

    deleteGame(id: string) {
        this.snackbarService.showConfirmation('Are you sure you want to delete this game?').subscribe((confirmed) => {
            if (confirmed) {
                this.gameService.deleteGame(id).subscribe({
                    next: () => this.loadGames(),
                    error: () => this.snackbarService.showMessage('Deletion failed'),
                });
            }
        });
    }

    updateCurrentGame(id: string) {
        const game = this.gameService.getGameById(id);
        if (game) {
            this.gameService.updateCurrentGame(game);
        }
    }

    toggleVisibility(id: string, event: Event) {
        const isVisible = (event.target as HTMLInputElement).checked;
        this.gameService.updateGameVisibility(id, isVisible);
    }

    private loadGames() {
        this.gameService.fetchGames().subscribe({
            next: (response) => (this.games = response),
            error: () => this.snackbarService.showMessage('Failed to load games'),
        });
    }
}
