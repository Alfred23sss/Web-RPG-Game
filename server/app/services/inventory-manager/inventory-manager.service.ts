import { Item } from '@app/interfaces/Item';
import { Player } from '@app/interfaces/Player';
import { Injectable } from '@nestjs/common';
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
    }
}
