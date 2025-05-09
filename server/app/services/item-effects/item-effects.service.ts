import { BONUS_VALUE, HEALTH_CONDITION_THRESHOLD, MULTIPLIER, PENALTY_VALUE, RANDOMIZER } from '@app/constants/constants';
import { AttributeType, EventEmit } from '@app/enums/enums';
import { VirtualPlayerEvents } from '@app/gateways/virtual-player/virtual-player.gateway.events';
import { Item, ItemModifier } from '@app/interfaces/item';
import { Player } from '@app/interfaces/player';
import { Tile } from '@app/interfaces/tile';
import { GridManagerService } from '@app/services/grid-manager/grid-manager.service';
import { ItemName, TileType } from '@common/enums';
import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from 'eventemitter2';

@Injectable()
export class ItemEffectsService {
    constructor(
        private readonly eventEmitter: EventEmitter2,
        private readonly gridManager: GridManagerService,
    ) {}
    addEffect(player: Player, item: Item, tile: Tile) {
        if (item === null) return;
        if (!item.modifiers && item.name !== ItemName.GreatShield && item.name !== ItemName.Pickaxe) {
            this.applyItemModifiers(item);
        }
        if (this.shouldSkipItemApplication(item, player, tile)) return;
        if (item.modifiers) {
            item.modifiers.forEach((mod) => this.applyModifier(player, mod, MULTIPLIER));
        }
        item.isActive = true;
    }

    removeEffects(player: Player, index: number): void {
        const item = player.inventory[index];

        if (!item || !item.isActive) {
            return;
        }

        if (item.modifiers) {
            item.modifiers.forEach((mod) => this.applyModifier(player, mod, -MULTIPLIER));
        }

        item.isActive = false;
    }

    applyItemModifiers(item: Item) {
        switch (item.name) {
            case ItemName.BlackSword:
                item.modifiers = [
                    { attribute: AttributeType.Attack, value: BONUS_VALUE },
                    { attribute: AttributeType.Defense, value: PENALTY_VALUE },
                ];
                break;
            case ItemName.Armor:
                item.modifiers = [
                    { attribute: AttributeType.Hp, value: BONUS_VALUE },
                    { attribute: AttributeType.Speed, value: PENALTY_VALUE },
                ];
                break;
            case ItemName.IceSword:
                item.modifiers = [{ attribute: AttributeType.Attack, value: BONUS_VALUE }];
                break;
            case ItemName.IceShield:
                item.modifiers = [{ attribute: AttributeType.Defense, value: BONUS_VALUE }];
                break;
            default:
                return;
        }

        item.isActive = false;
    }

    isHealthConditionValid(player: Player, item: Item): boolean {
        return item.name !== ItemName.IceSword || player.hp.current <= player.hp.max * HEALTH_CONDITION_THRESHOLD;
    }

    isIceConditionValid(tile: Tile, item: Item): boolean {
        if (tile === undefined) return false;
        return item.name !== ItemName.IceShield || tile.type === TileType.Ice;
    }

    handleItemDropped(player: Player, item: Item, grid: Tile[][], accessCode: string): { name: string; player: Player } {
        const index = player.inventory.findIndex((invItem) => invItem.id === item.id);
        const tile = this.gridManager.findTileByPlayer(grid, player);
        if (index !== -1) {
            this.removeEffects(player, index);
            const newItem = tile.item;
            player.inventory.splice(index, 1);
            player.inventory.push(newItem);
            item.isActive = false;
            tile.item = item;
            tile.player = player;
            this.addEffect(player, newItem, tile);
        }
        player = {
            ...player,
            attack: { ...player.attack },
            defense: { ...player.defense },
            hp: { ...player.hp },
            speed: player.speed,
            inventory: player.inventory,
        };
        this.eventEmitter.emit(EventEmit.GameGridUpdate, {
            accessCode,
            grid,
        });
        this.eventEmitter.emit(EventEmit.PlayerUpdate, {
            accessCode,
            player,
        });
        return { name: player.name, player };
    }

    handlePlayerItemReset(player: Player, grid: Tile[][], accessCode: string): { name: string; player: Player } {
        const playerTile = this.gridManager.findTileByPlayer(grid, player);
        player.inventory.forEach((item, index) => {
            if (item !== null) {
                this.removeEffects(player, index);
                if (item.name === ItemName.IceShield) {
                    player.defense.value -= BONUS_VALUE;
                }
            }
        });
        const shuffledInventory = [...player.inventory].sort(() => Math.random() - RANDOMIZER);
        if (shuffledInventory.length > 0 && !playerTile.item) {
            playerTile.item = shuffledInventory.shift();
        }
        shuffledInventory.forEach((item) => {
            const availableTile = this.gridManager.findClosestAvailableTile(grid, playerTile);
            if (availableTile) {
                availableTile.item = item;
            }
        });
        player = {
            ...player,
            attack: { ...player.attack },
            defense: { ...player.defense },
            hp: { ...player.hp },
            speed: player.speed,
            inventory: [null, null],
        };
        this.eventEmitter.emit(EventEmit.GameGridUpdate, {
            accessCode,
            grid,
        });
        this.eventEmitter.emit(EventEmit.PlayerUpdate, {
            accessCode,
            player,
        });
        return { name: player.name, player };
    }

    addItemToPlayer(player: Player, item: Item, grid: Tile[][], accessCode: string): { player: Player; items?: Item[] } {
        const tile = this.gridManager.findTileByPlayer(grid, player);
        if (tile.item) {
            for (let i = 0; i < player.inventory.length; i++) {
                if (!player.inventory[i]) {
                    player.inventory[i] = tile.item;
                    this.addEffect(player, tile.item, tile);
                    tile.item = null;
                    player = {
                        ...player,
                        attack: { ...player.attack },
                        defense: { ...player.defense },
                        hp: { ...player.hp },
                        speed: player.speed,
                        inventory: player.inventory,
                    };
                    this.eventEmitter.emit(EventEmit.GameGridUpdate, { accessCode, grid });
                    this.eventEmitter.emit(EventEmit.GamePlayerMovement, {
                        accessCode,
                        grid,
                        player,
                        isCurrentlyMoving: false,
                    });
                    return { player };
                }
            }
        }
        const items = [player.inventory[0], player.inventory[1], item];
        if (player.isVirtual) {
            this.eventEmitter.emit(VirtualPlayerEvents.ChooseItem, { accessCode, player, items, item });
        } else {
            this.eventEmitter.emit(EventEmit.ItemChoice, { player, items });
            this.eventEmitter.emit(EventEmit.GamePlayerMovement, {
                accessCode,
                grid,
                player,
                isCurrentlyMoving: false,
            });
        }
        return { player, items };
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
                break;
        }
    }

    private shouldSkipItemApplication(item: Item, player: Player, tile: Tile): boolean {
        if (item.isActive) return true;

        switch (item.name) {
            case ItemName.IceSword:
                return !this.isHealthConditionValid(player, item);
            case ItemName.IceShield:
                return !this.isIceConditionValid(tile, item);
            default:
                return false;
        }
    }
}
