import { AttributeType } from '@app/enums/global.enums';
import { DiceType } from '@common/enums';

export interface BonusAssigned {
    [AttributeType.Vitality]: boolean;
    [AttributeType.Speed]: boolean;
}

export interface DiceAssigned {
    [AttributeType.Attack]: boolean;
    [AttributeType.Defense]: boolean;
}

export interface DiceAssignment {
    attack: DiceType | null;
    defense: DiceType | null;
}
