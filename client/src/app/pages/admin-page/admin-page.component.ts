import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

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
}