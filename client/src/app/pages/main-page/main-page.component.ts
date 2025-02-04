import { HttpErrorResponse } from '@angular/common/http';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { GameDecorations } from '@app/interfaces/images';
import { CommunicationService } from '@app/services/communication/communication.service';
import { Message } from '@common/message';
import { BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';

@Component({
    selector: 'app-main-page',
    templateUrl: './main-page.component.html',
    styleUrls: ['./main-page.component.scss'],
    imports: [RouterLink],
})
export class MainPageComponent {
    readonly title: string = 'Game Name...';
    message: BehaviorSubject<string> = new BehaviorSubject<string>('');
    gameDecorations = GameDecorations;
    constructor(private readonly communicationService: CommunicationService) {}

    sendTimeToServer(): void {
        const newTimeMessage: Message = {
            title: 'Hello from the client',
            body: 'Time is : ' + new Date().toString(),
        };
        // It is important not to forget "subscribe," or the call will never be made since no one is observing it
        this.communicationService.basicPost(newTimeMessage).subscribe({
            next: (response) => {
                const responseString = `The server received the request and returned a code ${response.status} : ${response.statusText}`;
                this.message.next(responseString);
            },
            error: (err: HttpErrorResponse) => {
                const responseString = `The server is not responding and returned: ${err.message}`;
                this.message.next(responseString);
            },
        });
    }

    getMessagesFromServer(): void {
        this.communicationService
            .basicGet()
            // This step transforms the Message object into a single string
            .pipe(
                map((message: Message) => {
                    return `${message.title} ${message.body}`;
                }),
            )
            .subscribe(this.message);
    }
}
