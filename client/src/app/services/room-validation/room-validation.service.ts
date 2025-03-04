// import { Injectable } from '@angular/core';
// import { Game } from '@app/interfaces/game';
// import { Player } from '@app/interfaces/player';
// import { SocketClientService } from '@app/services/socket/socket-client-service';

// @Injectable({
//     providedIn: 'root',
// })
// // change to another service
// export class RoomValidationService {
//     // private currentAccessCode: string = '';

//     constructor(private readonly socketClientService: SocketClientService) {}

//     joinExistingGame(accessCode: string, player: Player): void {
//         this.socketClientService.joinLobby(accessCode, player);
//     }

//     createAndJoinGame(game: Game, player: Player): void {
//         this.socketClientService.createLobby(game);
//         this.socketClientService.joinLobby(game.accessCode, player);
//     }
//     // // changer nom de certaine fonction et des if qui sont mal fait selon nom de fonction est valeur de retour
//     // validateAccessCode(code: string): boolean {
//     //     if (!this.activeAccessCodes.has(code)) {
//     //         return false;
//     //     }
//     //     this.currentAccessCode = code;
//     //     return true;
//     // }

//     // createCode(code: string) {
//     //     this.postAccessCode(code);
//     // }

//     // generateAccessCode(): void {
//     //     this.currentAccessCode = Math.floor(ACCESS_CODE_MIN_VALUE + Math.random() * ACCESS_CODE_RANGE).toString();

//     //     if (this.containsCode(this.currentAccessCode)) {
//     //         this.generateAccessCode();
//     //     } else {
//     //         this.accessCodes.push(this.currentAccessCode);
//     //     }
//     // }

//     // joinGame(game: Game, player: Player): void {
//     //     if (this.isCreating(game)) {
//     //         console.log('creating game');
//     //         this.generateAccessCode();
//     //         player.isAdmin = true;
//     //         this.postAccessCode(this.currentAccessCode);
//     //     }
//     //     console.log('joining game');
//     //     this.socketClientService.joinLobby(this.currentAccessCode, player);
//     //     console.log('joined game');
//     //     // this.validateCode(this.currentAccessCode); //on aura surement besoin de le mettre assurer pas trop de joeur qui rentre
//     //     this.loadAccessCodes();
//     // }

//     // isCreating(game: Game): boolean {
//     //     return game !== undefined;
//     // }

//     // loadAccessCodes(): void {
//     //     this.accessCodeCommunication.getAccessCodes().subscribe({
//     //         next: (codes) => (this.accessCodes = codes.map((c) => c.code)),
//     //     });
//     // }

//     // private isGameUnlock(): boolean {
//     //     // Add logic if needed
//     //     return true;
//     // }

//     // private containsCode(code: string): boolean {
//     //     return this.accessCodes.includes(code);
//     // }

//     // private postAccessCode(code: string): void {
//     //     this.accessCodeCommunication.createAccessCode(code).subscribe({
//     //         next: () => {
//     //             this.socketClientService.createLobby(code);
//     //         },
//     //     });
//     // }
// }
