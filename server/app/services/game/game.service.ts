import { Game, GameDocument } from '@app/model/database/game';
import { CreateGameDto } from '@app/model/dto/game/create-game.dto';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

@Injectable()
export class GameService {
    constructor(@InjectModel(Game.name) public gameModel: Model<GameDocument>) {}

    async createGame(game: CreateGameDto): Promise<GameDocument> {
        try {
            return await this.gameModel.create(game);
        } catch (error) {
            throw new Error(`Failed to add game: ${error.message}`);
        }
    }

    async getGames(): Promise<Game[]> {
        return await this.gameModel.find({});
    }

    async getGameByName(gameName: string): Promise<GameDocument> {
        const foundGame = await this.gameModel.findOne({ name: gameName });
        if (!foundGame) {
            throw new Error('Game not found');
        }
        return foundGame;
    }
}
