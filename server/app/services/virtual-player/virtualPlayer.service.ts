import { VirtualPlayer } from '@app/interfaces/VirtualPlayer';
import { LobbyService } from '@app/services/lobby/lobby.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class VirtualPlayerService {
    private virtualPlayer: VirtualPlayer;

    constructor(private readonly lobbyService: LobbyService) {}

    // functions for stat modifications

    // functions for movements and turn regulation

    // functions based on behavior which call behavior services...
}
