import { Injectable } from '@nestjs/common';
import { AccessCodes } from './access-codes.service.constant';

@Injectable()
export class AccessCodesService {
    private accessCodes: Set<string> = new Set();
    private minValue = AccessCodes.MinValue;
    private maxValue = AccessCodes.MaxValue;

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

    // getAllAccessCodes(): string[] {
    //     return Array.from(this.accessCodes);
    // }
}
