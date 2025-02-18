/* eslint-disable @typescript-eslint/no-explicit-any */
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { INITIAL_VALUES } from '@app/constants/global.constants';
import { AttributeType, DiceType, ErrorMessages, HttpStatus, Routes } from '@app/enums/global.enums';
import { Game } from '@app/interfaces/game';
import { GameCommunicationService } from '@app/services/game-communication/game-communication.service';
import { SnackbarService } from '@app/services/snackbar/snackbar.service';
import { of, throwError } from 'rxjs';
import { CharacterService } from './character-form.service';
import { PlayerInfoService } from '@app/services/player-info/player-info.service';
import { PlayerInfo } from '@app/interfaces/player';

const DEFAULT_ATTRIBUTE_VALUE = 4;
const BONUS_ATTRIBUTE_VALUE = 6;

describe('CharacterService', () => {
    let service: CharacterService;
    let mockRouter: jasmine.SpyObj<Router>;
    let mockCommunicationService: jasmine.SpyObj<GameCommunicationService>;
    let mockSnackbarService: jasmine.SpyObj<SnackbarService>;
    let mockPlayerInfoService: jasmine.SpyObj<PlayerInfoService>;

    beforeEach(() => {
        mockRouter = jasmine.createSpyObj('Router', ['navigate']);
        mockCommunicationService = jasmine.createSpyObj('GameCommunicationService', ['getGameById']);
        mockSnackbarService = jasmine.createSpyObj('SnackbarService', ['showMessage']);
        mockPlayerInfoService = jasmine.createSpyObj('PlayerInfoService', ['initializePlayer']);

        TestBed.configureTestingModule({
            providers: [
                CharacterService,
                { provide: Router, useValue: mockRouter },
                { provide: GameCommunicationService, useValue: mockCommunicationService },
                { provide: SnackbarService, useValue: mockSnackbarService },
                { provide: PlayerInfoService, useValue: mockPlayerInfoService },
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

    describe('submitCharacter', () => {
        let closePopupSpy: jasmine.Spy;
        let mockGame: Game;

        beforeEach(() => {
            closePopupSpy = jasmine.createSpy('closePopup');
            mockGame = { id: '1', name: 'Test Game' } as Game;

            spyOn(service as any, 'validateGameAvailability').and.callFake(() => null);
            spyOn(service as any, 'proceedToWaitingView');
            spyOn(service as any, 'showMissingDetailsError');
            spyOn(service as any, 'isCharacterValid').and.returnValue(true);
        });

        it('should proceed to waiting view if character is valid and initialize player with correct data', () => {
            service.submitCharacter({
                characterName: 'name',
                selectedAvatar: 'avatar.png',
                game: mockGame,
                isBonusAssigned: true,
                isDiceAssigned: true,
                closePopup: closePopupSpy,
            });

            const expectedPlayerInfo = {
                name: 'name',
                avatar: 'avatar.png',
                hp: {
                    current: service.attributes[AttributeType.Vitality],
                    max: service.attributes[AttributeType.Vitality],
                },
                speed: service.attributes[AttributeType.Speed],
                attack: {
                    value: service.attributes[AttributeType.Attack],
                    bonusDice: service.diceAssigned[AttributeType.Attack] ? DiceType.D6 : DiceType.D4,
                },
                defense: {
                    value: service.attributes[AttributeType.Defense],
                    bonusDice: service.diceAssigned[AttributeType.Attack] ? DiceType.D6 : DiceType.D4,
                },
                movementPoints: 10,
                actionPoints: 10,
                inventory: [null, null],
            } as PlayerInfo;

            expect(mockPlayerInfoService.initializePlayer).toHaveBeenCalledWith(expectedPlayerInfo);
            expect((service as any).proceedToWaitingView).toHaveBeenCalledWith(closePopupSpy);
            expect((service as any).showMissingDetailsError).not.toHaveBeenCalled();
        });

        const DEFAULT_PLAYER_INFO: PlayerInfo = {
            name: 'name',
            avatar: 'avatar.png',
            hp: {
                current: INITIAL_VALUES.attributes[AttributeType.Vitality],
                max: INITIAL_VALUES.attributes[AttributeType.Vitality],
            },
            speed: INITIAL_VALUES.attributes[AttributeType.Speed],
            attack: {
                value: INITIAL_VALUES.attributes[AttributeType.Attack],
                bonusDice: DiceType.D4,
            },
            defense: {
                value: INITIAL_VALUES.attributes[AttributeType.Defense],
                bonusDice: DiceType.D4,
            },
            movementPoints: 10,
            actionPoints: 10,
            inventory: [null, null],
        };

        it('should proceed to waiting view if character is valid and initialize player with correct data', () => {
            service.submitCharacter({
                characterName: 'name',
                selectedAvatar: 'avatar.png',
                game: mockGame,
                isBonusAssigned: true,
                isDiceAssigned: true,
                closePopup: closePopupSpy,
            });

            const expectedPlayerInfo = { ...DEFAULT_PLAYER_INFO };
            expectedPlayerInfo.attack.bonusDice = service.diceAssigned[AttributeType.Attack] ? DiceType.D6 : DiceType.D4;
            expectedPlayerInfo.defense.bonusDice = service.diceAssigned[AttributeType.Attack] ? DiceType.D6 : DiceType.D4;

            expect(mockPlayerInfoService.initializePlayer).toHaveBeenCalledWith(expectedPlayerInfo);
            expect((service as any).proceedToWaitingView).toHaveBeenCalledWith(closePopupSpy);
            expect((service as any).showMissingDetailsError).not.toHaveBeenCalled();
        });

        it('should set bonusDie to D4 for attack and defense when diceAssigned[Attack] is false', () => {
            service.submitCharacter({
                characterName: 'name',
                selectedAvatar: 'avatar.png',
                game: mockGame,
                isBonusAssigned: true,
                isDiceAssigned: true,
                closePopup: closePopupSpy,
            });

            const expectedPlayerInfo = { ...DEFAULT_PLAYER_INFO };
            expectedPlayerInfo.attack.bonusDice = DiceType.D4;
            expectedPlayerInfo.defense.bonusDice = DiceType.D4;

            expect(mockPlayerInfoService.initializePlayer).toHaveBeenCalledWith(expectedPlayerInfo);
        });

        it('should set bonusDie to D6 for attack and defense when diceAssigned[Attack] is true', () => {
            service.assignDice(AttributeType.Attack);

            service.submitCharacter({
                characterName: 'name',
                selectedAvatar: 'avatar.png',
                game: mockGame,
                isBonusAssigned: true,
                isDiceAssigned: true,
                closePopup: closePopupSpy,
            });

            const expectedPlayerInfo = { ...DEFAULT_PLAYER_INFO };
            expectedPlayerInfo.attack.bonusDice = DiceType.D6;
            expectedPlayerInfo.defense.bonusDice = DiceType.D6;

            expect(mockPlayerInfoService.initializePlayer).toHaveBeenCalledWith(expectedPlayerInfo);
        });

        it('should show missing details error if character is invalid', () => {
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

        it('should show missing details error if character is invalid', () => {
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
