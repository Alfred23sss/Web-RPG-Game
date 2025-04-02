import { LobbyService } from '@app/services/lobby/lobby.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class AggressiveVPService {
    constructor(private readonly lobbyService: LobbyService) {}
}
