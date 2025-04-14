import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router, RouterLink } from '@angular/router';
import { GameInfoComponent } from '@app/components/game-info/game-info.component';
import { PopUpComponent } from '@app/components/pop-up/pop-up.component';
import { ErrorMessages } from '@app/enums/global.enums';
import { Game } from '@app/interfaces/game';
import { GameService } from '@app/services/game/game.service';
import { SnackbarService } from '@app/services/snackbar/snackbar.service';
import { Routes } from '@common/enums';

@Component({
    selector: 'app-admin-page',
    templateUrl: './admin-page.component.html',
    styleUrls: ['./admin-page.component.scss'],
    imports: [RouterLink, CommonModule, MatTooltipModule, GameInfoComponent],
})
export class AdminPageComponent implements OnInit {
    games: Game[];
    constructor(
        private dialogRef: MatDialog,
        private gameService: GameService,
        private snackbarService: SnackbarService,
        private router: Router,
    ) {}

    ngOnInit(): void {
        this.loadGames();
    }

    openDialog(): void {
        this.dialogRef.open(PopUpComponent);
    }

    deleteGame(id: string): void {
        this.snackbarService.showConfirmation(ErrorMessages.ConfirmDeletion).subscribe((confirmed) => {
            if (confirmed) {
                this.gameService.deleteGame(id).subscribe({
                    next: () => this.loadGames(),
                    error: () => this.snackbarService.showMessage(ErrorMessages.DeletionFailed),
                });
            }
        });
    }

    updateCurrentGame(id: string): void {
        const game = this.gameService.getGameById(id);
        if (game) {
            game.isVisible = false;
            this.gameService.updateCurrentGame(game);
        }
    }

    toggleVisibility(id: string, event: Event): void {
        const isVisible = (event.target as HTMLInputElement).checked;
        this.gameService.updateGameVisibility(id, isVisible);
    }

    navigateToHome(): void {
        this.router.navigate([Routes.HomePage]);
    }

    private loadGames(): void {
        this.gameService.fetchGames().subscribe({
            next: (response) => (this.games = response),
            error: () => this.snackbarService.showMessage(ErrorMessages.FailedLoad),
        });
    }
}
