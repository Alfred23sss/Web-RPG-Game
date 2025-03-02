import { Player } from '@app/interfaces/Player';
import { Injectable } from '@nestjs/common';

@Injectable()
export class WaitingLineService {
    private waitingLine: Player[] = [];

    addPlayer(player: Player): void {
        this.waitingLine.push(player);
    }

    removePlayer(playerId: string): void {
        this.waitingLine = this.waitingLine.filter((p) => p.playerInfo.name !== playerId);
    }

    getWaitingLine(): Player[] {
        return this.waitingLine;
    }

    clearWaitingLine(): void {
        this.waitingLine = [];
    }

    isAdmin(playerId: string): boolean {
        const player = this.waitingLine.find((p) => p.playerInfo.name === playerId);
        return player ? player.playerInfo.isAdmin : false;
    }
}
