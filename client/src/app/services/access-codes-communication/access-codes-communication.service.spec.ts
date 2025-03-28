import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AccessCodesCommunicationService } from './access-codes-communication.service';

describe('AccessCodesCommunicationService', () => {
    let service: AccessCodesCommunicationService;
    let httpMock: HttpTestingController;
    const apiUrl = 'http://localhost:3000/api/accessCodes';

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [AccessCodesCommunicationService, HttpClientTestingModule],
        });

        service = TestBed.inject(AccessCodesCommunicationService);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        httpMock.verify();
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should generate an access code', () => {
        const mockAccessCode = 'ABC123';

        service.generateAccessCode().subscribe((code) => {
            expect(code).toEqual(mockAccessCode);
        });

        const req = httpMock.expectOne(apiUrl);
        expect(req.request.method).toBe('POST');
        req.flush(mockAccessCode);
    });

    it('should validate an access code', () => {
        const code = 'ABC123';
        const mockResponse = { isValid: true };

        service.validateAccessCode(code).subscribe((response) => {
            expect(response).toEqual(mockResponse);
        });

        const req = httpMock.expectOne(`${apiUrl}/${code}/validate`);
        expect(req.request.method).toBe('GET');
        req.flush(mockResponse);
    });

    it('should remove an access code', () => {
        const code = 'ABC123';

        service.removeAccessCode(code).subscribe((response) => {
            expect(response).toBeNull();
        });

        const req = httpMock.expectOne(`${apiUrl}/${code}`);
        expect(req.request.method).toBe('DELETE');
        req.flush(null);
    });
});
