// eslint-disable-next-line import/no-deprecated
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AccessCodesCommunicationService } from './access-codes-communication.service';

describe('AccessCodesCommunicationService', () => {
    let service: AccessCodesCommunicationService;
    let httpMock: HttpTestingController;
    const apiUrl = 'http://localhost:3000/api/accessCodes';

    beforeEach(() => {
        TestBed.configureTestingModule({
            // eslint-disable-next-line import/no-deprecated
            imports: [HttpClientTestingModule],
            providers: [AccessCodesCommunicationService],
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

    it('generateAccessCode should POST and return a string', () => {
        const expectedCode = 'ABC123';
        service.generateAccessCode().subscribe((code) => {
            expect(code).toEqual(expectedCode);
        });
        const req = httpMock.expectOne(apiUrl);
        expect(req.request.method).toBe('POST');
        req.flush(expectedCode);
    });

    it('validateAccessCode should GET and return an object with isValid', () => {
        const testCode = 'TESTCODE';
        const expectedResponse = { isValid: true };
        service.validateAccessCode(testCode).subscribe((response) => {
            expect(response).toEqual(expectedResponse);
        });
        const req = httpMock.expectOne(`${apiUrl}/${testCode}/validate`);
        expect(req.request.method).toBe('GET');
        req.flush(expectedResponse);
    });

    it('getAllAccessCodes should GET and return an array of strings', () => {
        const expectedCodes = ['ABC123', 'DEF456'];
        service.getAllAccessCodes().subscribe((codes) => {
            expect(codes).toEqual(expectedCodes);
        });
        const req = httpMock.expectOne(apiUrl);
        expect(req.request.method).toBe('GET');
        req.flush(expectedCodes);
    });

    it('removeAccessCode should DELETE and return void', () => {
        const codeToRemove = 'ABC123';
        service.removeAccessCode(codeToRemove).subscribe((response) => {
            expect(response).toBeNull();
        });
        const req = httpMock.expectOne(`${apiUrl}/${codeToRemove}`);
        expect(req.request.method).toBe('DELETE');
        req.flush(null);
    });
});
