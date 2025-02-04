import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SNACKBAR_CONFIG } from '../../constants/global.constants';
import { SnackbarService } from './snackbar.service';

describe('SnackbarService', () => {
    let service: SnackbarService;
    let snackBarSpy: jasmine.SpyObj<MatSnackBar>;

    beforeEach(() => {
        const spy = jasmine.createSpyObj('MatSnackBar', ['open']);

        TestBed.configureTestingModule({
            providers: [SnackbarService, { provide: MatSnackBar, useValue: spy }],
        });

        service = TestBed.inject(SnackbarService);
        snackBarSpy = TestBed.inject(MatSnackBar) as jasmine.SpyObj<MatSnackBar>;
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should call MatSnackBar.open with default parameters', () => {
        const message = 'Default Message';

        service.showMessage(message);

        expect(snackBarSpy.open).toHaveBeenCalledWith(message, SNACKBAR_CONFIG.ACTION, { duration: SNACKBAR_CONFIG.DURATION });
    });
});
