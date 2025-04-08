import { DateService } from '@app/services/date/date.service';
import { Message } from '@common/message';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class ExampleService {
    private clientMessages: Message[];

    constructor(
        private readonly dateService: DateService,
        private readonly logger: Logger,
    ) {
        this.clientMessages = [];
    }
}
