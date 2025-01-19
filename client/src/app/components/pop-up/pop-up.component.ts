import { Component} from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';

@Component({
    selector: 'app-pop-up',
    templateUrl: './pop-up.component.html',
    styleUrls: ['./pop-up.component.scss'],
    standalone: true,
    imports: [],
})
export class PopUpComponent {
    isPopupVisible = true;

    isGameSmall = false;
    isGameMedium = false;
    isGameLarge = false;
    // manque logique des boutons !!

    // changer pr que setGame il update un bool et que qd un truc et cliquer il reste highlight et apr confirm change de page
    // CTF mettre unavaible chek dn document cquon doit faire

    constructor(
        private dialogRef: MatDialog,
        private router: Router,
    ) {}

    setGameSmall() {
        this.isGameSmall = true;
        this.isGameMedium = false;
        this.isGameLarge = false;
    }
    setGameMedium() {
        this.isGameMedium = true;
        this.isGameSmall = false;
        this.isGameLarge = false;
    }
    setGameLarge() {
        this.isGameLarge = true;
        this.isGameSmall = false;
        this.isGameMedium = false;
    }
    closePopup() {
        this.isGameSmall = false;
        this.isGameMedium = false;
        this.isGameLarge = false;
        this.dialogRef.closeAll();
    }
    setClassicGame() {
        if (this.isGameSmall || this.isGameMedium || this.isGameLarge) {
            this.dialogRef.closeAll();
            this.router.navigate(['/edit']);
        } else {
            alert('Please select game size first!');
        }
    }
    setCTFGame() {
        if (this.isGameSmall || this.isGameMedium || this.isGameLarge) {
            this.dialogRef.closeAll();
            this.router.navigate(['/edit']);
        } else {
            alert('Please select game size first!');
        }
    }
    // changer pr que setGame il update un bool et que qd un truc et cliquer il reste highlight et apr confirm change de page
    // CTF mettre unavaible chek dn document cquon doit faire
}
