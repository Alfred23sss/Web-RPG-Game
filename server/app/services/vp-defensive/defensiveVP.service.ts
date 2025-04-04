import { LobbyService } from '@app/services/lobby/lobby.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class DefensiveVPService {
    constructor(private readonly lobbyService: LobbyService) {}
}
