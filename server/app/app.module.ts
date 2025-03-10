// import { ChatGateway } from '@app/gateways/chat/chat.gateway';
import { Game, gameSchema } from '@app/model/database/game';
import { Logger, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { MongooseModule } from '@nestjs/mongoose';
import { AccessCodesController } from './controllers/access-code/access-code.controller';
import { GameController } from './controllers/game/game.controller';
import { GameGateway } from './gateways/game/game.gateway';
import { LobbyGateway } from './gateways/lobby/lobby.gateway';
import { Item, itemSchema } from './model/database/item';
import { AccessCodesService } from './services/access-codes/access-codes.service';
import { GameSessionService } from './services/game-session/game-session.service';
import { GameService } from './services/game/game.service';
import { LobbyService } from './services/lobby/lobby.service';
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
    providers: [LobbyGateway, LobbyService, GameGateway, Logger, GameService, AccessCodesService, GameSessionService], // removed chat
    exports: [AccessCodesService],
})
export class AppModule {}
