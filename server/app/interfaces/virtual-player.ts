import { Behavior } from '@common/enums';
import { Player } from './player';

export interface VirtualPlayer extends Player {
    behavior: Behavior;
}
