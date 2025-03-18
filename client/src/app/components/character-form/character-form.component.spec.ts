// /* eslint-disable @typescript-eslint/no-empty-function */
// /* eslint-disable @typescript-eslint/no-explicit-any */
// // eslint-disable-next-line import/no-deprecated
// import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
// import { ComponentFixture, TestBed } from '@angular/core/testing';
// import { FormsModule } from '@angular/forms';
// import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
// import { AttributeType, DiceType, JoinLobbyResult } from '@app/enums/global.enums';
// import { Game } from '@app/interfaces/game';
// import { Player } from '@app/interfaces/player';
// import { AccessCodeService } from '@app/services/access-code/access-code.service';
// import { CharacterService } from '@app/services/character-form/character-form.service';
// import { SnackbarService } from '@app/services/snackbar/snackbar.service';
// import { SocketClientService } from '@app/services/socket/socket-client-service';
// import { CharacterFormComponent } from './character-form.component';

// describe('CharacterFormComponent', () => {
//     let component: CharacterFormComponent;
//     let fixture: ComponentFixture<CharacterFormComponent>;
//     let mockCharacterService: jasmine.SpyObj<CharacterService>;
//     let mockDialogRef: jasmine.SpyObj<MatDialogRef<CharacterFormComponent>>;
//     let mockGame: Game;
//     let httpMock: HttpTestingController;
//     let mockAccessCodeService: jasmine.SpyObj<AccessCodeService>;
//     let mockSnackbarService: jasmine.SpyObj<SnackbarService>;
//     let mockSocketClientService: jasmine.SpyObj<SocketClientService>;

//     beforeEach(async () => {
//         mockSnackbarService = jasmine.createSpyObj('SnackbarService', ['showMessage']);
//         mockSocketClientService = jasmine.createSpyObj('SocketClientService', ['emit', 'on', 'onUpdateUnavailableOptions']);
//         mockCharacterService = jasmine.createSpyObj<CharacterService>(
//             'CharacterService',
//             [
//                 'submitCharacter',
//                 'resetAttributes',
//                 'assignBonus',
//                 'assignDice',
//                 'checkCharacterNameLength',
//                 'isCharacterValid',
//                 'showMissingDetailsError',
//                 'returnHome',
//                 'joinExistingLobby',
//                 'createAndJoinLobby',
//             ],
//             {
//                 attributes: {
//                     [AttributeType.Vitality]: 4,
//                     [AttributeType.Speed]: 4,
//                     [AttributeType.Attack]: 4,
//                     [AttributeType.Defense]: 4,
//                 },
//                 bonusAssigned: {
//                     [AttributeType.Vitality]: false,
//                     [AttributeType.Speed]: false,
//                 },
//                 diceAssigned: {
//                     [AttributeType.Attack]: false,
//                     [AttributeType.Defense]: false,
//                 },
//             },
//         );

//         mockDialogRef = jasmine.createSpyObj<MatDialogRef<CharacterFormComponent>>('MatDialogRef', ['close']);
//         mockGame = { id: '1', name: 'Test Game' } as Game;
//         mockAccessCodeService = jasmine.createSpyObj('AccessCodeService', ['setAccessCode']);

//         spyOn(sessionStorage, 'setItem');

//         await TestBed.configureTestingModule({
//             // eslint-disable-next-line import/no-deprecated
//             imports: [FormsModule, CharacterFormComponent, HttpClientTestingModule],
//             providers: [
//                 { provide: CharacterService, useValue: mockCharacterService },
//                 { provide: MatDialogRef, useValue: mockDialogRef },
//                 { provide: MAT_DIALOG_DATA, useValue: { game: mockGame, accessCode: '1234', isLobbyCreated: true } },
//                 { provide: AccessCodeService, useValue: mockAccessCodeService },
//                 { provide: SnackbarService, useValue: mockSnackbarService },
//                 { provide: SocketClientService, useValue: mockSocketClientService },
//             ],
//         }).compileComponents();

