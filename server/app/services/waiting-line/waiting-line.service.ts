// import { Player } from '@app/interfaces/Player';
// import { Injectable } from '@nestjs/common';

// @Injectable()
// export class WaitingLineService {
//     private waitingLines: Map<string, Player[]> = new Map();

//     addPlayer(roomId: string, player: Player): void {
//         if (!this.waitingLines.has(roomId)) {
//             this.waitingLines.set(roomId, []);
//         }
//         this.waitingLines.get(roomId).push(player);
//     }

//     removePlayer(roomId: string, playerId: string): void {
//         if (this.waitingLines.has(roomId)) {
//             const waitingLine = this.waitingLines.get(roomId);
//             this.waitingLines.set(
//                 roomId,
//                 waitingLine.filter((p) => p.playerInfo.name !== playerId),
//             );
//         }
//     }

//     getWaitingLine(roomId: string): Player[] {
//         return this.waitingLines.get(roomId) || [];
//     }

//     clearWaitingLine(roomId: string): void {
//         this.waitingLines.delete(roomId);
//     }

//     isAdmin(roomId: string, playerId: string): boolean {
//         const waitingLine = this.waitingLines.get(roomId);
//         if (!waitingLine) return false;

//         const player = waitingLine.find((p) => p.playerInfo.name === playerId);
//         return player ? player.playerInfo.isAdmin : false;
//     }

//     getAllWaitingLines(): Map<string, Player[]> {
//         return this.waitingLines;
//     }
// }
