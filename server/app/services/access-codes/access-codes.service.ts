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
            code = Math.floor(this.minValue + Math.random() * this.maxValue).toString();
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
}
