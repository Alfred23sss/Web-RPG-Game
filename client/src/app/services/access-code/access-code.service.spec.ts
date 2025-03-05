import { TestBed } from '@angular/core/testing';
// eslint-disable-next-line import/no-deprecated
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { AccessCodeService } from './access-code.service';
import { SocketClientService } from '@app/services/socket/socket-client-service';

describe('AccessCodeService', () => {
    let service: AccessCodeService;

    beforeEach(() => {
        TestBed.configureTestingModule({
            // eslint-disable-next-line import/no-deprecated
            imports: [HttpClientTestingModule],
            providers: [SocketClientService],
        });
        service = TestBed.inject(AccessCodeService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });
});
