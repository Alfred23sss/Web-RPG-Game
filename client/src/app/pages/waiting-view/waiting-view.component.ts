import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ChatComponent } from '@app/components/chat/chat.component';
import { ACCESS_CODE_MIN_VALUE, ACCESS_CODE_RANGE } from '@app/constants/global.constants';
import { Routes } from '@app/enums/global.enums';
import { SocketClientService } from '@app/services/socket/socket-client-service';

@Component({
    selector: 'app-waiting-view',
    templateUrl: './waiting-view.component.html',
    styleUrls: ['./waiting-view.component.scss'],
    imports: [ChatComponent],
})
export class WaitingViewComponent implements OnInit {
    accessCode: string;
    constructor(
        private router: Router,
        private readonly socketClientService: SocketClientService,
    ) {}

    ngOnInit(): void {
        this.generateAccessCode();
        this.socketClientService.createRoom(this.accessCode);
    }

    navigateToHome(): void {
        this.router.navigate([Routes.CreatePage]);
    }

    private generateAccessCode(): void {
        this.accessCode = Math.floor(ACCESS_CODE_MIN_VALUE + Math.random() * ACCESS_CODE_RANGE).toString();
    }
}
