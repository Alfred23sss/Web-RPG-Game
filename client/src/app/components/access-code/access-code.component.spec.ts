// import { HttpClientTestingModule } from '@angular/common/http/testing';
// import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
// import { MatDialog, MatDialogRef } from '@angular/material/dialog';
// import { CharacterFormComponent } from '@app/components/character-form/character-form.component';
// import { Game } from '@app/interfaces/game';
// import { Lobby } from '@app/interfaces/lobby';
// import { AccessCodeService } from '@app/services/access-code/access-code.service';
// import { AccessCodesCommunicationService } from '@app/services/access-codes-communication/access-codes-communication.service';
// import { SnackbarService } from '@app/services/snackbar/snackbar.service';
// import { of, throwError } from 'rxjs';
// import { AccessCodeComponent } from './access-code.component';

// describe('AccessCodeComponent', () => {
//     let component: AccessCodeComponent;
//     let fixture: ComponentFixture<AccessCodeComponent>;
//     let mockDialogRef: jasmine.SpyObj<MatDialogRef<AccessCodeComponent>>;
//     let mockDialog: jasmine.SpyObj<MatDialog>;
//     let mockAccessCodesService: jasmine.SpyObj<AccessCodesCommunicationService>;
//     let mockSnackbar: jasmine.SpyObj<SnackbarService>;
//     let mockAccessCodeService: jasmine.SpyObj<AccessCodeService>;

//     const mockLobby: Lobby = {
//         isLocked: false,
//         accessCode: 'TEST123',
//         game: {} as Game,
//         players: [],
//         maxPlayers: 4,
//     };

//     beforeEach(async () => {
//         mockDialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);
//         mockDialog = jasmine.createSpyObj('MatDialog', ['open']);
//         mockAccessCodesService = jasmine.createSpyObj('AccessCodesCommunicationService', ['validateAccessCode', 'getAllAccessCodes']);
//         mockSnackbar = jasmine.createSpyObj('SnackbarService', ['showMessage']);
//         mockAccessCodeService = jasmine.createSpyObj('AccessCodeService', ['getLobbyData']);

//         await TestBed.configureTestingModule({
//             imports: [AccessCodeComponent, HttpClientTestingModule],
//             providers: [
//                 { provide: MatDialogRef, useValue: mockDialogRef },
//                 { provide: MatDialog, useValue: mockDialog },
//                 { provide: AccessCodesCommunicationService, useValue: mockAccessCodesService },
//                 { provide: SnackbarService, useValue: mockSnackbar },
//                 { provide: AccessCodeService, useValue: mockAccessCodeService },
//             ],
//         }).compileComponents();

//         fixture = TestBed.createComponent(AccessCodeComponent);
//         component = fixture.componentInstance;

//         mockAccessCodesService.getAllAccessCodes.and.returnValue(of(['TEST123', 'OTHER456']));
//         fixture.detectChanges();
//     });

//     it('should create component and initialize access codes', () => {
//         expect(component).toBeTruthy();
//         expect(mockAccessCodesService.getAllAccessCodes).toHaveBeenCalled();
//         expect(component.accessCodes).toEqual(['TEST123', 'OTHER456']);
//     });

//     it('should close dialog when closeDialog() is called', () => {
//         component.closeDialog();
//         expect(mockDialogRef.close).toHaveBeenCalled();
//     });

//     it('should handle valid access code submission successfully', fakeAsync(() => {
//         mockAccessCodesService.validateAccessCode.and.returnValue(of({ isValid: true }));
//         mockAccessCodeService.getLobbyData.and.returnValue(Promise.resolve(mockLobby));

//         component.accessCode = 'TEST123';
//         component.submitCode();
//         tick();

//         expect(mockDialog.open).toHaveBeenCalledWith(CharacterFormComponent, {
//             data: {
//                 accessCode: 'TEST123',
//                 isLobbyCreated: true,
//                 game: mockLobby.game,
//             },
//         });
//         expect(mockSnackbar.showMessage).not.toHaveBeenCalled();
//     }));

//     it('should show error for locked lobby', fakeAsync(() => {
//         const lockedLobby = { ...mockLobby, isLocked: true };
//         mockAccessCodesService.validateAccessCode.and.returnValue(of({ isValid: true }));
//         mockAccessCodeService.getLobbyData.and.returnValue(Promise.resolve(lockedLobby));

//         component.accessCode = 'LOCKED';
//         component.submitCode();
//         tick();

//         expect(mockSnackbar.showMessage).toHaveBeenCalledWith('Le lobby est verrouillé et ne peut pas être rejoint.');
//     }));

//     it('should handle invalid access code validation', fakeAsync(() => {
//         mockAccessCodesService.validateAccessCode.and.returnValue(of({ isValid: false }));

//         component.accessCode = 'INVALID';
//         component.submitCode();
//         tick();

//         expect(mockSnackbar.showMessage).toHaveBeenCalledWith("La partie que vous souhaitez rejoindre n'existe pas!");
//     }));

//     it('should handle validation errors', fakeAsync(() => {
//         mockAccessCodesService.validateAccessCode.and.returnValue(throwError(() => new Error('Validation error')));

//         component.accessCode = 'ERROR';
//         component.submitCode();
//         tick();

//         expect(mockSnackbar.showMessage).toHaveBeenCalledWith('Validation error');
//     }));

//     it('should handle missing game in lobby data', fakeAsync(() => {
//         const invalidLobby = { ...mockLobby, game: null };
//         mockAccessCodesService.validateAccessCode.and.returnValue(of({ isValid: true }));
//         mockAccessCodeService.getLobbyData.and.returnValue(Promise.resolve(invalidLobby));

//         component.accessCode = 'NOGAME';
//         component.submitCode();
//         tick();

//         expect(mockSnackbar.showMessage).toHaveBeenCalledWith('Impossible de récupérer la partie.');
//     }));

//     it('should handle lobby fetch errors', fakeAsync(() => {
//         mockAccessCodesService.validateAccessCode.and.returnValue(of({ isValid: true }));
//         mockAccessCodeService.getLobbyData.and.returnValue(Promise.reject(new Error('Fetch error')));

//         component.accessCode = 'FETCHERR';
//         component.submitCode();
//         tick();

//         expect(mockSnackbar.showMessage).toHaveBeenCalledWith('Fetch error');
//     }));

//     it('should handle empty access code submission', fakeAsync(() => {
//         component.accessCode = '';
//         component.submitCode();
//         tick();

//         expect(mockSnackbar.showMessage).toHaveBeenCalledWith("La partie que vous souhaitez rejoindre n'existe pas!");
//     }));
// });
