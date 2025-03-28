// import { Injectable } from '@nestjs/common';
// import { GridManagerService } from '@app/services/grid-manager/grid-manager.service';
// import { GameSession } from '@app/interfaces/GameSession';
// import { Player } from '@app/interfaces/Player';
// import { Item } from '@app/interfaces/Item';

// @Injectable()
// export class InventoryManagerService {
//     constructor(private readonly gridManager: GridManagerService) {}

//     // choisir item???
//     removeChosenItem(accessCode: string, playerName: string, item: string): void {
//         const gameSession = this.gameSession.getGameSession(accessCode);
//         const player = gameSession.turn.orderedPlayers.find((p) => p.name === playerName);
//         const tile = this.gridManager.findTileByPlayer(gameSession.game.grid, player);

//         if (tile.item?.name === item) {
//             return;
//         }

//         for (let i = 0; i < player.inventory.length; i++) {
//             if (player.inventory[i]?.name === item) {
//                 tile.item = player.inventory[i];
//                 player.inventory[i] = null;
//                 this.gameSession.updatePlayer(player, { inventory: player.inventory });
//                 this.gameSession.emitGridUpdate(accessCode, gameSession.game.grid);
//             }
//         }
//         return;
//     }

//     // dropper toute les items
//     dropAllItems(accessCode: string, playerName: string): void {
//         const gameSession = this.gameSession.getGameSession(accessCode);
//         const player = gameSession.turn.orderedPlayers.find((p) => p.name === playerName);
//         const tile = this.gridManager.findTileByPlayer(gameSession.game.grid, player);

//         for (let i = 0; i < player.inventory.length; i++) {
//             if (player.inventory[i]) {
//                 tile.item = player.inventory[i];
//                 player.inventory[i] = null;
//             }
//         }
//         this.gameSession.updatePlayer(player, { inventory: player.inventory });
//         this.gameSession.emitGridUpdate(accessCode, gameSession.game.grid);
//         return;
//         // trouver tile la plus proche incluant ou il se trouve et placer un objet dessus
//     }
// }
