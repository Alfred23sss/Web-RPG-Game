import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';
import { CharacterFormComponent } from '@app/components/character-form/character-form.component';
import { ErrorMessages, Routes } from '@app/enums/global.enums';
import { Game } from '@app/interfaces/game';
import { GameService } from '@app/services/game/game.service';
import { SnackbarService } from '@app/services/snackbar/snackbar.service';

@Component({
    selector: 'app-create-page',
    templateUrl: './create-page.component.html',
    styleUrls: ['./create-page.component.scss'],
    imports: [MatTooltipModule, CommonModule],
})
export class CreatePageComponent implements OnInit {
    games: Game[] = [];
    constructor(
        private readonly dialog: MatDialog,
        private readonly gameService: GameService,
        private readonly router: Router,
        private readonly snackBarService: SnackbarService,
    ) {}

    get visibleGames(): Game[] {
        return this.games?.filter((game) => game.isVisible) || [];
    }

    ngOnInit(): void {
        this.gameService.fetchGames().subscribe((response) => {
            this.games = response;
        });
    }

    openDialog(game: Game): void {
        this.gameService.fetchGames().subscribe(() => {
            const currentGame = this.gameService.getGameById(game.id);
            if (!currentGame?.isVisible) {
                this.snackBarService.showMessage(ErrorMessages.UnavailableGame);
                return;
            }
            this.dialog.open(CharacterFormComponent, {
                data: { game },
            });
        });
    }

    navigateToHome(): void {
        this.router.navigate([Routes.HomePage]);
    }
}
