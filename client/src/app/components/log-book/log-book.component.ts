import { Component, OnDestroy, OnInit } from '@angular/core';
import { ClientNotifierServices } from '@app/services/client-notifier/client-notifier.service';
import { Subscription } from 'rxjs';

@Component({
    selector: 'app-log-book',
    templateUrl: './log-book.component.html',
    styleUrl: './log-book.component.scss',
})
export class LogBookComponent implements OnInit, OnDestroy {
    logs: string[] = [];
    private logSubscription!: Subscription;

    constructor(private clientNotifier: ClientNotifierServices) {}

    ngOnInit(): void {
        this.logs = this.clientNotifier.logBook;
        this.logSubscription = this.clientNotifier.logBookUpdated.subscribe((logs: string[]) => {
            this.logs = logs;
        });
    }

    ngOnDestroy(): void {
        this.logSubscription.unsubscribe();
    }
}
