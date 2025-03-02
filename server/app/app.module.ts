import { ChatGateway } from '@app/gateways/chat/chat.gateway';
import { Game, gameSchema } from '@app/model/database/game';
import { Logger, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AccessCodesController } from './controllers/access-code/access-code.controller';
import { GameController } from './controllers/game/game.controller';
import { AccessCodes, accessCodesSchema } from './model/database/access-codes';
import { Item, itemSchema } from './model/database/item';
import { AccessCodesService } from './services/access-codes/access-codes.service';
import { GameService } from './services/game/game.service';
import { WaitingLineService } from './services/waiting-line/waiting-line.service';
@Module({
    imports: [
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
            { name: AccessCodes.name, schema: accessCodesSchema },
        ]),
    ],
    controllers: [GameController, AccessCodesController], // ✅ Register AccessCodeController
    providers: [ChatGateway, Logger, GameService, AccessCodesService, WaitingLineService],
    exports: [WaitingLineService],
})
export class AppModule {}
