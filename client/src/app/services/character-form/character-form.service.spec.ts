import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { ATTRIBUTE_TYPES, DICE_TYPES, ERROR_MESSAGES, HTTP_STATUS, INITIAL_VALUES, ROUTES } from '@app/constants/global.constants';
import { Game } from '@app/interfaces/game';
import { GameCommunicationService } from '@app/services/game-communication/game-communication.service';
import { SnackbarService } from '@app/services/snackbar/snackbar.service';
import { of, throwError } from 'rxjs';
import { CharacterService } from './character-form.service';

const DEFAULT_ATTRIBUTE_VALUE = 4;
const BONUS_ATTRIBUTE_VALUE = 6;

describe('CharacterService', () => {
    let service: CharacterService;
    let mockRouter: jasmine.SpyObj<Router>;
    let mockCommunicationService: jasmine.SpyObj<GameCommunicationService>;
    let mockSnackbarService: jasmine.SpyObj<SnackbarService>;

    beforeEach(() => {
        mockRouter = jasmine.createSpyObj('Router', ['navigate']);
        mockCommunicationService = jasmine.createSpyObj('GameCommunicationService', ['getGameById']);
        mockSnackbarService = jasmine.createSpyObj('SnackbarService', ['showMessage']);

        TestBed.configureTestingModule({
            providers: [
                CharacterService,
                { provide: Router, useValue: mockRouter },
                { provide: GameCommunicationService, useValue: mockCommunicationService },
                { provide: SnackbarService, useValue: mockSnackbarService },
            ],
        });

        service = TestBed.inject(CharacterService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should initialize attributes correctly', () => {
        expect(service.attributes).toEqual(INITIAL_VALUES.attributes);
    });

    describe('assignBonus', () => {
        it('should assign a bonus to the selected attribute', () => {
            service.assignBonus(ATTRIBUTE_TYPES.vitality);
            expect(service.bonusAssigned[ATTRIBUTE_TYPES.vitality]).toBeTrue();
            expect(service.attributes[ATTRIBUTE_TYPES.vitality]).toBe(BONUS_ATTRIBUTE_VALUE);
        });

        it('should reset other attributes when a bonus is assigned', () => {
            service.assignBonus(ATTRIBUTE_TYPES.vitality);
            expect(service.bonusAssigned[ATTRIBUTE_TYPES.speed]).toBeFalse();
            expect(service.attributes[ATTRIBUTE_TYPES.speed]).toBe(DEFAULT_ATTRIBUTE_VALUE);

            service.assignBonus(ATTRIBUTE_TYPES.speed);
            expect(service.bonusAssigned[ATTRIBUTE_TYPES.vitality]).toBeFalse();
            expect(service.attributes[ATTRIBUTE_TYPES.vitality]).toBe(DEFAULT_ATTRIBUTE_VALUE);
        });
    });

    describe('assignDice', () => {
        beforeEach(() => {
            service.resetAttributes();
        });

        it('should assign attack to D6 and defense to D4 when attack is selected', () => {
            const obj = service.assignDice(ATTRIBUTE_TYPES.attack);
            expect(service.diceAssigned[ATTRIBUTE_TYPES.attack]).toBeTrue();
            expect(service.diceAssigned[ATTRIBUTE_TYPES.defense]).toBeFalse();
            expect(obj.attack).toBe(DICE_TYPES.d6);
            expect(obj.defense).toBe(DICE_TYPES.d4);
        });

        it('should assign defense to D6 and attack to D4 when defense is selected', () => {
            const obj = service.assignDice(ATTRIBUTE_TYPES.defense);
            expect(service.diceAssigned[ATTRIBUTE_TYPES.attack]).toBeFalse();
            expect(service.diceAssigned[ATTRIBUTE_TYPES.defense]).toBeTrue();
            expect(obj.attack).toBe(DICE_TYPES.d4);
            expect(obj.defense).toBe(DICE_TYPES.d6);
        });

        it('should reassign dice when switching from attack to defense', () => {
            service.assignDice(ATTRIBUTE_TYPES.attack);
            expect(service.diceAssigned[ATTRIBUTE_TYPES.attack]).toBeTrue();
            expect(service.diceAssigned[ATTRIBUTE_TYPES.defense]).toBeFalse();

            const obj = service.assignDice(ATTRIBUTE_TYPES.defense);
            expect(service.diceAssigned[ATTRIBUTE_TYPES.attack]).toBeFalse();
            expect(service.diceAssigned[ATTRIBUTE_TYPES.defense]).toBeTrue();
            expect(obj.attack).toBe(DICE_TYPES.d4);
            expect(obj.defense).toBe(DICE_TYPES.d6);
        });
    });

    describe('validateGameAvailability', () => {
        let closePopupSpy: jasmine.Spy;

        beforeEach(() => {
            closePopupSpy = jasmine.createSpy();
        });

        it('should do nothing when game is available', () => {
            const mockGame: Game = {
                id: '1',
                name: 'Test Game',
                size: '4',
                mode: 'casual',
                lastModified: new Date(),
                isVisible: true,
                previewImage: 'image_url',
                description: 'This is a test game',
                grid: undefined,
            };

            mockCommunicationService.getGameById.and.returnValue(of(mockGame));

            service['validateGameAvailability'](mockGame, closePopupSpy);

            expect(mockCommunicationService.getGameById).toHaveBeenCalledWith('1');
            expect(closePopupSpy).not.toHaveBeenCalled();
            expect(mockRouter.navigate).not.toHaveBeenCalled();
        });

        it('should handle FORBIDDEN error and navigate to createView', () => {
            const mockGame: Game = {
                id: '1',
                name: 'Test Game',
                size: '4',
                mode: 'casual',
                lastModified: new Date(),
                isVisible: true,
                previewImage: 'image_url',
                description: 'This is a test game',
                grid: undefined,
            };

            mockCommunicationService.getGameById.and.returnValue(throwError(() => ({ status: HTTP_STATUS.forbidden })));
            service['validateGameAvailability'](mockGame, closePopupSpy);
            expect(mockCommunicationService.getGameById).toHaveBeenCalledWith('1');
            expect(mockSnackbarService.showMessage).toHaveBeenCalledWith(ERROR_MESSAGES.unavailableGame);
            expect(mockRouter.navigate).toHaveBeenCalledWith([ROUTES.createView]);
            expect(closePopupSpy).toHaveBeenCalled();
        });
    });

    describe('isCharacterValid', () => {
        it('should return true when all parameters are valid', () => {
            expect(service['isCharacterValid']('name', 'avatar.png', true, true)).toBeTrue();
        });
        it('should return false when at least one parameter is missing', () => {
            expect(service['isCharacterValid']('', 'avatar.png', true, true)).toBeFalse();
            expect(service['isCharacterValid']('name', '', true, true)).toBeFalse();
            expect(service['isCharacterValid']('name', 'avatar.png', false, true)).toBeFalse();
            expect(service['isCharacterValid']('name', 'avatar.png', true, false)).toBeFalse();
            expect(service['isCharacterValid']('', '', false, false)).toBeFalse();
        });
    });

    describe('proceedToWaitingView', () => {
        let closePopupSpy: jasmine.Spy;

        it('should navigate to waitingView', () => {
            closePopupSpy = jasmine.createSpy();
            service['proceedToWaitingView'](closePopupSpy);
            expect(mockRouter.navigate).toHaveBeenCalledWith([ROUTES.waitingView]);
            expect(closePopupSpy).toHaveBeenCalled();
        });

        it('should call closePopup', () => {
            closePopupSpy = jasmine.createSpy();
            service['proceedToWaitingView'](closePopupSpy);
            expect(closePopupSpy).toHaveBeenCalled();
        });
    });

    describe('showMissingDetailsError', () => {
        it('should call snackbarService.showMessage with missingCharacterDetails', () => {
            service['showMissingDetailsError']();

            expect(mockSnackbarService.showMessage).toHaveBeenCalledWith(ERROR_MESSAGES.missingCharacterDetails);
        });
    });

    describe('submitCharacter', () => {
        let closePopupSpy: jasmine.Spy;
        let mockGame: Game;

        beforeEach(() => {
            closePopupSpy = jasmine.createSpy('closePopup');
            mockGame = { id: '1', name: 'Test Game' } as Game;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            spyOn(service as any, 'validateGameAvailability').and.callFake(() => null);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            spyOn(service as any, 'proceedToWaitingView');
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            spyOn(service as any, 'showMissingDetailsError');
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            spyOn(service as any, 'isCharacterValid').and.returnValue(true);
        });

        it('should proceed to waiting view if character is valid', () => {
            service.submitCharacter({
                characterName: 'name',
                selectedAvatar: 'avatar.png',
                game: mockGame,
                isBonusAssigned: true,
                isDiceAssigned: true,
                closePopup: closePopupSpy,
            });

            expect(service['proceedToWaitingView']).toHaveBeenCalledWith(closePopupSpy);
            expect(service['showMissingDetailsError']).not.toHaveBeenCalled();
        });

        it('should show missing details error if character is invalid', () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (service as any).isCharacterValid.and.returnValue(false);

            service.submitCharacter({
                characterName: 'name',
                selectedAvatar: 'avatar.png',
                game: mockGame,
                isBonusAssigned: false,
                isDiceAssigned: false,
                closePopup: closePopupSpy,
            });

            expect(service['showMissingDetailsError']).toHaveBeenCalled();
            expect(service['proceedToWaitingView']).not.toHaveBeenCalled();
        });
    });

    describe('checkCharacterNameLength', () => {
        it('should not show a snackbar message when character name is within the valid length', () => {
            service.checkCharacterNameLength('ValidName');
            expect(mockSnackbarService.showMessage).not.toHaveBeenCalled();
        });

        it('should show a snackbar message when character name exceeds the max length', () => {
            service.checkCharacterNameLength('testWithaLongNameForCharacter');
            expect(mockSnackbarService.showMessage).toHaveBeenCalledWith('The maximum name length is 20 characters.');
        });
    });
});
