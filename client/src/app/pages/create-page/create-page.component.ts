import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CharacterFormComponent } from '@app/components/character-form/character-form.component';
import { GameService } from '@app/services/game/game.service';

@Component({
    selector: 'app-create-page',
    templateUrl: './create-page.component.html',
    styleUrls: ['./create-page.component.scss'],
    imports: [MatTooltipModule, CommonModule],
})
export class CreatePageComponent {
    constructor(
        private readonly dialog: MatDialog,
        public gameService: GameService,
    ) {}

    openDialog() {
        this.dialog.open(CharacterFormComponent);
    }
}
