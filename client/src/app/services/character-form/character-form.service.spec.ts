import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { ATTRIBUTE_TYPES, DICE_TYPES, ERROR_MESSAGES, HTTP_STATUS, INITIAL_VALUES, ROUTES } from '@app/constants/global.constants';
import { Game } from '@app/interfaces/game'; // Import de l'interface Game
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

    // assignBonus method
    describe('assignBonus', () => {
        it('should assign a bonus to the selected attribute', () => {
            service.assignBonus(ATTRIBUTE_TYPES.VITALITY);
            expect(service.bonusAssigned[ATTRIBUTE_TYPES.VITALITY]).toBeTrue();
            expect(service.attributes[ATTRIBUTE_TYPES.VITALITY]).toBe(BONUS_ATTRIBUTE_VALUE);
        });

        it('should reset other attributes when a bonus is assigned', () => {
            service.assignBonus(ATTRIBUTE_TYPES.VITALITY);
            expect(service.bonusAssigned[ATTRIBUTE_TYPES.SPEED]).toBeFalse();
            expect(service.attributes[ATTRIBUTE_TYPES.SPEED]).toBe(DEFAULT_ATTRIBUTE_VALUE);

            service.assignBonus(ATTRIBUTE_TYPES.SPEED);
            expect(service.bonusAssigned[ATTRIBUTE_TYPES.VITALITY]).toBeFalse();
            expect(service.attributes[ATTRIBUTE_TYPES.VITALITY]).toBe(DEFAULT_ATTRIBUTE_VALUE);
        });
    });

    // assignDice method
    describe('assignDice', () => {
        beforeEach(() => {
            service.resetAttributes();
        });

        it('should assign attack to D6 and defense to D4 when attack is selected', () => {
            const obj = service.assignDice(ATTRIBUTE_TYPES.ATTACK);
            expect(service.diceAssigned[ATTRIBUTE_TYPES.ATTACK]).toBeTrue();
            expect(service.diceAssigned[ATTRIBUTE_TYPES.DEFENSE]).toBeFalse();
            expect(obj.attack).toBe(DICE_TYPES.D6);
            expect(obj.defense).toBe(DICE_TYPES.D4);
        });

        it('should assign defense to D6 and attack to D4 when defense is selected', () => {
            const obj = service.assignDice(ATTRIBUTE_TYPES.DEFENSE);
            expect(service.diceAssigned[ATTRIBUTE_TYPES.ATTACK]).toBeFalse();
            expect(service.diceAssigned[ATTRIBUTE_TYPES.DEFENSE]).toBeTrue();
            expect(obj.attack).toBe(DICE_TYPES.D4);
            expect(obj.defense).toBe(DICE_TYPES.D6);
        });

        it('should reassign dice when switching from attack to defense', () => {
            service.assignDice(ATTRIBUTE_TYPES.ATTACK);
            expect(service.diceAssigned[ATTRIBUTE_TYPES.ATTACK]).toBeTrue();
            expect(service.diceAssigned[ATTRIBUTE_TYPES.DEFENSE]).toBeFalse();

            const obj = service.assignDice(ATTRIBUTE_TYPES.DEFENSE);
            expect(service.diceAssigned[ATTRIBUTE_TYPES.ATTACK]).toBeFalse();
            expect(service.diceAssigned[ATTRIBUTE_TYPES.DEFENSE]).toBeTrue();
            expect(obj.attack).toBe(DICE_TYPES.D4);
            expect(obj.defense).toBe(DICE_TYPES.D6);
        });
    });

    // validateGameAvailability method
    describe('validateGameAvailability', () => {
        let closePopupSpy: jasmine.Spy;

        beforeEach(() => {
            closePopupSpy = jasmine.createSpy(); // Initialisation de `closePopupSpy`
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

        it('should handle FORBIDDEN error and navigate to CREATE_VIEW', () => {
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

            mockCommunicationService.getGameById.and.returnValue(throwError(() => ({ status: HTTP_STATUS.FORBIDDEN })));
            service['validateGameAvailability'](mockGame, closePopupSpy);
            expect(mockCommunicationService.getGameById).toHaveBeenCalledWith('1');
            expect(mockSnackbarService.showMessage).toHaveBeenCalledWith(ERROR_MESSAGES.UNAVAILABLE_GAME);
            expect(mockRouter.navigate).toHaveBeenCalledWith([ROUTES.CREATE_VIEW]);
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

        it('should navigate to WAITING_VIEW', () => {
            closePopupSpy = jasmine.createSpy();
            service['proceedToWaitingView'](closePopupSpy);
            expect(mockRouter.navigate).toHaveBeenCalledWith([ROUTES.WAITING_VIEW]);
            expect(closePopupSpy).toHaveBeenCalled();
        });

        it('should call closePopup', () => {
            closePopupSpy = jasmine.createSpy();
            service['proceedToWaitingView'](closePopupSpy);
            expect(closePopupSpy).toHaveBeenCalled();
        });
    });

    describe('showMissingDetailsError', () => {
        it('should call snackbarService.showMessage with MISSING_CHARACTER_DETAILS', () => {
            service['showMissingDetailsError']();

            expect(mockSnackbarService.showMessage).toHaveBeenCalledWith(ERROR_MESSAGES.MISSING_CHARACTER_DETAILS);
        });
    });

    describe('submitCharacter', () => {
        
        let closePopupSpy: jasmine.Spy;
        let mockGame: Game;

        beforeEach(() => {
            closePopupSpy = jasmine.createSpy('closePopup');
            mockGame = { id: '1', name: 'Test Game' } as Game;

            spyOn(service as any, 'validateGameAvailability').and.callFake(() => {});
            spyOn(service as any, 'proceedToWaitingView');
            spyOn(service as any, 'showMissingDetailsError');
            spyOn(service as any, 'isCharacterValid').and.returnValue(true);
        });

        it('should proceed to waiting view if character is valid', () => {
            service.submitCharacter('John', 'avatar.png', mockGame, true, true, closePopupSpy);

            expect(service['proceedToWaitingView']).toHaveBeenCalledWith(closePopupSpy);
            expect(service['showMissingDetailsError']).not.toHaveBeenCalled();
        });

        it('should show missing details error if character is invalid', () => {
            (service as any).isCharacterValid.and.returnValue(false);

            service.submitCharacter('John', 'avatar.png', mockGame, false, false, closePopupSpy);

            expect(service['showMissingDetailsError']).toHaveBeenCalled();
            expect(service['proceedToWaitingView']).not.toHaveBeenCalled();
        });
    });
});
