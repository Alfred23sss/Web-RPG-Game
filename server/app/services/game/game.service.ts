import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { Game, GameDocument } from '@app/model/database/game';
import { CreateGameDto } from '@app/model/dto/game/create-game.dto';
import { UpdateGameDto } from '@app/model/dto/game/update-game.dto';

const MAXIMUM_NUMBER_OF_CREDITS = 6;

@Injectable()
export class GameService {
    constructor(
        @InjectModel(Game.name) public gameModel: Model<GameDocument>,
        private readonly logger: Logger,
    ) {
        this.start();
    }

    async start() {
        if ((await this.gameModel.countDocuments()) === 0) {
            await this.populateDB();
        }
    }

    async populateDB(): Promise<void> {
        const games: CreateGameDto[] = [
            {
                name: 'Game 1',
                size: 'small',
                mode: 'Classic',
                lastModified: new Date(),
                isVisible: true,
                previewImage: 'assets/images/default.png',
                description: 'First game description',
                grid: undefined,
            },
            {
                name: 'Game 2',
                size: 'small',
                mode: 'CTF',
                lastModified: new Date(),
                isVisible: false,
                previewImage: 'assets/images/default.png',
                description: 'Second game description',
                grid: undefined,
            },
        ];

        this.logger.log('THIS ADDS DATA TO THE DATABASE, DO NOT USE OTHERWISE');
        await this.gameModel.insertMany(games);
    }

    async getAllGames(): Promise<Game[]> {
        return await this.gameModel.find({});
    }

    async getGame(sbjCode: string): Promise<Game> {
        // NB: This can return null if the course does not exist, you need to handle it
        return await this.gameModel.findOne({ subjectCode: sbjCode });
    }

    async addGame(game: CreateGameDto): Promise<void> {
        // if (!this.validateGame(game)) {
        //     return Promise.reject('Invalid course');
        // }
        try {
            await this.gameModel.create(game);
        } catch (error) {
            return Promise.reject(`Failed to insert course: ${error}`);
        }
    }

    async deleteGame(sbjCode: string): Promise<void> {}

    async modifyGame(game: UpdateGameDto): Promise<void> {}

    //Commenter pour l'instant mais on devra surement faire quelque chose du genre

    // private validateGame(game: CreateGameDto): boolean {
    //     return this.validateCode(game.subjectCode) && this.validateCredits(game.credits);
    // }

    // private validateCode(subjectCode: string): boolean {
    //     return subjectCode.startsWith('LOG') || subjectCode.startsWith('INF');
    // }
    // private validateCredits(credits: number): boolean {
    //     return credits > 0 && credits <= MAXIMUM_NUMBER_OF_CREDITS;
    // }
}