//         fixture = TestBed.createComponent(CharacterFormComponent);
//         component = fixture.componentInstance;
//         httpMock = TestBed.inject(HttpTestingController);
//         fixture.detectChanges();
//     });

//     afterEach(() => {
//         httpMock.verify();
//     });

//     it('should create', () => {
//         expect(component).toBeTruthy();
//     });

//     it('should call assignBonus from CharacterService with the correct attribute', () => {
//         const attribute: AttributeType = AttributeType.Vitality;
//         component.assignBonus(attribute);
//         expect(mockCharacterService.assignBonus).toHaveBeenCalledWith(attribute);
//     });

//     // it('should update createdPlayer.hp when assigning bonus to Vitality', () => {
//     //     const attribute: AttributeType = AttributeType.Vitality;
//     //     const expectedHpIncrease = 2;
//     //     component.assignBonus(attribute);
//     //     expect(component.createdPlayer.hp.max).toBe(mockCharacterService.attributes[AttributeType.Vitality] + expectedHpIncrease);
//     //     expect(component.createdPlayer.hp.current).toBe(mockCharacterService.attributes[AttributeType.Vitality] + expectedHpIncrease);
//     // });

//     // it('should update createdPlayer.speed when assigning bonus to Speed', () => {
//     //     const attribute: AttributeType = AttributeType.Speed;
//     //     const expectedSpeedIncrease = 2;
//     //     component.assignBonus(attribute);
//     //     expect(component.createdPlayer.speed).toBe(mockCharacterService.attributes[AttributeType.Speed] + expectedSpeedIncrease);
//     // });

//     it('should call assignDice from CharacterService and update selected dice values', () => {
//         const attribute: AttributeType = AttributeType.Attack;
//         mockCharacterService.assignDice.and.returnValue({ attack: DiceType.D6, defense: DiceType.D4 });
//         component.assignDice(attribute);
//         expect(mockCharacterService.assignDice).toHaveBeenCalledWith(attribute);
//         expect(component.createdPlayer.attack.bonusDice).toBe(DiceType.D6);
//         expect(component.selectedAttackDice).toBe(DiceType.D6);
//     });

//     it('should call assignDice from CharacterService and update selected dice values', () => {
//         const attribute: AttributeType = AttributeType.Attack;
//         mockCharacterService.assignDice.and.returnValue({ attack: null, defense: null });
//         component.assignDice(attribute);
//         expect(mockCharacterService.assignDice).toHaveBeenCalledWith(attribute);
//         expect(component.selectedAttackDice).toBe(null);
//     });

//     // it('should call submitCharacter and closePopup when valid', async () => {
//     //     spyOn(component, 'closePopup');
//     //     mockCharacterService.isCharacterValid.and.returnValue(true);
//     //     mockCharacterService.submitCharacter.and.callFake((player, game, callback) => {
//     //         callback();
//     //     });

//     //     component.game = mockGame;
//     //     await component.submitCharacter();

//     //     expect(mockCharacterService.isCharacterValid).toHaveBeenCalled();
//     //     expect(mockCharacterService.submitCharacter).toHaveBeenCalled();
//     //     expect(component.closePopup).toHaveBeenCalled();
//     // });

//     // it('should not submit character if invalid', async () => {
//     //     spyOn(component, 'closePopup');
//     //     mockCharacterService.isCharacterValid.and.returnValue(false);
//     //     await component.submitCharacter();
//     //     expect(mockCharacterService.submitCharacter).not.toHaveBeenCalled();
//     //     expect(component.closePopup).not.toHaveBeenCalled();
//     // });

//     it('should close popup when closePopup is called', () => {
//         component.closePopup();
//         expect(mockCharacterService.resetAttributes).toHaveBeenCalled();
//         expect(mockDialogRef.close).toHaveBeenCalled();
//     });

//     // it('should show an error if the character name is unavailable', () => {
//     //     component.unavailableNames = ['TakenName'];
//     //     component.createdPlayer.name = 'TakenName';
//     //     const isValid = component['isCharacterValid']();
//     //     expect(isValid).toBeFalse();
//     //     expect(mockCharacterService.showMissingDetailsError).not.toHaveBeenCalled();
//     // });

