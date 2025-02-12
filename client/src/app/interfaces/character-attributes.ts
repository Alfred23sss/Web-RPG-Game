import { AttributeType } from '@app/enums/global.enums';

export interface BonusAssigned {
    [AttributeType.Vitality]: boolean;
    [AttributeType.Speed]: boolean;
}

export interface DiceAssigned {
    [AttributeType.Attack]: boolean;
    [AttributeType.Defense]: boolean;
}
