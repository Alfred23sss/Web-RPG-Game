import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ChatComponent } from '@app/components/chat/chat.component';
import { ACCESS_CODE_MIN_VALUE, ACCESS_CODE_RANGE } from '@app/constants/global.constants';
import { Routes } from '@app/enums/global.enums';
import { AccessCodesCommunicationService } from '@app/services/access-codes-communication/access-codes-communication.service';
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
        private accessCodeservice: AccessCodesCommunicationService,
    ) {}

    ngOnInit(): void {
        this.generateAccessCode();
        this.socketClientService.createRoom(this.accessCode);
        // eslint-disable-next-line @typescript-eslint/no-magic-numbers
        this.createAccessCode();
    }

    navigateToHome(): void {
        this.router.navigate([Routes.CreatePage]);
    }

    private createAccessCode(): void {
        this.accessCodeservice.createAccessCode(this.accessCode).subscribe({
            next: (response) => {
                console.log('Access code created:', response.code);
                this.socketClientService.createRoom(this.accessCode); // Join room after creation
            },
            error: (err) => {
                console.error('Error creating access code:', err);
            },
        });
    }

    private generateAccessCode(): void {
        this.accessCode = Math.floor(ACCESS_CODE_MIN_VALUE + Math.random() * ACCESS_CODE_RANGE).toString();
    }
}
