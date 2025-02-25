import { Injectable } from '@angular/core';
import { ACCESS_CODE_MIN_VALUE, ACCESS_CODE_RANGE } from '@app/constants/global.constants';

@Injectable({
    providedIn: 'root',
})
export class RoomValidationService {
    private codes: string[] = [];
    private currentAccessCode: string = '';

    validateCode(code: string): boolean {
        if (!this.containsCode(code)) {
            return false;
        }
        this.isGameUnlock();
        this.currentAccessCode = code;
        return true;
    }

    private isGameUnlock(): boolean {
        // Add logic if needed
        return true;
    }

    private containsCode(code: string): boolean {
        return this.codes.includes(code);
    }

    private generateAccessCode(): void {
        this.currentAccessCode = Math.floor(ACCESS_CODE_MIN_VALUE + Math.random() * ACCESS_CODE_RANGE).toString();

        if (this.containsCode(this.currentAccessCode)) {
            this.generateAccessCode();
        } else {
            this.codes.push(this.currentAccessCode);
        }
    }
}
