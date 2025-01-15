import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';

@Component({
  selector: 'app-pop-up',
  templateUrl: './pop-up.component.html',
  styleUrls: ['./pop-up.component.scss'],
  standalone: true,
  imports: [RouterLink],
})
export class PopUpComponent {
  isPopupVisible = true;

  constructor(private dialogRef: MatDialog) {}

  closePopup() {
    this.dialogRef.closeAll();
  }
}
