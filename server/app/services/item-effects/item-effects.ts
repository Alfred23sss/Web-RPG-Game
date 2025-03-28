import { ItemName, TileType } from '@app/enums/enums';
import { Item, ItemModifier } from '@app/interfaces/Item';
import { Player } from '@app/interfaces/Player';
import { Tile } from '@app/interfaces/Tile';
import { Injectable } from '@nestjs/common';

const HEALTH_CONDITION_THRESHOLD = 0.5;

@Injectable()
export class ItemEffectsService {
    addEffect(player: Player, item: Item, tile: Tile) {
        if (item.isActive || !this.isHealthConditionValid(player, item) || !this.isIceConditionValid(tile, item)) return;

        item.modifiers.forEach((mod) => this.applyModifier(player, mod, 1));

        item.isActive = true;
    }

    removeEffect(player: Player, item: Item) {
        if (!item.isActive) return;

        item.modifiers.forEach((mod) => this.applyModifier(player, mod, -1));

        item.isActive = false;
    }

    private applyModifier(player: Player, modifier: ItemModifier, multiplier: number) {
        const attributePath = modifier.attribute.split('.');
        let current: Player = player;

        for (let i = 0; i < attributePath.length - 1; i++) {
            const part = attributePath[i];
            if (!current[part]) {
                console.error(`Invalid attribute path: ${modifier.attribute}`);
                return;
            }
            current = current[part];
        }

        const lastPart = attributePath[attributePath.length - 1];
        const currentValue = current[lastPart];

        if (typeof currentValue === 'number') {
            current[lastPart] += modifier.value * multiplier;
        } else {
            console.error(`Cannot modify non-numeric attribute: ${modifier.attribute}`);
        }
    }

    private isHealthConditionValid(player: Player, item: Item): boolean {
        return item.name === ItemName.Potion && player.hp.current <= player.hp.max * HEALTH_CONDITION_THRESHOLD;
    }

    private isIceConditionValid(tile: Tile, item: Item): boolean {
        return item.name === ItemName.Stop && tile.type === TileType.Ice;
    }
}
