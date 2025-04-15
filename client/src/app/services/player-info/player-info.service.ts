import { Injectable } from '@angular/core';
import { Item } from '@app/classes/item/item';
import { Player } from '@app/interfaces/player';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
    providedIn: 'root',
})
export class PlayerInfoService {
    player$!: Observable<Player>;
    private playerState!: BehaviorSubject<Player>;

    initializePlayer(player: Player): void {
        this.playerState = new BehaviorSubject<Player>({ ...player });
        this.player$ = this.playerState.asObservable();
    }

    addItemToInventory(item: Item): boolean {
        const currentPlayer = this.playerState.value;
        const emptySlotIndex = currentPlayer.inventory.findIndex((slot) => slot === null);

        if (emptySlotIndex !== -1) {
            const newInventory: [Item | null, Item | null] = [...currentPlayer.inventory];
            newInventory[emptySlotIndex] = item;

            const updatedPlayer = {
                ...currentPlayer,
                inventory: newInventory,
            };

            this.playerState.next(updatedPlayer);
            return true;
        }
        return false;
    }

    updateHealth(healthVariation: number): void {
        const currentPlayer = this.playerState.value;
        const newHp = Math.max(0, Math.min(currentPlayer.hp.current + healthVariation, currentPlayer.hp.max));

        const updatedPlayer = {
            ...currentPlayer,
            hp: {
                ...currentPlayer.hp,
                current: newHp,
            },
        };

        this.playerState.next(updatedPlayer);
    }

    restoreHealth(): void {
        const currentPlayer = this.playerState.value;
        const updatedPlayer = {
            ...currentPlayer,
            hp: {
                ...currentPlayer.hp,
                current: currentPlayer.hp.max,
            },
        };

        this.playerState.next(updatedPlayer);
    }

    getPlayerSnapshot(): Player {
        return { ...this.playerState.value };
    }
}
