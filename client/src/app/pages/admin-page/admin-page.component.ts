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
    constructor(private dialogRef: MatDialog) {}
<<<<<<< HEAD

=======
>>>>>>> 9841d6dd1f280d2c4d4dca0d93aa36f5a5dacda3
    openDialog() {
        this.dialogRef.open(PopUpComponent);
    }
}
