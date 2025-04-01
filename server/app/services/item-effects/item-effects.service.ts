import { AttributeType, ItemName, TileType } from '@app/enums/enums';
import { Item, ItemModifier } from '@app/interfaces/Item';
import { Player } from '@app/interfaces/Player';
import { Tile } from '@app/interfaces/Tile';
import { Injectable, Logger } from '@nestjs/common';

const HEALTH_CONDITION_THRESHOLD = 0.5;

@Injectable()
export class ItemEffectsService {
    addEffect(player: Player, item: Item, tile: Tile) {
        if (item === null) return;
        Logger.log(`Picked up: ${item.name}`);
        this.applyItemModifiers(item);

        if (
            item.isActive ||
            (item.name === ItemName.Fire && !this.isHealthConditionValid(player, item)) ||
            (item.name === ItemName.Swap && !this.isIceConditionValid(tile, item))
        ) {
            Logger.log('conditions failed');
            return;
        }
        if (item.modifiers) {
            item.modifiers.forEach((mod) => this.applyModifier(player, mod, 1));
        }
        item.isActive = true;
    }

    removeEffects(player: Player, index: number): void {
        const item = player.inventory[index];
        Logger.log('removeEffects');

        if (!item || !item.isActive) {
            Logger.log('conditions failed');
            return;
        }

        if (item.modifiers) {
            item.modifiers.forEach((mod) => this.applyModifier(player, mod, -1));
        }

        item.isActive = false;
    }

    applyItemModifiers(item: Item) {
        if (item.name === ItemName.Potion) {
            item.modifiers = [
                { attribute: AttributeType.Attack, value: 2 },
                { attribute: AttributeType.Defense, value: -1 },
            ];
            item.isActive = false;
        }
        if (item.name === ItemName.Rubik) {
            item.modifiers = [
                { attribute: AttributeType.Speed, value: 2 },
                { attribute: AttributeType.Defense, value: -1 },
            ];
            item.isActive = false;
        }
        if (item.name === ItemName.Fire) {
            item.modifiers = [{ attribute: AttributeType.Attack, value: 2 }];
            item.isActive = false;
        }
        if (item.name === ItemName.Swap) {
            item.modifiers = [{ attribute: AttributeType.Defense, value: 2 }];
            item.isActive = false;
        }
    }

    isHealthConditionValid(player: Player, item: Item): boolean {
        return item.name !== ItemName.Fire || player.hp.current <= player.hp.max * HEALTH_CONDITION_THRESHOLD;
    }

    isIceConditionValid(tile: Tile, item: Item): boolean {
        return item.name !== ItemName.Swap || tile.type === TileType.Ice;
    }

    private applyModifier(player: Player, modifier: ItemModifier, multiplier: number) {
        Logger.log('Applying Modifiers');
        Logger.log(`Multiplier: ${multiplier}`);
        const adjustedValue = modifier.value * multiplier;
        switch (modifier.attribute) {
            case AttributeType.Attack:
                player.attack.value += adjustedValue;
                break;
            case AttributeType.Defense:
                player.defense.value += adjustedValue;
                break;
            case AttributeType.Speed:
                player.speed += adjustedValue;
                break;
            case AttributeType.Hp:
                player.hp.current += adjustedValue;
                player.hp.max += adjustedValue;
                break;
            default:
                Logger.log(`Unknown attribute type: ${modifier.attribute}`);
                break;
        }
    }
}
