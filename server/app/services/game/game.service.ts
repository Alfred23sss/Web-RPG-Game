import { Game, GameDocument } from '@app/model/database/game';
import { CreateGameDto } from '@app/model/dto/game/create-game.dto';
import { UpdateGameDto } from '@app/model/dto/game/update-game.dto';
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

    async updateGame(id: string, gameDto: Partial<UpdateGameDto>): Promise<GameDocument> {
        try {
            // Ensure gameDto has valid data, and no unnecessary fields are passed
            const sanitizedGameDto = Object.fromEntries(Object.entries(gameDto).filter(([_, v]) => v !== undefined));

            // Perform the update
            const updatedGame = await this.gameModel.findOneAndUpdate({ id }, { $set: sanitizedGameDto }, { new: true, runValidators: true });

            if (!updatedGame) {
                throw new Error(`Game with id "${id}" not found.`);
            }

            return updatedGame;
        } catch (error) {
            throw new Error(`Failed to update game: ${error.message}`);
        }
    }

    async deleteGame(id: string): Promise<boolean> {
        try {
            // Attempt to delete the game directly
            const result = await this.gameModel.deleteOne({ id }).exec();

            if (result.deletedCount > 0) {
                return true;
            } else {
                throw new Error(`Game with id ${id} doesn't exist`);
            }
        } catch (error) {
            throw new Error(`Failed to delete game: ${error.message}`);
        }
    }

    async getGames(): Promise<Game[]> {
        try {
            return await this.gameModel.find({});
        } catch (error) {
            throw new Error(`Failed to fetch games: ${error.message}`);
        }
    }

    async getGameById(id: string): Promise<GameDocument> {
        const foundGame = await this.gameModel.findOne({ id });
        if (!foundGame) {
            throw new Error('Game not found');
        }
        return foundGame;
    }
}
