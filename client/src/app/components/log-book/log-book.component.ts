import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ClientNotifierServices } from '@app/services/client-notifier/client-notifier.service';
import { Subscription } from 'rxjs';

@Component({
    selector: 'app-log-book',
    templateUrl: './log-book.component.html',
    styleUrls: ['./log-book.component.scss'],
})
export class LogBookComponent implements OnInit, OnDestroy, AfterViewInit {
    @Input() playerName: string = '';
    @ViewChild('logContainer') logContainerRef!: ElementRef;
    logs: string[] = [];
    filteredLogs: string[] = [];
    filterByPlayer: boolean = false;

    private logSubscription!: Subscription;

    constructor(
        private clientNotifier: ClientNotifierServices,
        private cdr: ChangeDetectorRef,
    ) {}

    ngOnInit(): void {
        this.logs = this.clientNotifier.logBook;
        this.updateFilteredLogs();

        this.logSubscription = this.clientNotifier.logBookUpdated.subscribe((logs: string[]) => {
            this.logs = logs;
            this.updateFilteredLogs();
            this.cdr.detectChanges();
            this.scrollToBottom();
        });
    }

    ngAfterViewInit(): void {
        this.scrollToBottom();
    }

    toggleFilter(): void {
        this.filterByPlayer = !this.filterByPlayer;
        this.updateFilteredLogs();
        this.cdr.detectChanges();
        this.scrollToBottom();
    }

    updateFilteredLogs(): void {
        if (this.filterByPlayer && this.playerName) {
            this.filteredLogs = this.logs.filter((log) => {
                const match = log.match(/\(Joueurs impliqués\s*:\s*(.*?)\)/i);

                if (match && match[1]) {
                    const playersList = match[1].split(',').map((name) => name.trim().toLowerCase());
                    return playersList.includes(this.playerName.toLowerCase());
                }
                return false;
            });
        } else {
            this.filteredLogs = this.logs;
        }
    }

    scrollToBottom(): void {
        setTimeout(() => {
            if (this.logContainerRef?.nativeElement) {
                const container = this.logContainerRef.nativeElement;
                container.scrollTop = container.scrollHeight;
            }
        }, 0);
    }

    ngOnDestroy(): void {
        this.logSubscription.unsubscribe();
    }
}
