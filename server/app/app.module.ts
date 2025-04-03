import { Game, gameSchema } from '@app/model/database/game';
import { GameSessionService } from '@app/services/game-session/game-session.service';
import { Logger, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { MongooseModule } from '@nestjs/mongoose';
import { AccessCodesController } from './controllers/access-code/access-code.controller';
import { GameController } from './controllers/game/game.controller';
import { ChatGateway } from './gateways/chat/chat.gateaway';
import { GameGateway } from './gateways/game/game.gateway';
import { LobbyGateway } from './gateways/lobby/lobby.gateway';
import { VirtualPlayerGateway } from './gateways/virtual-player/virtualPlayer.gateway';
import { Item, itemSchema } from './model/database/item';
import { AccessCodesService } from './services/access-codes/access-codes.service';
import { CombatHelperService } from './services/combat-helper/combat-helper.service';
import { GameCombatService } from './services/combat-manager/combat-manager.service';
import { GameSessionTurnService } from './services/game-session-turn/game-session-turn.service';
import { GameService } from './services/game/game.service';
import { GridManagerService } from './services/grid-manager/grid-manager.service';
import { ItemEffectsService } from './services/item-effects/item-effects.service';
import { LobbyService } from './services/lobby/lobby.service';
import { VirtualPlayerService } from './services/virtual-player/virtualPlayer.service';
@Module({
    imports: [
        EventEmitterModule.forRoot(),
        ConfigModule.forRoot({ isGlobal: true }),
        MongooseModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: async (config: ConfigService) => ({
                uri: config.get<string>('DATABASE_CONNECTION_STRING'),
            }),
        }),
        MongooseModule.forFeature([
            { name: Game.name, schema: gameSchema },
            { name: Item.name, schema: itemSchema },
        ]),
    ],
    controllers: [GameController, AccessCodesController],
    providers: [
        VirtualPlayerGateway,
        VirtualPlayerService,
        LobbyGateway,
        LobbyService,
        ChatGateway,
        GameGateway,
        Logger,
        GameService,
        AccessCodesService,
        GameSessionService,
        GameCombatService,
        GridManagerService,
        GameSessionTurnService,
        CombatHelperService,
        ItemEffectsService,
    ],
    exports: [AccessCodesService],
})
export class AppModule {}
