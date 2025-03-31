import { AttributeType, ItemName, TileType } from '@app/enums/enums';
import { Item, ItemModifier } from '@app/interfaces/Item';
import { Player } from '@app/interfaces/Player';
import { Tile } from '@app/interfaces/Tile';
import { Injectable } from '@nestjs/common';

const HEALTH_CONDITION_THRESHOLD = 0.5;

@Injectable()
export class ItemEffectsService {
    addEffect(player: Player, item: Item, tile: Tile) {
        if (item === null) return;
        console.log(`Picked up: ${item.name}`);
        this.applyItemModifiers(item);

        if (
            item.isActive ||
            (item.name === ItemName.Fire && !this.isHealthConditionValid(player, item)) ||
            (item.name === ItemName.Stop && !this.isIceConditionValid(tile, item))
        ) {
            console.log('conditions failed');
            return;
        }
        if (item.modifiers) {
            item.modifiers.forEach((mod) => this.applyModifier(player, mod, 1));
        }
        item.isActive = true;
    }

    removeEffects(player: Player, index: number): void {
        const item = player.inventory[index];

        if (!item || !item.isActive) return;

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
    }

    private applyModifier(player: Player, modifier: ItemModifier, multiplier: number) {
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
                console.log(`Unknown attribute type: ${modifier.attribute}`);
                break;
        }
    }

    private isHealthConditionValid(player: Player, item: Item): boolean {
        return item.name !== ItemName.Fire || player.hp.current <= player.hp.max * HEALTH_CONDITION_THRESHOLD;
    }

    private isIceConditionValid(tile: Tile, item: Item): boolean {
        return item.name !== ItemName.Stop || tile.type === TileType.Ice;
    }
}
