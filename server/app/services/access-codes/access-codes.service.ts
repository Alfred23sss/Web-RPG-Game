import { AccessCodes, AccessCodesDocument } from '@app/model/database/access-codes';
import { AccessCodesDto } from '@app/model/dto/game/access-codes.dto';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

@Injectable()
export class AccessCodesService {
    constructor(@InjectModel(AccessCodes.name) private accessCodesModel: Model<AccessCodesDocument>) {}

    async createAccessCode(createCodeDto: AccessCodesDto): Promise<AccessCodes> {
        const newAccessCode = new this.accessCodesModel(createCodeDto);
        return newAccessCode.save();
    }

    async getCodes(): Promise<AccessCodes[]> {
        return this.accessCodesModel.find().exec();
    }

    async deleteCode(code: string): Promise<boolean> {
        try {
            const result = await this.accessCodesModel.deleteOne({ code }).exec();
            return result.deletedCount > 0;
        } catch (error) {
            throw new Error(`Failed to delete game: ${error.message}`);
        }
    }
}
