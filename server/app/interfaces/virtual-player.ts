import { Behavior } from '@common/enums';
import { Player } from './players';

export interface VirtualPlayer extends Player {
    behavior: Behavior;
}
