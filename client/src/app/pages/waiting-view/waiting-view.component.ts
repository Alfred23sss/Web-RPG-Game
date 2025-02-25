import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ChatComponent } from '@app/components/chat/chat.component';
import { Routes } from '@app/enums/global.enums';
import { RoomValidationService } from '@app/services/room-validation/room-validation.service';
import { SocketClientService } from '@app/services/socket/socket-client-service';

@Component({
    selector: 'app-waiting-view',
    templateUrl: './waiting-view.component.html',
    styleUrls: ['./waiting-view.component.scss'],
    imports: [ChatComponent],
})
export class WaitingViewComponent implements OnInit {
    accessCode: string = '1111';
    constructor(
        private router: Router,
        private readonly socketClientService: SocketClientService,
        private readonly roomValidationService: RoomValidationService,
    ) {}

    ngOnInit(): void {
        this.socketClientService.createRoom(this.accessCode);
        // eslint-disable-next-line @typescript-eslint/no-magic-numbers
        this.accessCode = this.roomValidationService.currentAccessCode;
    }

    navigateToHome(): void {
        this.router.navigate([Routes.CreatePage]);
    }
}
