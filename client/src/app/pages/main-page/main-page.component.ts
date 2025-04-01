import { Component } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { RouterLink } from '@angular/router';
import { AccessCodeComponent } from '@app/components/access-code/access-code.component';
import { GameDecorations } from '@app/enums/global.enums';

@Component({
    selector: 'app-main-page',
    templateUrl: './main-page.component.html',
    styleUrls: ['./main-page.component.scss'],
    imports: [RouterLink],
})
export class MainPageComponent {
    readonly title: string = "William's Wonderland";
    gameDecorations = GameDecorations;
    constructor(private dialogRef: MatDialog) {}

    openDialog(): void {
        this.dialogRef.open(AccessCodeComponent);
    }
}
