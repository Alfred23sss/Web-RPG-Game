import { Behavior } from '@app/enums/enums';
import { Player } from './Player';

export interface VirtualPlayer extends Player {
    behavior: Behavior;
}

// set isAdmin a false, is Virtual a true tt le temps
