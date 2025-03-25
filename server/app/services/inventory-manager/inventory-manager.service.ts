import { Tile } from '@app/interfaces/Tile';
import { Item } from '@app/model/database/item';
import { Player } from '@app/model/database/player';
import { Injectable } from '@nestjs/common';
import { GridManagerService } from '../grid-manager/grid-manager.service';

@Injectable()
export class InventoryManagerService {
    constructor(private readonly gridManager: GridManagerService) {}

    //ajouter item a player
    addItemToPlayer(grid: Tile[][], player: Player): void {
        let tile = this.gridManager.findTileByPlayer(grid, player);
        for (const item of player.inventory) {
            if (item) {
                // ajouter a l'inventaire
                // emit success
                tile.item = undefined;
                return;
            }
        }
        // call items chose

        //this.emitGridUpdate(accessCode, gameSession.game.grid);
    }

    // choisir item???
    removeChosenItem(grid: Tile[][], player: Player, item: Item): void {
        // déterminer item a jeter
        // remplacer inventaire au besoin
        // placer bon item sur la grid
    }

    // dropper toute les items
    dropAllItems(grid: Tile[][], player: Player): void {
        //pour i item de inventaire pas null
        //trouver tile la plus proche incluant ou il se trouve et placer un objet dessus
    }
}
