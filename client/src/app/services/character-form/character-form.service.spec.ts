/* eslint-disable max-lines */
/* eslint-disable @typescript-eslint/no-explicit-any */ // all any uses are to allow the testing of a private service.

import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { BONUS_VALUE, INITIAL_VALUES } from '@app/constants/global.constants';
import { AttributeType, DiceType, ErrorMessages, HttpStatus, JoinLobbyResult, Routes } from '@app/enums/global.enums';
import { Game } from '@app/interfaces/game';
import { Lobby } from '@app/interfaces/lobby';
import { Player } from '@app/interfaces/player';
import { AccessCodeService } from '@app/services/access-code/access-code.service';
import { GameCommunicationService } from '@app/services/game-communication/game-communication.service';
import { SnackbarService } from '@app/services/snackbar/snackbar.service';
import { SocketClientService } from '@app/services/socket/socket-client-service';
import { of, throwError } from 'rxjs';
import { CharacterService } from './character-form.service';

describe('CharacterService', () => {
    let service: CharacterService;
    let mockRouter: jasmine.SpyObj<Router>;
    let mockCommunicationService: jasmine.SpyObj<GameCommunicationService>;
    let mockSnackbarService: jasmine.SpyObj<SnackbarService>;
    let mockSocketClientService: jasmine.SpyObj<SocketClientService>;
    let mockAccessCodeService: jasmine.SpyObj<AccessCodeService>;
    let player: Player;
    let currentAccessCode: string;
    let closePopupSpy: jasmine.Spy<jasmine.Func>;

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
    const UNINITIALIZED_ATTRIBUTE_VALUE = 4;
    const ASSIGNED_ATTRIBUTE_VALUE = 6;
    let game: Game;

    beforeEach(() => {
        mockRouter = jasmine.createSpyObj('Router', ['navigate']);
        mockCommunicationService = jasmine.createSpyObj('GameCommunicationService', ['getGameById']);
        mockSnackbarService = jasmine.createSpyObj('SnackbarService', ['showMessage']);
        closePopupSpy = jasmine.createSpy('closePopup');
        closePopupSpy = jasmine.createSpy('closePopup');
        mockSocketClientService = jasmine.createSpyObj('SocketClientService', [
            'emit',
            'on',
            'createLobby',
            'joinLobby',
            'getLobby',
            'getLobbyPlayers',
            'kickPlayer',
            'removeAccessCode',
            'sendPlayerMovementUpdate',
            'getSocketId',
        ]);
        mockAccessCodeService = jasmine.createSpyObj('AccessCodeService', ['setAccessCode']);

        TestBed.configureTestingModule({
            providers: [
                provideHttpClientTesting(),
                CharacterService,
                { provide: Router, useValue: mockRouter },
                { provide: GameCommunicationService, useValue: mockCommunicationService },
                { provide: SnackbarService, useValue: mockSnackbarService },
                { provide: SocketClientService, useValue: mockSocketClientService },
                { provide: AccessCodeService, useValue: mockAccessCodeService },
            ],
        });

        service = TestBed.inject(CharacterService);

        player = {
            name: 'TestPlayer',
            avatar: 'testAvatar.png',
            speed: UNINITIALIZED_ATTRIBUTE_VALUE,
            attack: { value: UNINITIALIZED_ATTRIBUTE_VALUE, bonusDice: DiceType.Uninitialized },
            defense: { value: UNINITIALIZED_ATTRIBUTE_VALUE, bonusDice: DiceType.Uninitialized },
            hp: { current: UNINITIALIZED_ATTRIBUTE_VALUE, max: UNINITIALIZED_ATTRIBUTE_VALUE },
            movementPoints: 1,
            actionPoints: UNINITIALIZED_ATTRIBUTE_VALUE,
            inventory: [null, null],
            isAdmin: false,
            hasAbandoned: false,
            isActive: false,
            combatWon: 0,
        };

        currentAccessCode = '1234';

        closePopupSpy = jasmine.createSpy();
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should reset player attributes to default values', () => {
        service.initializePlayer(player);
        expect(player.name).toBe('');
        expect(player.avatar).toBe('');
        expect(player.speed).toBe(UNINITIALIZED_ATTRIBUTE_VALUE);
        expect(player.attack).toEqual({ value: UNINITIALIZED_ATTRIBUTE_VALUE, bonusDice: DiceType.Uninitialized });
        expect(player.defense).toEqual({ value: UNINITIALIZED_ATTRIBUTE_VALUE, bonusDice: DiceType.Uninitialized });
        expect(player.hp).toEqual({ current: UNINITIALIZED_ATTRIBUTE_VALUE, max: UNINITIALIZED_ATTRIBUTE_VALUE });
        expect(player.movementPoints).toBe(UNINITIALIZED_ATTRIBUTE_VALUE);
        expect(player.actionPoints).toBe(1);
        expect(player.inventory).toEqual([null, null]);
        expect(player.isAdmin).toBeFalse();
        expect(player.hasAbandoned).toBeFalse();
        expect(player.isActive).toBeFalse();
        expect(player.combatWon).toBe(0);
    });
    it('should emit joinRoom, request unavailable options, and update unavailable avatars', () => {
        spyOn(service.unavailableAvatarsSubject, 'next').and.callThrough();

        const mockAvatars = ['avatar1.png', 'avatar2.png'];

        mockSocketClientService.on.and.callFake((event: string, callback: (data: any) => void) => {
            if (event === 'updateUnavailableOptions') {
                callback({ avatars: mockAvatars });
            }
        });

        service.initializeLobby(currentAccessCode);

        expect(mockSocketClientService.emit).toHaveBeenCalledWith('joinRoom', currentAccessCode);
        expect(mockSocketClientService.emit).toHaveBeenCalledWith('requestUnavailableOptions', currentAccessCode);
        expect(service.unavailableAvatarsSubject.value).toEqual(mockAvatars);
    });

    it('should call deselectAvatar if player already has an avatar', () => {
        spyOn(service, 'deselectAvatar');
        player.avatar = 'oldAvatar.png';
        service.selectAvatar(player, 'newAvatar.png', currentAccessCode);
        expect(service.deselectAvatar).toHaveBeenCalledWith(player, currentAccessCode);
    });

    it('should assign avatar and call socket service', () => {
        spyOn(service.unavailableAvatarsSubject, 'next').and.callThrough();
        service.selectAvatar(player, 'newAvatar.png', currentAccessCode);
        expect(player.avatar).toBe('newAvatar.png');
        expect(mockSocketClientService.emit).toHaveBeenCalledWith('selectAvatar', { accessCode: currentAccessCode, avatar: 'newAvatar.png' });
    });

    it('should call deselectAvatar on socket service and reset player avatar', () => {
        spyOn(service.unavailableAvatarsSubject, 'next').and.callThrough();
        player.avatar = 'oldAvatar.png';
        service.unavailableAvatarsSubject.next(['oldAvatar.png', 'otherAvatar.png']);
        service.deselectAvatar(player, currentAccessCode);
        expect(mockSocketClientService.emit).toHaveBeenCalledWith('deselectAvatar', { accessCode: currentAccessCode });
        const updatedAvatars = service.unavailableAvatarsSubject.value;
        expect(updatedAvatars).not.toContain('oldAvatar.png');
        expect(updatedAvatars).toContain('otherAvatar.png');
        expect(service.unavailableAvatarsSubject.next).toHaveBeenCalled();
        expect(player.avatar).toBe('');
    });

    it('should show error message if character is not valid', async () => {
        spyOn(service, 'isCharacterValid').and.returnValue(false);
        spyOn(service, 'showMissingDetailsError');
        await service.submitCharacter(player, currentAccessCode, true, mockGame);
        expect(service.showMissingDetailsError).toHaveBeenCalled();
        expect(mockAccessCodeService.setAccessCode).not.toHaveBeenCalled();
    });

    it('should mark bonus as assigned when assigning bonus to Vitality', () => {
        service.assignBonus(player, AttributeType.Vitality);
        expect(service.bonusAssigned[AttributeType.Vitality]).toBeTrue();
    });

    it('should assign D6 to attack and D4 to defense when attack is selected', () => {
        service.assignDice(player, AttributeType.Attack);
        expect(service.diceAssigned[AttributeType.Attack]).toBeTrue();
        expect(service.diceAssigned[AttributeType.Defense]).toBeFalse();
        expect(player.attack.bonusDice).toBe(DiceType.D6);
        expect(player.defense.bonusDice).toBe(DiceType.D4);
    });

    it('should assign D6 to defense and D4 to attack when defense is selected', () => {
        service.assignDice(player, AttributeType.Defense);
        expect(service.diceAssigned[AttributeType.Defense]).toBeTrue();
        expect(service.diceAssigned[AttributeType.Attack]).toBeFalse();
        expect(player.attack.bonusDice).toBe(DiceType.D4);
        expect(player.defense.bonusDice).toBe(DiceType.D6);
    });

    describe('joinExistingLobby', () => {
        const accessCode = '1234';

        const mockLobby: Lobby = {
            accessCode: '1234',
            game: null,
            players: [player],
            maxPlayers: 4,
            isLocked: false,
        };

        beforeEach(() => {
            mockSocketClientService = jasmine.createSpyObj('SocketClientService', ['getLobby', 'joinLobby']);
            mockSnackbarService = jasmine.createSpyObj('SnackbarService', ['showConfirmation', 'showMessage']);

            service = new CharacterService(
                {} as Router,
                mockSnackbarService,
                {} as GameCommunicationService,
                mockSocketClientService,
                {} as AccessCodeService,
            );
        });

        it('should resolve with JoinedLobby when the lobby is not locked', async () => {
            mockSocketClientService.getLobby.and.returnValue(of({ ...mockLobby, isLocked: false }));

            const result = await service.joinExistingLobby(accessCode, player);

            expect(mockSocketClientService.getLobby).toHaveBeenCalledWith(accessCode);
            expect(mockSocketClientService.joinLobby).toHaveBeenCalledWith(accessCode, player);
            expect(result).toBe(JoinLobbyResult.JoinedLobby);
        });

        it('should resolve with RedirectToHome when the lobby is locked and the user confirms', async () => {
            mockSocketClientService.getLobby.and.returnValue(of({ ...mockLobby, isLocked: true }));
            mockSnackbarService.showConfirmation.and.returnValue(of(true));

            const result = await service.joinExistingLobby(accessCode, player);

            expect(mockSnackbarService.showConfirmation).toHaveBeenCalledWith(
                "La salle est verrouillée, voulez-vous être redirigé vers la page d'accueil",
            );
            expect(result).toBe(JoinLobbyResult.RedirectToHome);
        });

        it('should resolve with StayInLobby when the lobby is locked and the user refuses to redirect', async () => {
            mockSocketClientService.getLobby.and.returnValue(of({ ...mockLobby, isLocked: true }));
            mockSnackbarService.showConfirmation.and.returnValue(of(false));

            const result = await service.joinExistingLobby(accessCode, player);

            expect(mockSnackbarService.showConfirmation).toHaveBeenCalledWith(
                "La salle est verrouillée, voulez-vous être redirigé vers la page d'accueil",
            );
            expect(result).toBe(JoinLobbyResult.StayInLobby);
        });

        it('should resolve with RedirectToHome and show an error message when getLobby fails', async () => {
            mockSocketClientService.getLobby.and.returnValue(throwError(() => new Error('Server error')));

            const result = await service.joinExistingLobby(accessCode, player);

            expect(mockSnackbarService.showMessage).toHaveBeenCalledWith(ErrorMessages.UnavailableGame);
            expect(result).toBe(JoinLobbyResult.RedirectToHome);
        });
    });

    it('should reset attributes, bonusAssigned, and diceAssigned to initial values', () => {
        service.attributes = {
            [AttributeType.Vitality]: ASSIGNED_ATTRIBUTE_VALUE,
            [AttributeType.Speed]: ASSIGNED_ATTRIBUTE_VALUE,
            [AttributeType.Attack]: ASSIGNED_ATTRIBUTE_VALUE,
            [AttributeType.Defense]: ASSIGNED_ATTRIBUTE_VALUE,
        };
        service.bonusAssigned = {
            [AttributeType.Vitality]: true,
            [AttributeType.Speed]: true,
        };
        service.diceAssigned = {
            [AttributeType.Attack]: true,
            [AttributeType.Defense]: true,
        };

        service.resetAttributes();

        expect(service.attributes).toEqual(INITIAL_VALUES.attributes);
        expect(service.bonusAssigned).toEqual(INITIAL_VALUES.bonusAssigned);
        expect(service.diceAssigned).toEqual(INITIAL_VALUES.diceAssigned);
    });

    it('should call createLobby and setAccessCode with the correct arguments', async () => {
        const accessCode = '1234';
        mockSocketClientService.createLobby.and.returnValue(Promise.resolve(accessCode));
        await service.createAndJoinLobby(game, player);
        expect(mockSocketClientService.createLobby).toHaveBeenCalledWith(game, player);
        expect(mockAccessCodeService.setAccessCode).toHaveBeenCalledWith(accessCode);
    });

    it('should handle errors if createLobby fails', async () => {
        const errorMessage = 'Failed to create lobby';
        mockSocketClientService.createLobby.and.returnValue(Promise.reject(new Error(errorMessage)));
        game = {
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
        await expectAsync(service.createAndJoinLobby(game, player)).toBeRejectedWithError(errorMessage);
        expect(mockAccessCodeService.setAccessCode).not.toHaveBeenCalled();
    });

    describe('resetOtherBonus', () => {
        beforeEach(() => {
            service.attributes = { ...INITIAL_VALUES.attributes };
            service.bonusAssigned = { ...INITIAL_VALUES.bonusAssigned };
        });

        it('should reset the other attribute if bonus is assigned', () => {
            service.bonusAssigned[AttributeType.Speed] = true;
            service.attributes[AttributeType.Speed] = 10;
            service['resetOtherBonus'](AttributeType.Vitality);
            expect(service.attributes[AttributeType.Speed]).toBe(INITIAL_VALUES.attributes[AttributeType.Speed]);
            expect(service.bonusAssigned[AttributeType.Speed]).toBeFalse();
        });

        it('should not reset the other attribute if bonus is not assigned', () => {
            service.bonusAssigned[AttributeType.Speed] = false;
            service.attributes[AttributeType.Speed] = UNINITIALIZED_ATTRIBUTE_VALUE;
            service['resetOtherBonus'](AttributeType.Vitality);
            expect(service.attributes[AttributeType.Speed]).toBe(UNINITIALIZED_ATTRIBUTE_VALUE);
            expect(service.bonusAssigned[AttributeType.Speed]).toBeFalse();
        });

        it('should reset Vitality if Speed is the selected attribute', () => {
            service.bonusAssigned[AttributeType.Vitality] = true;
            service.attributes[AttributeType.Vitality] = 10;
            service['resetOtherBonus'](AttributeType.Speed);
            expect(service.attributes[AttributeType.Vitality]).toBe(INITIAL_VALUES.attributes[AttributeType.Vitality]);
            expect(service.bonusAssigned[AttributeType.Vitality]).toBeFalse();
        });

        it('should not reset Vitality if Speed is the selected attribute and no bonus is assigned', () => {
            service.bonusAssigned[AttributeType.Vitality] = false;
            service.attributes[AttributeType.Vitality] = 4;
            service['resetOtherBonus'](AttributeType.Speed);
            expect(service.attributes[AttributeType.Vitality]).toBe(UNINITIALIZED_ATTRIBUTE_VALUE);
            expect(service.bonusAssigned[AttributeType.Vitality]).toBeFalse();
        });
    });

    describe('updatePlayerStats', () => {
        beforeEach(() => {
            service.attributes = { ...INITIAL_VALUES.attributes };
            service.attributes[AttributeType.Vitality] = UNINITIALIZED_ATTRIBUTE_VALUE;
            service.attributes[AttributeType.Speed] = UNINITIALIZED_ATTRIBUTE_VALUE;
        });

        it('should update player stats when attribute is Vitality', () => {
            service['updatePlayerStats'](player, AttributeType.Vitality);

            expect(player.hp.current).toBe(UNINITIALIZED_ATTRIBUTE_VALUE);
            expect(player.hp.max).toBe(UNINITIALIZED_ATTRIBUTE_VALUE);
            expect(player.speed).toBe(INITIAL_VALUES.attributes[AttributeType.Speed]);
        });

        it('should update player stats when attribute is Speed', () => {
            service['updatePlayerStats'](player, AttributeType.Speed);
            expect(player.speed).toBe(UNINITIALIZED_ATTRIBUTE_VALUE);
            expect(player.movementPoints).toBe(UNINITIALIZED_ATTRIBUTE_VALUE);
            expect(player.hp.current).toBe(INITIAL_VALUES.attributes[AttributeType.Vitality]);
            expect(player.hp.max).toBe(INITIAL_VALUES.attributes[AttributeType.Vitality]);
        });
    });

    it('should show missing details error if character is not valid', async () => {
        spyOn(service, 'isCharacterValid').and.returnValue(false);
        spyOn(service as any, 'showMissingDetailsError');
        mockCommunicationService.getGameById.and.returnValue(of({ id: '1', name: 'Test Game' } as Game));

        await service.submitCharacter(player, currentAccessCode, true, mockGame);

        expect((service as any).showMissingDetailsError).toHaveBeenCalled();
        expect(mockAccessCodeService.setAccessCode).not.toHaveBeenCalled();
    });

    it('should set player as admin, create and join lobby, and finalize submission if lobby is not created', async () => {
        spyOn(service, 'isCharacterValid').and.returnValue(true);
        spyOn(service as any, 'finalizeCharacterSubmission');
        spyOn(service, 'createAndJoinLobby').and.returnValue(Promise.resolve());
        await service.submitCharacter(player, currentAccessCode, false, mockGame);
        expect(player.isAdmin).toBeTrue();
        expect(service.createAndJoinLobby).toHaveBeenCalledWith(mockGame, player);
        expect((service as any).finalizeCharacterSubmission).toHaveBeenCalledWith(player);
    });

    it('should do nothing when joinStatus is StayInLobby', () => {
        spyOn(service as any, 'returnHome');
        spyOn(service as any, 'finalizeCharacterSubmission');
        mockCommunicationService.getGameById.and.returnValue(of(mockGame));

        (service as any).handleLobbyJoining(JoinLobbyResult.StayInLobby, player, mockGame, closePopupSpy);
        expect((service as any).returnHome).not.toHaveBeenCalled();
        expect((service as any).finalizeCharacterSubmission).not.toHaveBeenCalled();
    });

    it('should call returnHome when joinStatus is RedirectToHome', () => {
        spyOn(service as any, 'returnHome');

        service['handleLobbyJoining'](JoinLobbyResult.RedirectToHome, player, mockGame, currentAccessCode);

        expect((service as any).returnHome).toHaveBeenCalled();
    });

    it('should call joinExistingLobby and handleLobbyJoining when isLobbyCreated is true', async () => {
        spyOn(service, 'isCharacterValid').and.returnValue(true);
        spyOn(service, 'joinExistingLobby').and.resolveTo(JoinLobbyResult.JoinedLobby);
        spyOn(service as any, 'handleLobbyJoining');

        await service.submitCharacter(player, currentAccessCode, true, mockGame);

        expect(service.joinExistingLobby).toHaveBeenCalledWith(currentAccessCode, player);
        expect((service as any).handleLobbyJoining).toHaveBeenCalledWith(JoinLobbyResult.JoinedLobby, player, mockGame, currentAccessCode);
    });

    it('should validate game availability', () => {
        spyOn(service as any, 'validateGameAvailability');
        closePopupSpy = jasmine.createSpy('closePopup');

        (service as any).handleLobbyJoining(JoinLobbyResult.JoinedLobby, player, mockGame, currentAccessCode, closePopupSpy);

        expect(service['validateGameAvailability']).toHaveBeenCalledWith(mockGame);
    });

    describe('validateGameAvailability', () => {
        beforeEach(() => {
            closePopupSpy = jasmine.createSpy();
        });

        it('should do nothing when game is available', () => {
            mockCommunicationService.getGameById.and.returnValue(of(mockGame));

            service['validateGameAvailability'](mockGame);

            expect(mockCommunicationService.getGameById).toHaveBeenCalledWith('1');
            expect(closePopupSpy).not.toHaveBeenCalled();
            expect(mockRouter.navigate).not.toHaveBeenCalled();
        });

        it('should handle FORBIDDEN error and navigate to CREATE_VIEW', () => {
            mockCommunicationService.getGameById.and.returnValue(throwError(() => ({ status: HttpStatus.Forbidden })));
            service['validateGameAvailability'](mockGame);
            expect(mockCommunicationService.getGameById).toHaveBeenCalledWith('1');
            expect(mockSnackbarService.showMessage).toHaveBeenCalledWith(ErrorMessages.UnavailableGame);
            expect(mockRouter.navigate).toHaveBeenCalledWith([Routes.CreateView]);
        });
    });

    describe('isCharacterValid', () => {
        it('should return true when all parameters are valid', () => {
            service.assignBonus(player, AttributeType.Vitality);
            service.assignDice(player, AttributeType.Attack);

            expect(service.isCharacterValid(player)).toBeTrue();
        });

        it('should return false when at least one required parameter is missing', () => {
            expect(service.isCharacterValid({ ...player, name: '' })).toBeFalse();
            expect(service.isCharacterValid({ ...player, avatar: '' })).toBeFalse();
            expect(
                service.isCharacterValid({ ...player, attack: { value: UNINITIALIZED_ATTRIBUTE_VALUE, bonusDice: DiceType.Uninitialized } }),
            ).toBeFalse();
            expect(
                service.isCharacterValid({ ...player, defense: { value: UNINITIALIZED_ATTRIBUTE_VALUE, bonusDice: DiceType.Uninitialized } }),
            ).toBeFalse();
        });
    });

    describe('proceedToWaitingView', () => {
        it('should navigate to WAITING_VIEW', () => {
            closePopupSpy = jasmine.createSpy();
            service['proceedToWaitingView']();
            expect(mockRouter.navigate).toHaveBeenCalledWith([Routes.WaitingView]);
        });
    });

    describe('showMissingDetailsError', () => {
        it('should call snackbarService.showMessage with MISSING_CHARACTER_DETAILS', () => {
            service['showMissingDetailsError']();
            expect(mockSnackbarService.showMessage).toHaveBeenCalledWith(ErrorMessages.MissingCharacterDetails);
        });
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

    it('should store player in sessionStorage and proceed to waiting view if character is valid after validating game availability', () => {
        spyOn(service, 'isCharacterValid').and.returnValue(true);
        spyOn(sessionStorage, 'setItem');
        spyOn(service as any, 'proceedToWaitingView');

        service['finalizeCharacterSubmission'](player);

        expect(service.isCharacterValid).toHaveBeenCalledWith(player);
        expect(sessionStorage.setItem).toHaveBeenCalledWith('player', JSON.stringify(player));
        expect(service['proceedToWaitingView']).toHaveBeenCalled();
    });

    it('should assign bonus when attribute is Vitality', () => {
        service.assignBonus(player, AttributeType.Vitality);
        expect(service.bonusAssigned[AttributeType.Vitality]).toBeTrue();
        expect(service.attributes[AttributeType.Vitality]).toBe(INITIAL_VALUES.attributes[AttributeType.Vitality] + BONUS_VALUE);
    });

    it('should assign bonus when attribute is Speed', () => {
        service.assignBonus(player, AttributeType.Speed);
        expect(service.bonusAssigned[AttributeType.Speed]).toBeTrue();
        expect(service.attributes[AttributeType.Speed]).toBe(INITIAL_VALUES.attributes[AttributeType.Speed] + BONUS_VALUE);
    });

    it('should process empty avatars list correctly', () => {
        spyOn(service.unavailableAvatarsSubject, 'next');

        mockSocketClientService.on.and.callFake(<T>(event: string, callback: (data: T) => void) => {
            if (event === 'updateUnavailableOptions') {
                callback({ avatars: [] } as any);
            }
        });

        service.initializeLobby('testAccessCode');

        expect(service.unavailableAvatarsSubject.next).toHaveBeenCalledWith([]);
    });

    it('should not update unavailable avatars if avatars is undefined', () => {
        spyOn(service.unavailableAvatarsSubject, 'next');

        mockSocketClientService.on.and.callFake(<T>(event: string, callback: (data: T) => void) => {
            if (event === 'updateUnavailableOptions') {
                callback({ names: [] } as any);
            }
        });

        service.initializeLobby(currentAccessCode);
        expect(service.unavailableAvatarsSubject.next).not.toHaveBeenCalled();
    });
});
