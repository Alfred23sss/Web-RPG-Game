import { Behavior } from '@app/enums/global.enums';
import { Player } from './player';

export interface VirtualPlayer extends Player {
    behavior: Behavior;
}

// set isAdmin a false, is Virtual a true tt le temps
