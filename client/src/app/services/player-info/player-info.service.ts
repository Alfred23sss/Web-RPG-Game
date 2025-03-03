import { Injectable } from '@angular/core';
import { Item } from '@app/classes/item';
import { AttributeType } from '@app/enums/global.enums';
import { ItemModifier } from '@app/interfaces/item-attributes';
import { PlayerInfo } from '@app/interfaces/player';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
    providedIn: 'root',
})
export class PlayerInfoService {
    playerInfo$!: Observable<PlayerInfo>;
    private playerState!: BehaviorSubject<PlayerInfo>;

    initializePlayer(playerInfo: PlayerInfo): void {
        this.playerState = new BehaviorSubject<PlayerInfo>(playerInfo);
        this.playerInfo$ = this.playerState.asObservable();
    }

    addItemToInventory(item: Item): boolean {
        const currentPlayer = this.playerState.value;

        const inventory = currentPlayer.inventory;
        const emptySlotIndex = inventory.findIndex((slot) => slot === null);

        if (emptySlotIndex !== -1) {
            inventory[emptySlotIndex] = item;
            this.playerState.next({ ...currentPlayer, inventory });
            if (item.modifiers) {
                this.applyModifiers(item.modifiers);
            }
            return true;
        }

        return false;
    }

    removeItemFromInventory(index: number): boolean {
        const currentPlayer = this.playerState.value;
        if (index < 0 || index >= currentPlayer.inventory.length) return false;

        const inventory = currentPlayer.inventory;
        inventory[index] = null;
        this.playerState.next({ ...currentPlayer, inventory });
        return true;
    }

    getPlayerInfo(): PlayerInfo {
        return JSON.parse(JSON.stringify(this.playerState.value)) as PlayerInfo;
    }

    getInventory(): [Item | null, Item | null] {
        const playerInventory = this.playerState.value?.inventory;
        return playerInventory ? playerInventory : [null, null];
    }

    updateHealth(healthVariation: number): void {
        const currentPlayer = this.playerState.value;
        if (!currentPlayer) return;

        const clampedHealth = Math.max(0, Math.min(currentPlayer.hp.current + healthVariation, currentPlayer.hp.max));

        if (clampedHealth === 0) return;

        const conditionalModifiers = currentPlayer.inventory
            .filter((item): item is Item & { condition: { threshold: number; effect: ItemModifier[] } } => !!item?.condition?.effect)
            .flatMap((item) => {
                const healthPercentage = clampedHealth / currentPlayer.hp.max;
                if (healthPercentage <= item.condition.threshold) {
                    return item.condition.effect;
                }
                return [];
            });

        if (conditionalModifiers.length > 0) {
            this.applyModifiers(conditionalModifiers);
        }

        this.playerState.next({
            ...currentPlayer,
            hp: {
                ...currentPlayer.hp,
                current: clampedHealth,
            },
        });
    }

    restoreHealth(): void {
        const currentPlayer = this.playerState.value;
        this.playerState.next({
            ...currentPlayer,
            hp: {
                ...currentPlayer.hp,
                current: currentPlayer.hp.max,
            },
        });
    }

    private applyModifiers(modifiers: ItemModifier[]): void {
        let currentPlayer = this.playerState.value;

        modifiers.forEach((mod) => {
            switch (mod.attribute) {
                case AttributeType.Attack:
                    currentPlayer = {
                        ...currentPlayer,
                        attack: {
                            ...currentPlayer.attack,
                            value: currentPlayer.attack.value + mod.value,
                        },
                    };
                    break;

                case AttributeType.Defense:
                    currentPlayer = {
                        ...currentPlayer,
                        defense: {
                            ...currentPlayer.defense,
                            value: currentPlayer.defense.value + mod.value,
                        },
                    };
                    break;

                case AttributeType.Vitality:
                    currentPlayer = {
                        ...currentPlayer,
                        hp: {
                            current: Math.min(currentPlayer.hp.current + mod.value, currentPlayer.hp.max),
                            max: currentPlayer.hp.max + mod.value,
                        },
                    };
                    break;

                case AttributeType.Speed:
                    currentPlayer = {
                        ...currentPlayer,
                        speed: currentPlayer.speed + mod.value,
                    };
                    break;
            }
        });

        this.playerState.next(currentPlayer);
    }
}
