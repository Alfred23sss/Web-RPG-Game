import { Item } from '@app/interfaces/Item';
import { Player } from '@app/interfaces/Player';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ItemEffectsService {
    // constructor() {}

    applyEffect(player: Player, newItem: Item): void {
        
    }

    removeEffect(player: Player, oldItem: Item): void {
        
    }
}