//     it('should show an error if the avatar is unavailable', () => {
//         component.unavailableAvatars = ['Avatar1'];
//         component.createdPlayer.avatar = 'Avatar1';
//         const isValid = component['isCharacterValid']();
//         expect(isValid).toBeFalse();
//     });

//     it('should update unavailable names and avatars when receiving unavailable options', () => {
//         const mockData = { names: ['TakenName1', 'TakenName2'], avatars: ['Avatar1', 'Avatar2'] };
//         let callback: ((data: { names: string[]; avatars: string[] }) => void) | undefined;

//         mockSocketClientService.onUpdateUnavailableOptions.and.callFake((cb) => {
//             callback = cb;
//             return () => {};
//         });

//         component.ngOnInit();

//         expect(mockSocketClientService.emit).toHaveBeenCalledWith('requestUnavailableOptions', component.currentAccessCode);

//         if (callback) {
//             callback(mockData);
//         }
//         expect(component.unavailableAvatars).toEqual(mockData.avatars);
//     });

//     it('should update createdPlayer.speed and movementPoints when assigning bonus to Speed', () => {
//         const mockSpeedValue = 6;
//         mockCharacterService.attributes[AttributeType.Speed] = mockSpeedValue;

//         component.assignBonus(AttributeType.Speed);

//         expect(component.createdPlayer.speed).toBe(mockSpeedValue);
//         expect(component.createdPlayer.movementPoints).toBe(mockSpeedValue);
//     });

//     it('should handle JoinedLobby by submitting character and closing dialog', () => {
//         mockCharacterService.submitCharacter.and.callFake((player, game, callback) => {
//             callback();
//         });

//         (component as any).handleLobbyJoining(JoinLobbyResult.JoinedLobby);

//         expect(mockCharacterService.submitCharacter).toHaveBeenCalledWith(component.createdPlayer, component.game as Game, jasmine.any(Function));
//         expect(sessionStorage.setItem).toHaveBeenCalledWith('player', JSON.stringify(component.createdPlayer));
//         expect(mockCharacterService.resetAttributes).toHaveBeenCalled();
//         expect(mockDialogRef.close).toHaveBeenCalled();
//     });

//     it('should handle StayInLobby by doing nothing', () => {
//         (component as any).handleLobbyJoining(JoinLobbyResult.StayInLobby);

//         expect(mockCharacterService.submitCharacter).not.toHaveBeenCalled();
//         expect(mockDialogRef.close).not.toHaveBeenCalled();
//         expect(mockCharacterService.returnHome).not.toHaveBeenCalled();
//         expect(sessionStorage.setItem).not.toHaveBeenCalled();
//     });

//     it('should handle RedirectToHome by calling returnHome', () => {
//         (component as any).handleLobbyJoining(JoinLobbyResult.RedirectToHome);

//         expect(mockCharacterService.resetAttributes).toHaveBeenCalled();
//         expect(mockDialogRef.close).toHaveBeenCalled();
//         expect(mockCharacterService.returnHome).toHaveBeenCalled();
//     });

//     it('should exit early when game is undefined in submitCharacterForm', () => {
//         component.game = undefined;
//         const mockPlayer = component.createdPlayer;

//         component['submitCharacterForm']();

//         expect(mockCharacterService.submitCharacter).not.toHaveBeenCalledWith(mockPlayer, jasmine.any(Object), jasmine.any(Function));
//         expect(sessionStorage.setItem).not.toHaveBeenCalled();
//         expect(mockDialogRef.close).not.toHaveBeenCalled();
//     });

//     describe('Character Validation', () => {
//         it('should call returnHome and exit early if game is undefined', async () => {
//             component.game = undefined;
//             await component.submitCharacter();
//             expect(mockCharacterService.returnHome).toHaveBeenCalled();
//         });

