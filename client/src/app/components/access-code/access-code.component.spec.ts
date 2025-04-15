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
        testErrorHandler = new TestErrorHandler();

        await TestBed.configureTestingModule({
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

    it('closeDialog doit appeler dialogRef.close', () => {
        component.closeDialog();
        expect(dialogRefSpy.close).toHaveBeenCalled();
    });

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
            accessCodeServiceSpy.getLobbyData.and.returnValue(Promise.resolve(null as unknown as Lobby));
            component.accessCode = 'SOME_CODE';
            /* eslint-disable-next-line @typescript-eslint/no-explicit-any */ // to access private component
            await expectAsync((component as any).fetchLobbyData()).toBeRejectedWithError('Impossible de récupérer la partie.');

            accessCodeServiceSpy.getLobbyData.and.returnValue(Promise.resolve({ isLocked: false } as unknown as Lobby));
            /* eslint-disable-next-line @typescript-eslint/no-explicit-any */ // to access private component
            await expectAsync((component as any).fetchLobbyData()).toBeRejectedWithError('Impossible de récupérer la partie.');
        });
    });

    describe('validateNumericInput', () => {
        it('should prevent default for non-numeric input', () => {
            const event = {
                key: 'a',
                preventDefault: jasmine.createSpy('preventDefault'),
            } as unknown as KeyboardEvent;

            component.validateNumericInput(event);
            expect(event.preventDefault).toHaveBeenCalled();
        });

        it('should not prevent default for numeric input (0-9)', () => {
            const event = {
                key: '5',
                preventDefault: jasmine.createSpy('preventDefault'),
            } as unknown as KeyboardEvent;

            component.validateNumericInput(event);
            expect(event.preventDefault).not.toHaveBeenCalled();
        });

        it('should prevent default for special keys', () => {
            const event = {
                key: 'Enter',
                preventDefault: jasmine.createSpy('preventDefault'),
            } as unknown as KeyboardEvent;

            component.validateNumericInput(event);
            expect(event.preventDefault).toHaveBeenCalled();
        });

        it('should prevent default for empty key', () => {
            const event = {
                key: '',
                preventDefault: jasmine.createSpy('preventDefault'),
            } as unknown as KeyboardEvent;

            component.validateNumericInput(event);
            expect(event.preventDefault).toHaveBeenCalled();
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
            tick();
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

        it('should display a default error message when the error has no message', fakeAsync(() => {
            accessCodesCommunicationServiceSpy.validateAccessCode.and.returnValue(of({ isValid: true }));
            const validLobby = { isLocked: false, game: {} } as unknown as Lobby;
            accessCodeServiceSpy.getLobbyData.and.returnValue(Promise.resolve(validLobby));

            dialogSpy.open.and.callFake(() => {
                // eslint-disable-next-line no-throw-literal, @typescript-eslint/no-throw-literal
                throw {};
            });

            component.submitCode();
            tick();

            expect(snackbarServiceSpy.showMessage).toHaveBeenCalledWith("Une erreur s'est produite.");
        }));
    });
});
