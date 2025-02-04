import { Component, OnInit } from '@angular/core';
import { ACCESS_CODE_MIN_VALUE, ACCESS_CODE_RANGE } from '@app/global.constants';
@Component({
    selector: 'app-waiting-view',
    templateUrl: './waiting-view.component.html',
    styleUrls: ['./waiting-view.component.scss'],
})
export class WaitingViewComponent implements OnInit {
    accessCode: string;

    ngOnInit(): void {
        this.generateAccessCode();
    }

    private generateAccessCode(): void {
        this.accessCode = Math.floor(ACCESS_CODE_MIN_VALUE + Math.random() * ACCESS_CODE_RANGE).toString();
    }
}
