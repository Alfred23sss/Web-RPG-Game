import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ACCESS_CODE_MIN_VALUE, ACCESS_CODE_RANGE } from '@app/constants/global.constants';
import { Route } from '@app/enums/global.enums';

@Component({
    selector: 'app-waiting-view',
    templateUrl: './waiting-view.component.html',
    styleUrls: ['./waiting-view.component.scss'],
})
export class WaitingViewComponent implements OnInit {
    accessCode: string;
    constructor(private router: Router) {}

    ngOnInit(): void {
        this.generateAccessCode();
    }

    navigateToHome() {
        this.router.navigate([Route.CreatePage]);
    }

    private generateAccessCode(): void {
        this.accessCode = Math.floor(ACCESS_CODE_MIN_VALUE + Math.random() * ACCESS_CODE_RANGE).toString();
    }
}
