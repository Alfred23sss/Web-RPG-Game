import { Injectable } from '@angular/core';

@Injectable({
    providedIn: 'root',
})
export class CharacterAttributesService {
    assignBonus(attributeKey: string, attributes: any, bonusAssigned: any): void {
        if (!bonusAssigned[attributeKey]) {
            attributes[attributeKey] += 2;
            bonusAssigned[attributeKey] = true;

            const otherAttribute = attributeKey === 'vitality' ? 'speed' : 'vitality';
            if (bonusAssigned[otherAttribute]) {
                attributes[otherAttribute] = 4;
                bonusAssigned[otherAttribute] = false;
            }
        }
    }

    assignDice(attributeKey: string, diceAssigned: any): void {
        if (!diceAssigned[attributeKey]) {
            diceAssigned[attributeKey] = true;

            const otherAttribute = attributeKey === 'attack' ? 'defense' : 'attack';
            if (diceAssigned[otherAttribute]) {
                diceAssigned[otherAttribute] = false;
            }
        } else {
            diceAssigned[attributeKey] = false;
        }
    }
}
