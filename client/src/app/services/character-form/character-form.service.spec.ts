import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { INITIAL_VALUES } from '@app/constants/global.constants';
import { AttributeType, DiceType, ErrorMessages, HttpStatus, Routes } from '@app/enums/global.enums';
import { Game } from '@app/interfaces/game';
import { Player } from '@app/interfaces/player'; // Updated import
import { GameCommunicationService } from '@app/services/game-communication/game-communication.service';
import { SnackbarService } from '@app/services/snackbar/snackbar.service';
import { of, throwError } from 'rxjs';
import { CharacterService } from './character-form.service';
// eslint-disable-next-line import/no-deprecated
import { HttpClientTestingModule } from '@angular/common/http/testing'; // Corrected import

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
            // eslint-disable-next-line import/no-deprecated
            imports: [HttpClientTestingModule], // Use HttpClientTestingModule here
            providers: [
                CharacterService,
                { provide: Router, useValue: mockRouter },
                { provide: GameCommunicationService, useValue: mockCommunicationService },
                { provide: SnackbarService, useValue: mockSnackbarService },
            ],
        });

        service = TestBed.inject(CharacterService);
        mockRouter = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should initialize attributes correctly', () => {
        expect(service.attributes).toEqual(INITIAL_VALUES.attributes);
    });

    it('should return null for attack and defense when attribute is not Attack or Defense', () => {
        const result = service.assignDice('SomeOtherAttribute' as AttributeType);

        expect(result).toEqual({ attack: null, defense: null });
    });

    describe('assignBonus', () => {
        it('should assign a bonus to the selected attribute', () => {
            service.assignBonus(AttributeType.Vitality);
            expect(service.bonusAssigned[AttributeType.Vitality]).toBeTrue();
            expect(service.attributes[AttributeType.Vitality]).toBe(BONUS_ATTRIBUTE_VALUE);
        });

        it('should reset other attributes when a bonus is assigned', () => {
            service.assignBonus(AttributeType.Vitality);
            expect(service.bonusAssigned[AttributeType.Speed]).toBeFalse();
            expect(service.attributes[AttributeType.Speed]).toBe(DEFAULT_ATTRIBUTE_VALUE);

            service.assignBonus(AttributeType.Speed);
            expect(service.bonusAssigned[AttributeType.Vitality]).toBeFalse();
            expect(service.attributes[AttributeType.Vitality]).toBe(DEFAULT_ATTRIBUTE_VALUE);
        });
    });

    describe('assignDice', () => {
        beforeEach(() => {
            service.resetAttributes();
        });

        it('should assign attack to D6 and defense to D4 when attack is selected', () => {
            const obj = service.assignDice(AttributeType.Attack);
            expect(service.diceAssigned[AttributeType.Attack]).toBeTrue();
            expect(service.diceAssigned[AttributeType.Defense]).toBeFalse();
            expect(obj.attack).toBe(DiceType.D6);
            expect(obj.defense).toBe(DiceType.D4);
        });

        it('should assign defense to D6 and attack to D4 when defense is selected', () => {
            const obj = service.assignDice(AttributeType.Defense);
            expect(service.diceAssigned[AttributeType.Attack]).toBeFalse();
            expect(service.diceAssigned[AttributeType.Defense]).toBeTrue();
            expect(obj.attack).toBe(DiceType.D4);
            expect(obj.defense).toBe(DiceType.D6);
        });

        it('should reassign dice when switching from attack to defense', () => {
            service.assignDice(AttributeType.Attack);
            expect(service.diceAssigned[AttributeType.Attack]).toBeTrue();
            expect(service.diceAssigned[AttributeType.Defense]).toBeFalse();

            const obj = service.assignDice(AttributeType.Defense);
            expect(service.diceAssigned[AttributeType.Attack]).toBeFalse();
            expect(service.diceAssigned[AttributeType.Defense]).toBeTrue();
            expect(obj.attack).toBe(DiceType.D4);
            expect(obj.defense).toBe(DiceType.D6);
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

            mockCommunicationService.getGameById.and.returnValue(throwError(() => ({ status: HttpStatus.Forbidden })));
            service['validateGameAvailability'](mockGame, closePopupSpy);
            expect(mockCommunicationService.getGameById).toHaveBeenCalledWith('1');
            expect(mockSnackbarService.showMessage).toHaveBeenCalledWith(ErrorMessages.UnavailableGame);
            expect(mockRouter.navigate).toHaveBeenCalledWith([Routes.CreateView]);
            expect(closePopupSpy).toHaveBeenCalled();
        });
    });

    describe('isCharacterValid', () => {
        let validPlayer: Player;

        beforeEach(() => {
            validPlayer = {
                name: 'TestPlayer',
                avatar: 'avatar.png',
                speed: 5,
                attack: { value: 4, bonusDice: DiceType.D6 },
                defense: { value: 3, bonusDice: DiceType.D4 },
                hp: { current: 4, max: 4 },
                movementPoints: 3,
                actionPoints: 3,
                inventory: [null, null],
                isAdmin: true,
                hasAbandoned: false,
                isActive: true,
                combatWon: 0,
            };
        });

        it('should return true when all parameters are valid', () => {
            expect(service.isCharacterValid(validPlayer)).toBeTrue();
        });

        it('should return false when at least one required parameter is missing', () => {
            expect(service.isCharacterValid({ ...validPlayer, name: '' })).toBeFalse();
            expect(service.isCharacterValid({ ...validPlayer, avatar: '' })).toBeFalse();
            expect(service.isCharacterValid({ ...validPlayer, attack: { value: 4, bonusDice: DiceType.Uninitialized } })).toBeFalse();
            expect(service.isCharacterValid({ ...validPlayer, defense: { value: 4, bonusDice: DiceType.Uninitialized } })).toBeFalse();
        });
    });

    describe('proceedToWaitingView', () => {
        let closePopupSpy: jasmine.Spy;

        it('should navigate to WAITING_VIEW', () => {
            closePopupSpy = jasmine.createSpy();
            service['proceedToWaitingView'](closePopupSpy);
            expect(mockRouter.navigate).toHaveBeenCalledWith([Routes.WaitingView]);
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
            expect(mockSnackbarService.showMessage).toHaveBeenCalledWith(ErrorMessages.MissingCharacterDetails);
        });
    });

    it('should call validateGameAvailability and proceed to waiting view if character is valid', () => {
        const mockPlayer: Player = {
            name: 'TestPlayer',
            avatar: 'avatar.png',
            speed: 5,
            attack: { value: 4, bonusDice: DiceType.D6 },
            defense: { value: 3, bonusDice: DiceType.D4 },
            hp: { current: 4, max: 4 },
            movementPoints: 3,
            actionPoints: 3,
            inventory: [null, null],
            isAdmin: true,
            hasAbandoned: false,
            combatWon: 0,
            isActive: false,
        };

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

        const closePopupSpy = jasmine.createSpy(); // Create a mock for closePopup

        // Mock the getGameById method to return an observable
        mockCommunicationService.getGameById.and.returnValue(of(mockGame)); // Ensure this returns an observable

        // Provide mockGame and closePopupSpy as arguments
        service.submitCharacter(mockPlayer, mockGame, closePopupSpy);

        // Check if the correct methods were called
        expect(mockCommunicationService.getGameById).toHaveBeenCalled();
        expect(mockRouter.navigate).toHaveBeenCalledWith([Routes.WaitingView]);
        expect(closePopupSpy).toHaveBeenCalled();
    });

    it('should call validateGameAvailability and proceed to waiting view if character is valid', () => {
        const mockPlayer: Player = {
            name: '',
            avatar: 'avatar.png',
            speed: 5,
            attack: { value: 4, bonusDice: DiceType.D6 },
            defense: { value: 3, bonusDice: DiceType.D4 },
            hp: { current: 4, max: 4 },
            movementPoints: 3,
            actionPoints: 3,
            inventory: [null, null],
            isAdmin: true,
            hasAbandoned: false,
            combatWon: 0,
            isActive: false,
        };
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

        const closePopupSpy = jasmine.createSpy();

        mockCommunicationService.getGameById.and.returnValue(of(mockGame));
        service['showMissingDetailsError']();

        service.submitCharacter(mockPlayer, mockGame, closePopupSpy);

        expect(mockSnackbarService.showMessage).toHaveBeenCalledWith(ErrorMessages.MissingCharacterDetails);
    });

    describe('checkCharacterNameLength()', () => {
        const maxLength = 20;

        it('should not show a message if the name is below the maximum length', () => {
            const shortName = 'A'.repeat(maxLength - 1);
            service.checkCharacterNameLength(shortName);
            expect(mockSnackbarService.showMessage).not.toHaveBeenCalled();
        });

        it('should not show a message if the name is exactly the maximum length', () => {
            const exactLengthName = 'A'.repeat(maxLength - 1);
            service.checkCharacterNameLength(exactLengthName);
            expect(mockSnackbarService.showMessage).not.toHaveBeenCalled();
        });

        it('should show a message if the name exceeds the maximum length', () => {
            const longName = 'A'.repeat(maxLength + 1);
            service.checkCharacterNameLength(longName);
            expect(mockSnackbarService.showMessage).toHaveBeenCalledWith(`La longueur maximale du nom est de ${maxLength} caractères`);
        });

        it('should handle an empty name without showing a message', () => {
            const emptyName = '';
            service.checkCharacterNameLength(emptyName);
            expect(mockSnackbarService.showMessage).not.toHaveBeenCalled();
        });

        it('should handle a name with spaces without showing a message', () => {
            const spacedName = '   ';
            service.checkCharacterNameLength(spacedName);
            expect(mockSnackbarService.showMessage).not.toHaveBeenCalled();
        });

        it('should handle a name with special characters without showing a message', () => {
            const specialCharName = 'Test@123';
            service.checkCharacterNameLength(specialCharName);
            expect(mockSnackbarService.showMessage).not.toHaveBeenCalled();
        });
    });

    it('should navigate to the home page', () => {
        service.returnHome();
        expect(mockRouter.navigate).toHaveBeenCalledWith([Routes.HomePage]);
    });
});
