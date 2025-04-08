import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { RouterLink } from '@angular/router';
import { AccessCodeComponent } from '@app/components/access-code/access-code.component';
import { GameDecorations } from '@app/enums/global.enums';
import { ClientNotifierServices } from '@app/services/client-notifier/client-notifier.service';

@Component({
    selector: 'app-main-page',
    templateUrl: './main-page.component.html',
    styleUrls: ['./main-page.component.scss'],
    imports: [RouterLink],
})
export class MainPageComponent implements OnInit {
    readonly title: string = "William's Wonderland";
    gameDecorations = GameDecorations;
    constructor(
        private dialogRef: MatDialog,
        private clientNotifier: ClientNotifierServices,
    ) {}

    ngOnInit(): void {
        this.clientNotifier.clearLogbook();
    }
    openDialog(): void {
        this.dialogRef.open(AccessCodeComponent);
    }
}
