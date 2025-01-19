import { Component } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { CharacterFormComponent } from '@app/components/character-form/character-form.component';

@Component({
    selector: 'app-create-page',
    templateUrl: './create-page.component.html',
    styleUrls: ['./create-page.component.scss'],
})
export class CreatePageComponent {
    constructor(private dialog: MatDialog) {}

    openDialog() {
        this.dialog.open(CharacterFormComponent);
    }
}
