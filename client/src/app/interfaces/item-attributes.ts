import { AttributeType, DiceType } from '@app/enums/global.enums';

export interface ItemModifier {
    attribute: AttributeType;
    value: number;
}

export interface DiceModifier {
    diceType: DiceType;
    min: number;
    max: number;
}

export interface ItemCondition {
    threshold: number;
    effect: ItemModifier;
}
