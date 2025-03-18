import { ErrorHandler } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { CharacterFormComponent } from '@app/components/character-form/character-form.component';
import { Lobby } from '@app/interfaces/lobby';
import { AccessCodeService } from '@app/services/access-code/access-code.service';
import { AccessCodesCommunicationService } from '@app/services/access-codes-communication/access-codes-communication.service';
import { SnackbarService } from '@app/services/snackbar/snackbar.service';
import { of } from 'rxjs';
import { AccessCodeComponent } from './access-code.component';

class TestErrorHandler implements ErrorHandler {
    capturedError: unknown = null;
    handleError(error: unknown): void {
        this.capturedError = error;
    }
}

describe('AccessCodeComponent', () => {
    let component: AccessCodeComponent;
    let fixture: ComponentFixture<AccessCodeComponent>;
    let dialogRefSpy: jasmine.SpyObj<MatDialogRef<AccessCodeComponent>>;
    let dialogSpy: jasmine.SpyObj<MatDialog>;
    let accessCodesCommunicationServiceSpy: jasmine.SpyObj<AccessCodesCommunicationService>;
    let snackbarServiceSpy: jasmine.SpyObj<SnackbarService>;
    let accessCodeServiceSpy: jasmine.SpyObj<AccessCodeService>;
    let testErrorHandler: TestErrorHandler;

    beforeEach(async () => {
        dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);
        dialogSpy = jasmine.createSpyObj('MatDialog', ['open']);
        accessCodesCommunicationServiceSpy = jasmine.createSpyObj('AccessCodesCommunicationService', ['getAllAccessCodes', 'validateAccessCode']);
        snackbarServiceSpy = jasmine.createSpyObj('SnackbarService', ['showMessage']);
        accessCodeServiceSpy = jasmine.createSpyObj('AccessCodeService', ['getLobbyData']);

        // accessCodesCommunicationServiceSpy.getAllAccessCodes.and.returnValue(of(['code1', 'code2']));
        testErrorHandler = new TestErrorHandler();

        await TestBed.configureTestingModule({
            // Comme le composant est standalone et importe FormsModule, on peut l'importer directement
            imports: [AccessCodeComponent],
            providers: [
                { provide: MatDialogRef, useValue: dialogRefSpy },
                { provide: MatDialog, useValue: dialogSpy },
                { provide: AccessCodesCommunicationService, useValue: accessCodesCommunicationServiceSpy },
                { provide: SnackbarService, useValue: snackbarServiceSpy },
                { provide: AccessCodeService, useValue: accessCodeServiceSpy },
                { provide: ErrorHandler, useValue: testErrorHandler },
            ],
        }).compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(AccessCodeComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('devrait créer le composant', () => {
        expect(component).toBeTruthy();
    });

    // it('doit s’abonner à getAllAccessCodes dans le constructeur et assigner accessCodes', () => {
    //     expect(component.accessCodes).toEqual(['code1', 'code2']);
    // });

    it('closeDialog doit appeler dialogRef.close', () => {
        component.closeDialog();
        expect(dialogRefSpy.close).toHaveBeenCalled();
    });

    // it('devrait capturer une erreur dans le constructeur si getAllAccessCodes échoue', fakeAsync(() => {
    //     // Simuler une erreur lors de l'appel à getAllAccessCodes
    //     accessCodesCommunicationServiceSpy.getAllAccessCodes.and.returnValue(throwError(() => new Error('Error fetching access codes')));

    //     try {
    //         TestBed.createComponent(AccessCodeComponent);
    //         tick();
    //         fail('Le constructeur aurait dû lever une erreur');
    //     } catch (error: any) {
    //         expect(error).toBeTruthy();
    //         expect(error.message).toEqual('Error fetching access codes');
    //     }
    // }));

    describe('validateAccessCode', () => {
        it('doit résoudre si le code d’accès est valide', async () => {
            accessCodesCommunicationServiceSpy.validateAccessCode.and.returnValue(of({ isValid: true }));
            component.accessCode = 'VALID';

            /* eslint-disable-next-line @typescript-eslint/no-explicit-any */ // to access private component
            await expectAsync((component as any).validateAccessCode()).toBeResolved();
        });

        it('doit rejeter si le code d’accès est invalide', async () => {
            accessCodesCommunicationServiceSpy.validateAccessCode.and.returnValue(of({ isValid: false }));
            component.accessCode = 'INVALID';
            /* eslint-disable-next-line @typescript-eslint/no-explicit-any */ // to access private component
            await expectAsync((component as any).validateAccessCode()).toBeRejectedWithError("La partie que vous souhaitez rejoindre n'existe pas!");
        });
    });

    describe('fetchLobbyData', () => {
        it('doit renvoyer les données du lobby si le lobby est valide', async () => {
            /* eslint-disable-next-line @typescript-eslint/no-explicit-any */ // for partial object mocking
            const lobby = { isLocked: false, game: 'gameData' } as any;
            accessCodeServiceSpy.getLobbyData.and.returnValue(Promise.resolve(lobby));
            component.accessCode = 'SOME_CODE';
            /* eslint-disable-next-line @typescript-eslint/no-explicit-any */ // to access private component
            const result = await (component as any).fetchLobbyData();
            expect(result).toEqual(lobby);
        });

        it('doit lancer une erreur si le lobby est nul ou si la propriété game est absente', async () => {
            // Cas où lobby est null
            accessCodeServiceSpy.getLobbyData.and.returnValue(Promise.resolve(null as unknown as Lobby));
            component.accessCode = 'SOME_CODE';
            /* eslint-disable-next-line @typescript-eslint/no-explicit-any */ // to access private component
            await expectAsync((component as any).fetchLobbyData()).toBeRejectedWithError('Impossible de récupérer la partie.');

            // Cas où lobby ne possède pas la propriété game
            accessCodeServiceSpy.getLobbyData.and.returnValue(Promise.resolve({ isLocked: false } as unknown as Lobby));
            /* eslint-disable-next-line @typescript-eslint/no-explicit-any */ // to access private component
            await expectAsync((component as any).fetchLobbyData()).toBeRejectedWithError('Impossible de récupérer la partie.');
        });
    });

    describe('isLobbyLocked', () => {
        it('doit retourner true si le lobby est verrouillé', () => {
            /* eslint-disable-next-line @typescript-eslint/no-explicit-any */ // for partial object mocking
            const lobby = { isLocked: true } as any;
            /* eslint-disable-next-line @typescript-eslint/no-explicit-any */ // to access private component
            expect((component as any).isLobbyLocked(lobby)).toBeTrue();
        });

        it('doit retourner false si le lobby n’est pas verrouillé', () => {
            /* eslint-disable-next-line @typescript-eslint/no-explicit-any */ // for partial object mocking
            const lobby = { isLocked: false } as any;
            /* eslint-disable-next-line @typescript-eslint/no-explicit-any */ // to access private component
            expect((component as any).isLobbyLocked(lobby)).toBeFalse();
        });
    });

    describe('openCharacterForm', () => {
        it('doit fermer le dialogue et ouvrir le formulaire de personnage avec les données correctes', () => {
            const lobby = { isLocked: false, game: 'gameData' } as unknown;
            component.accessCode = 'ACCESS';
            component.isLobbyCreated = true;
            /* eslint-disable-next-line @typescript-eslint/no-explicit-any */ // to access private component
            (component as any).openCharacterForm(lobby);
            expect(dialogRefSpy.close).toHaveBeenCalled();
            expect(dialogSpy.open).toHaveBeenCalledWith(CharacterFormComponent, {
                data: {
                    accessCode: 'ACCESS',
                    isLobbyCreated: true,
                    game: 'gameData',
                },
            });
        });
    });

    describe('submitCode', () => {
        it('doit afficher un message si le lobby est verrouillé', fakeAsync(() => {
            component.accessCode = 'CODE';
            accessCodesCommunicationServiceSpy.validateAccessCode.and.returnValue(of({ isValid: true }));
            /* eslint-disable-next-line @typescript-eslint/no-explicit-any */ // for partial object mocking
            const lobby = { isLocked: true, game: 'gameData' } as any;
            accessCodeServiceSpy.getLobbyData.and.returnValue(Promise.resolve(lobby));

            component.submitCode();
            tick(); // Simule l’attente des promesses
            expect(snackbarServiceSpy.showMessage).toHaveBeenCalledWith('Le lobby est verrouillé et ne peut pas être rejoint.');
        }));

        it('doit ouvrir le formulaire de personnage si le lobby n’est pas verrouillé', fakeAsync(() => {
            component.accessCode = 'CODE';
            accessCodesCommunicationServiceSpy.validateAccessCode.and.returnValue(of({ isValid: true }));
            /* eslint-disable-next-line @typescript-eslint/no-explicit-any */ // for partial object mocking
            const lobby = { isLocked: false, game: 'gameData' } as any;
            accessCodeServiceSpy.getLobbyData.and.returnValue(Promise.resolve(lobby));
            /* eslint-disable-next-line @typescript-eslint/no-explicit-any */ // to access private component
            spyOn(component as any, 'openCharacterForm').and.callThrough();

            component.submitCode();
            tick();
            /* eslint-disable-next-line @typescript-eslint/no-explicit-any */ // to access private component
            expect((component as any).openCharacterForm).toHaveBeenCalledWith(lobby);
        }));

        it('doit afficher un message d’erreur lorsque validateAccessCode échoue', fakeAsync(() => {
            component.accessCode = 'CODE';
            accessCodesCommunicationServiceSpy.validateAccessCode.and.returnValue(of({ isValid: false }));

            component.submitCode();
            tick();
            expect(snackbarServiceSpy.showMessage).toHaveBeenCalledWith("La partie que vous souhaitez rejoindre n'existe pas!");
        }));

        it('doit afficher un message d’erreur lorsque fetchLobbyData lance une erreur', fakeAsync(() => {
            component.accessCode = 'CODE';
            accessCodesCommunicationServiceSpy.validateAccessCode.and.returnValue(of({ isValid: true }));
            accessCodeServiceSpy.getLobbyData.and.returnValue(Promise.resolve(null as unknown as Lobby));

            component.submitCode();
            tick();
            expect(snackbarServiceSpy.showMessage).toHaveBeenCalledWith('Impossible de récupérer la partie.');
        }));
    });
});
