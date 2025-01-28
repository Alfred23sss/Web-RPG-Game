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
            const existingGame = await this.gameModel.findOne({ name: game.name });
            if (existingGame) {
                throw new Error(`Game with name "${game.name}" already exists.`);
            }

            return await this.gameModel.create(game);
        } catch (error) {
            throw new Error(`Failed to create game: ${error.message}`);
        }
    }

    async updateGame(gameName: string, data: Partial<Game>): Promise<GameDocument> {
        try {
            const existingGame = await this.gameModel.findOneAndUpdate({ name: gameName }, { $set: data }, { new: true, runValidators: true });
            if (!existingGame) {
                throw new Error(`Game with name "${gameName}" not found.`);
            }

            return existingGame;
        } catch (error) {
            throw new Error(`Failed to update game: ${error.message}`);
        }
    }

    async getGames(): Promise<Game[]> {
        try {
            return await this.gameModel.find({});
        } catch (error) {
            throw new Error(`Failed to fetch games: ${error.message}`);
        }
    }

    async getGameByName(gameName: string): Promise<GameDocument> {
        const foundGame = await this.gameModel.findOne({ name: gameName });
        if (!foundGame) {
            throw new Error('Game not found');
        }
        return foundGame;
    }
}
