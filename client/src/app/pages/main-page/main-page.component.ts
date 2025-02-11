import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { GameDecorations } from '@app/interfaces/images';

@Component({
    selector: 'app-main-page',
    templateUrl: './main-page.component.html',
    styleUrls: ['./main-page.component.scss'],
    imports: [RouterLink],
})
export class MainPageComponent {
    readonly title: string = "William's Wonderland";
    gameDecorations = GameDecorations;
    constructor() {}
}
