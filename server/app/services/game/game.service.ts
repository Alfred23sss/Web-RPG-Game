import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';

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
        const courses: CreateGameDto[] = [
            {
                name: 'Object Oriented Programming',
                credits: 3,
                subjectCode: 'INF1010',
                teacher: 'Samuel Kadoury',
            },
            {
                name: 'Intro to Software Engineering',
                credits: 3,
                subjectCode: 'LOG1000',
                teacher: 'Bram Adams',
            },
            {
                name: 'Project I',
                credits: 4,
                subjectCode: 'INF1900',
                teacher: 'Jerome Collin',
            },
            {
                name: 'Project II',
                credits: 3,
                subjectCode: 'LOG2990',
                teacher: 'Levis Theriault',
            },
            {
                name: 'Web Semantics and Ontology',
                credits: 2,
                subjectCode: 'INF8410',
                teacher: 'Michel Gagnon',
            },
        ];

        this.logger.log('THIS ADDS DATA TO THE DATABASE, DO NOT USE OTHERWISE');
        await this.gameModel.insertMany(courses);
    }

    async getAllGames(): Promise<Game[]> {
        return await this.gameModel.find({});
    }

    async getCourse(sbjCode: string): Promise<Game> {
        // NB: This can return null if the course does not exist, you need to handle it
        return await this.gameModel.findOne({ subjectCode: sbjCode });
    }

    async addCourse(game: CreateGameDto): Promise<void> {
        if (!this.validateCourse(game)) {
            return Promise.reject('Invalid course');
        }
        try {
            await this.gameModel.create(game);
        } catch (error) {
            return Promise.reject(`Failed to insert course: ${error}`);
        }
    }

    async deleteCourse(sbjCode: string): Promise<void> {
        try {
            const res = await this.gameModel.deleteOne({
                subjectCode: sbjCode,
            });
            if (res.deletedCount === 0) {
                return Promise.reject('Could not find course');
            }
        } catch (error) {
            return Promise.reject(`Failed to delete course: ${error}`);
        }
    }

    async modifyCourse(game: UpdateGameDto): Promise<void> {
        const filterQuery = { subjectCode: game.subjectCode };
        // Can also use replaceOne if we want to replace the entire object
        try {
            const res = await this.gameModel.updateOne(filterQuery, game);
            if (res.matchedCount === 0) {
                return Promise.reject('Could not find course');
            }
        } catch (error) {
            return Promise.reject(`Failed to update document: ${error}`);
        }
    }

    async getCourseTeacher(sbjCode: string): Promise<string> {
        const filterQuery = { subjectCode: sbjCode };
        // Only get the teacher and not any of the other fields
        try {
            const res = await this.gameModel.findOne(filterQuery, {
                teacher: 1,
            });
            return res.teacher;
        } catch (error) {
            return Promise.reject(`Failed to get data: ${error}`);
        }
    }

    async getCoursesByTeacher(name: string): Promise<Game[]> {
        const filterQuery: FilterQuery<Game> = { teacher: name };
        return await this.gameModel.find(filterQuery);
    }

    private validateCourse(game: CreateGameDto): boolean {
        return this.validateCode(game.subjectCode) && this.validateCredits(game.credits);
    }
    private validateCode(subjectCode: string): boolean {
        return subjectCode.startsWith('LOG') || subjectCode.startsWith('INF');
    }
    private validateCredits(credits: number): boolean {
        return credits > 0 && credits <= MAXIMUM_NUMBER_OF_CREDITS;
    }
}
