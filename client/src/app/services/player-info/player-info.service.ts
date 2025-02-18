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
}
