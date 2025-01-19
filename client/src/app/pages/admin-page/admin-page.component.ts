import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink } from '@angular/router';
import { PopUpComponent } from '@app/components/pop-up/pop-up.component';

@Component({
    selector: 'app-admin-page',
    templateUrl: './admin-page.component.html',
    styleUrls: ['./admin-page.component.scss'],
    imports: [RouterLink, CommonModule, MatTooltipModule],
})
export class AdminPageComponent {
    game1 = {
        name: 'exampleGame',
        size: '10x10',
        mode: 'Multijoueur',
        lastModified: new Date(),
        isVisible: true,
        previewImage: 'assets/images/example.png',
        description: 'Ceci est une description',
    };
    game2 = {
        name: 'exampleGame2',
        size: '15x15',
        mode: 'Multijoueur',
        lastModified: new Date(),
        isVisible: true,
        previewImage: 'assets/images/example.png',
        description: 'Ceci est une description encore',
    };
    exampleGames = [this.game1, this.game2];

    constructor(private dialogRef: MatDialog) {}

    openDialog() {
        this.dialogRef.open(PopUpComponent);
    }

    deleteGame(index: number) {
        if (confirm('Êtes-vous sûr de vouloir supprimer ce jeu ?')) {
            this.exampleGames.splice(index, 1);
        }
    }

    toggleVisibility(index: number) {
        this.exampleGames[index].isVisible = !this.exampleGames[index].isVisible;
    }
}
