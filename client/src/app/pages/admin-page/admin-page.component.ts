import { Component } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { RouterLink } from '@angular/router';
import { PopUpComponent } from '@app/components/pop-up/pop-up.component';


@Component({
    selector: 'app-admin-page',
    templateUrl: './admin-page.component.html',
    styleUrls: ['./admin-page.component.scss'],
    imports: [RouterLink],
})

export class AdminPageComponent {
    exampleGame = [
        {
            name: 'exampleGame',
            size: '10x10',
            mode: 'Multijoueur',
            lastModified: new Date(),
            isVisible: true,
            previewImage: 'assets/images/example.png',
            description: 'Ceci est une description',
        },
    ];

    constructor(private dialogRef: MatDialog) {}

    openDialog() {
        this.dialogRef.open(PopUpComponent);
    }
}
