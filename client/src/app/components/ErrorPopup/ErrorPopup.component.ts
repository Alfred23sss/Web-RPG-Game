import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
    selector: 'app-error-popup',
    templateUrl: './ErrorPopup.component.html',
    styleUrls: ['./ErrorPopup.component.scss']
})
export class ErrorPopupComponent {
    @Input() message: string = ''; // Message du popup
    @Input() show: boolean = false; // Contrôle l'affichage du popup
    @Output() close = new EventEmitter<void>(); // Événement pour fermer le popup

    closePopup() {
        this.close.emit(); // Émet un événement pour notifier le parent
    }
}