//         it('should not submit character if invalid', async () => {
//             spyOn(component, 'closePopup');
//             mockCharacterService.isCharacterValid.and.returnValue(false);
//             await component.submitCharacter();
//             expect(mockCharacterService.submitCharacter).not.toHaveBeenCalled();
//             expect(component.closePopup).not.toHaveBeenCalled();
//         });

//         it('should set access code and join existing lobby when validation passes', async () => {
//             spyOn(component as any, 'isCharacterValid').and.returnValue(true);
//             const handleLobbySpy = spyOn<any>(component, 'handleLobbyJoining');

//             mockCharacterService.joinExistingLobby.and.resolveTo(JoinLobbyResult.JoinedLobby);

//             await component.submitCharacter();

//             expect(mockAccessCodeService.setAccessCode).toHaveBeenCalledWith('1234');
//             expect(mockCharacterService.joinExistingLobby).toHaveBeenCalledWith('1234', component.createdPlayer);
//             expect(handleLobbySpy).toHaveBeenCalledWith(JoinLobbyResult.JoinedLobby);
//         });

//         it('should create new lobby and submit form when not existing lobby', async () => {
//             component.isLobbyCreated = false;
//             spyOn(component as any, 'isCharacterValid').and.returnValue(true);
//             spyOn(component as any, 'submitCharacterForm');

//             await component.submitCharacter();

//             expect(component.createdPlayer.isAdmin).toBeTrue();
//             expect(mockCharacterService.createAndJoinLobby).toHaveBeenCalledWith(mockGame, component.createdPlayer);
//             expect(component['submitCharacterForm']).toHaveBeenCalled();
//         });
//     });

//     describe('checkCharacterNameLength()', () => {
//         it('should delegate to character service with current player name', () => {
//             const testName = 'TestPlayer';
//             component.createdPlayer.name = testName;

//             component.checkCharacterNameLength();

//             expect(mockCharacterService.checkCharacterNameLength).toHaveBeenCalledWith(testName);
//         });

//         it('should handle empty name validation', () => {
//             component.createdPlayer.name = '';

//             component.checkCharacterNameLength();

//             expect(mockCharacterService.checkCharacterNameLength).toHaveBeenCalledWith('');
//         });

//         it('should not call service when player is undefined', () => {
//             component.createdPlayer = undefined as unknown as Player;

//             component.checkCharacterNameLength();

//             expect(mockCharacterService.checkCharacterNameLength).not.toHaveBeenCalled();
//         });
//     });

//     describe('Character Validation', () => {
//         it('should return false when character service validation fails', () => {
//             mockCharacterService.isCharacterValid.and.returnValue(false);

//             const isValid = component['isCharacterValid']();

//             expect(mockCharacterService.showMissingDetailsError).toHaveBeenCalled();
//             expect(isValid).toBeFalse();
//         });

//         // it('should show name error when name is unavailable', () => {
//         //     mockCharacterService.isCharacterValid.and.returnValue(true);
//         //     component.createdPlayer.name = 'ExistingName';

//         //     const isValid = component['isCharacterValid']();

//         //     expect(mockSnackbarService.showMessage).toHaveBeenCalledWith('Ce nom est déjà utilisé !');
//         //     expect(isValid).toBeFalse();
//         // });

//         // it('should show avatar error when avatar is unavailable', () => {
//         //     mockCharacterService.isCharacterValid.and.returnValue(true);
//         //     component.unavailableAvatars = ['ExistingAvatar'];
//         //     component.createdPlayer.avatar = 'ExistingAvatar';

//         //     const isValid = component['isCharacterValid']();

//         //     expect(mockSnackbarService.showMessage).toHaveBeenCalledWith('Cet avatar est déjà pris !');
//         //     expect(isValid).toBeFalse();
//         // });

//         it('should return true when all validations pass', () => {
//             mockCharacterService.isCharacterValid.and.returnValue(true);
//             component.unavailableAvatars = [];
//             component.createdPlayer.name = 'UniqueName';
//             component.createdPlayer.avatar = 'UniqueAvatar';

//             const isValid = component['isCharacterValid']();

//             expect(isValid).toBeTrue();
//         });
//     });
// });
