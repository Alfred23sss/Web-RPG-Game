import { Injectable } from '@angular/core';
import { Item } from '@app/classes/item';
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

        const clampedHealth = Math.max(0, Math.min(currentPlayer.hp.current + healthVariation, currentPlayer.hp.max));

        if (clampedHealth === 0) {
            return;
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
        this.updateHealth(this.playerState.value.hp.max);
    }
}
