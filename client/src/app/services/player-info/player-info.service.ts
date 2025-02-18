import { Injectable } from '@angular/core';
import { Item } from '@app/classes/item';
import { PlayerInfo } from '@app/interfaces/player';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
    providedIn: 'root',
})
export class PlayerInfoService {
    playerInfo$!: Observable<PlayerInfo | null>;
    private playerState = new BehaviorSubject<PlayerInfo | null>(null);

    constructor() {
        this.playerInfo$ = this.playerState.asObservable();
    }

    initializePlayer(playerInfo: PlayerInfo): void {
        this.playerState.next(playerInfo);
        // console.log(`attack : ${playerInfo.attack.value} with bonus ${playerInfo.attack.bonusDice}`);
        // console.log(`defense : ${playerInfo.defense.value} with bonus ${playerInfo.defense.bonusDice}`);
        // console.log(`speed : ${playerInfo.speed}`);
        // console.log(`hp : ${playerInfo.hp.current}`);
        // console.log(`name : ${playerInfo.name}`);
        // console.log(`inventory[0] : ${playerInfo.inventory[0]}`);
        // console.log(`inventory[1] : ${playerInfo.inventory[1]}`);
        // console.log(`hp : ${playerInfo.avatar}`);
    }

    addItemToInventory(item: Item): boolean {
        const currentPlayer = this.playerState.value;
        if (!currentPlayer) return false;

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
        if (!currentPlayer || index < 0 || index >= currentPlayer.inventory.length) return false;

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

        const clampedHealth = Math.max(0, Math.min(currentPlayer.hp.current - healthVariation, currentPlayer.hp.max));

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
}
