import { Item } from '@app/interfaces/Item';
import { Player } from '@app/interfaces/Player';
import { Injectable } from '@nestjs/common';
<<<<<<< HEAD
import { ItemEffectsService } from '@app/services/item-effects/item-effects';

@Injectable()
export class InventoryManagerService {
    constructor(private readonly itemEffectService: ItemEffectsService) {}

    addItem(player: Player, newItem: Item, slotToReplace?: number): void {
        const inventory = player.inventory || [null, null];
        const emptySlot = inventory.findIndex((item) => item === null);

        if (emptySlot !== -1) {
            inventory[emptySlot] = newItem;
        } else {
            const oldItem = inventory[slotToReplace];
            if (oldItem) {
                this.itemEffectService.removeEffect(player, oldItem);
            }
            inventory[slotToReplace] = newItem;
        }

        this.itemEffectService.applyEffect(player, newItem);
        player.inventory = inventory;
    }

    removeItem(player: Player, slot: number): void {
        const inventory = player.inventory;
        if (inventory[slot] === null) return;
        this.itemEffectService.removeEffect(player, inventory[slot]);
        inventory[slot] = null;
    }

    isInventoryFull(player: Player): boolean {
        const inventory = player.inventory;
        return inventory.every((item) => item !== null);
=======
import { GameSessionService } from '../game-session/game-session.service';
import { GridManagerService } from '../grid-manager/grid-manager.service';

@Injectable()
export class InventoryManagerService {
    constructor(
        private readonly gridManager: GridManagerService,
        private readonly gameSession: GameSessionService,
    ) {}

    //ajouter item a player
    addItemToPlayer(accessCode: string, playerName: string): void {
        const gameSession = this.gameSession.getGameSession(accessCode);
        const player = gameSession.turn.orderedPlayers.find((p) => p.name === playerName);
        let tile = this.gridManager.findTileByPlayer(gameSession.game.grid, player);

        if (tile.item) {
            for (let i = 0; i < player.inventory.length; i++) {
                if (!player.inventory[i]) {
                    player.inventory[i] = tile.item;
                    tile.item = undefined;
                    this.gameSession.updatePlayer(player, { inventory: player.inventory });
                    this.gameSession.emitGridUpdate(accessCode, gameSession.game.grid);
                    return;
                }
            }
        }
        // call items chose
    }

    // choisir item???
    removeChosenItem(accessCode: string, playerName: string, item: string): void {
        const gameSession = this.gameSession.getGameSession(accessCode);
        const player = gameSession.turn.orderedPlayers.find((p) => p.name === playerName);
        let tile = this.gridManager.findTileByPlayer(gameSession.game.grid, player);

        if (tile.item?.name === item) {
            return;
        }

        for (let i = 0; i < player.inventory.length; i++) {
            if (player.inventory[i]?.name === item) {
                tile.item = player.inventory[i];
                player.inventory[i] = null;
                this.gameSession.updatePlayer(player, { inventory: player.inventory });
                this.gameSession.emitGridUpdate(accessCode, gameSession.game.grid);
            }
        }
        return;
    }

    // dropper toute les items
    dropAllItems(accessCode: string, playerName: string): void {
        const gameSession = this.gameSession.getGameSession(accessCode);
        const player = gameSession.turn.orderedPlayers.find((p) => p.name === playerName);
        let tile = this.gridManager.findTileByPlayer(gameSession.game.grid, player);

        for (let i = 0; i < player.inventory.length; i++) {
            if (player.inventory[i]) {
                //tile.item = player.inventory[i];
                player.inventory[i] = null;
            }
        }
        this.gameSession.updatePlayer(player, { inventory: player.inventory });
        this.gameSession.emitGridUpdate(accessCode, gameSession.game.grid);
        return;
        //trouver tile la plus proche incluant ou il se trouve et placer un objet dessus
>>>>>>> origin/feature/inventory
    }
}
