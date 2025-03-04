import { Injectable } from '@nestjs/common';

@Injectable()
export class AccessCodesService {
    private accessCodes: Set<string> = new Set();
    private minValue = 1000;
    private maxValue = 9000;
    // constructor(@InjectModel(AccessCodes.name) private accessCodesModel: Model<AccessCodesDocument>) {}

    generateAccessCode(): string {
        let code: string;
        do {
            code = Math.floor(this.minValue + Math.random() * this.maxValue).toString(); // Generates a 4-digit access code
        } while (this.validateAccessCode(code));

        this.accessCodes.add(code);
        return code;
    }

    validateAccessCode(code: string): boolean {
        return this.accessCodes.has(code);
    }

    removeAccessCode(code: string): void {
        this.accessCodes.delete(code);
    }

    getAllAccessCodes(): string[] {
        return Array.from(this.accessCodes);
    }

    // async createAccessCode(createCodeDto: AccessCodesDto): Promise<AccessCodes> {
    //     const newAccessCode = new this.accessCodesModel(createCodeDto);
    //     return newAccessCode.save();
    // }

    // async getCodes(): Promise<AccessCodes[]> {
    //     return this.accessCodesModel.find().exec();
    // }

    // async deleteCode(code: string): Promise<boolean> {
    //     try {
    //         const result = await this.accessCodesModel.deleteOne({ code }).exec();
    //         return result.deletedCount > 0;
    //     } catch (error) {
    //         throw new Error(`Failed to delete game: ${error.message}`);
    //     }
    // }
}
