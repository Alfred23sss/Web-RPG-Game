import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CharacterFormComponent } from '@app/components/character-form/character-form.component';
import { Game } from '@app/interfaces/game';
import { GameService } from '@app/services/game/game.service';

@Component({
    selector: 'app-create-page',
    templateUrl: './create-page.component.html',
    styleUrls: ['./create-page.component.scss'],
    imports: [MatTooltipModule, CommonModule],
})
export class CreatePageComponent implements OnInit {
    games: Game[] = this.gameService.games;
    constructor(
        private dialog: MatDialog,
        public gameService: GameService,
    ) {}

    get visibleGames(): Game[] {
        return this.games?.filter((game) => game.isVisible) || [];
    }

    ngOnInit(): void {
        this.gameService.fetchGames().subscribe((response) => {
            this.games = response;
        });
    }

    openDialog() {
        this.dialog.open(CharacterFormComponent);
    }
}
