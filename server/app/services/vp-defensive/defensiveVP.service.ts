import { FLAG_SCORE } from '@app/constants/constants';
import { ItemName, MoveType } from '@app/enums/enums';
import { Lobby } from '@app/interfaces/Lobby';
import { Move } from '@app/interfaces/Move';
import { Player } from '@app/interfaces/Player';
import { Tile } from '@app/interfaces/Tile';
import { GameCombatService } from '@app/services/combat-manager/combat-manager.service';
import { GridManagerService } from '@app/services/grid-manager/grid-manager.service';
import { VirtualPlayerActionsService } from '@app/services/virtualPlayer-actions/virtualPlayerActions.service';
import { Injectable } from '@nestjs/common';

const DEFENSIVE_ITEM_SCORE = 9999;
const AGGRESSIVE_ITEM_SCORE = 1000;
const IN_RANGE_BONUS = 100;
const INVALID_ITEM_PENALTY = -200;
const ATTACK_PENALTY = -1000;
const NO_SCORE = 0;

@Injectable()
export class DefensiveVPService {
    constructor(
        private readonly gameCombatService: GameCombatService,
        private readonly gridManagerService: GridManagerService,
        private readonly virtualPlayerActions: VirtualPlayerActionsService,
    ) {}
    private targetTiles = new Map<string, Tile>();

    //coeur du comportement du joueur virtues --> APPELEE A CHAQUE TOUR DU JOUEUR VIRTUEL DEFENSIF
    async executeDefensiveBehavior(virtualPlayer: Player, lobby: Lobby, possibleMoves: Move[]): Promise<void> {
        //regarde ou se trouve le JV:
        //* on cherche la case (tuile) ou se trouve notre joueur virtuel avec la methode getVirtualPlayerTile()
        const virtualPlayerTile = this.getVirtualPlayerTile(virtualPlayer, lobby.game.grid);
        if (!virtualPlayerTile) return;

        //Calcule le meilleure move
        //* on choisit celle avec le plus gros score avec la methode getNextMove()
        const bestMove = this.getNextMove(possibleMoves, virtualPlayer, lobby);
        if (!bestMove) return;

        //calculer le meilleur chemain pour y aller
        //* on calcule le chemain !!COMPLET!! pour aller à la tuile visee
        //* pour savoir si c'est accessible et bomvien ca coute en mouvement
        const path = this.virtualPlayerActions.getPathForMove(bestMove, virtualPlayerTile, lobby);
        if (!path || path.length === 0) return;

        //couper un chemain pour que son cout total ne depasse pas les movementPoints du joueur
        const partialPath = this.getPathWithLimitedCost(path, virtualPlayer.movementPoints);

        //le joueur prend directement l'tem s'il se troouve sur sa case
        if (partialPath.length <= 1) {
            //le joueur est deja sur l'item
            this.virtualPlayerActions.pickUpItem(bestMove, virtualPlayerTile, lobby); // l'appel à pickUpItem va faire le deplacement (si besoin) ETTT envoyer l'evenement de fon d'action
            return;
        }

        //sinon le joueur avance sur le chemain partiel -->PAS de probleme enfaite si on execute en haut on return donc ici ca va jamais etre execute
        this.moveAlongPath(partialPath, virtualPlayerTile, lobby); //POTENTIEL PROBLEME APELLE PICKUPITEM A LA DERNIER CASE DU CHEMAIN --> bouge et apres la fonction le fait rebouger
    }
    async tryToEscapeIfWounded(virtualPlayer: Player, accessCode: string): Promise<boolean> {
        const isInCombat = this.gameCombatService.isCombatActive(accessCode);
        if (!isInCombat) return false;
        const combatState = this.gameCombatService.getCombatState(accessCode);
        if (!combatState || combatState.currentFighter.name !== virtualPlayer.name) return false;
        const healthRatio = virtualPlayer.hp.current / virtualPlayer.hp.max;
        if (healthRatio < 1) {
            console.log('🚨 Trying to escape...');
            this.gameCombatService.attemptEscape(accessCode, virtualPlayer);
            return true;
        }
        return false;
    }

    //c'est ici qu'on choisi la meilleure option possible parmi toutes les actions
    private getNextMove(moves: Move[], virtualPlayer: Player, lobby: Lobby): Move | undefined {
        //on ne garde juste les les actions qui concernent les items (Pas d'attaques) --> A ENLEVER quand on va ajouter le joeuru qui attaque quand il n'y a plus d'tems
        const itemMoves = moves.filter((move) => move.type === MoveType.Item); //itemMoves est un tabeau qui contient que les moves qui concernant les item
        if (itemMoves.length === 0) return undefined;

        const virtualPlayerTile = this.getVirtualPlayerTile(virtualPlayer, lobby.game.grid);
        //donne a chaque move dans itemMoves un score (un move a un attribut optionnel qui est score)
        const scoredMoves = this.scoreMoves(itemMoves, virtualPlayer, lobby); //scoredMoves est un tableau de moves ou on rajoute a chacun son score cslcule

        //on trie du plus gros score au plus petit
        scoredMoves.sort((a, b) => (b.score || 0) - (a.score || 0));
        console.table(
            scoredMoves.map((move) => ({
                item: move.tile.item?.name ?? '???',
                score: move.score,
                inRange: move.inRange,
                distance: this.virtualPlayerActions.calculateTotalMovementCost(
                    this.virtualPlayerActions.getPathForMove(move, virtualPlayerTile, lobby) || [],
                ),
            })),
        );

        //retourne le premier move du tableau scoredMoves car c'est celui avec le plus gros score
        return scoredMoves[0];
    }

    //note chaque move avec un score numerique
    private scoreMoves(moves: Move[], virtualPlayer: Player, lobby: Lobby): Move[] {
        const virtualPlayerTile = this.getVirtualPlayerTile(virtualPlayer, lobby.game.grid); //on la refait plusieurs fois
        return moves.map((move) => {
            //Pour chaque moce dans la liste passe en parametre (moves)
            move.score = 0; //on initialise le score de base à 0
            this.calculateItemScore(move, virtualPlayer); //Donne le bonus celon l'item
            this.calculateMovementScore(move, virtualPlayerTile, virtualPlayer, lobby); //enleve des points si c'est loin
            this.calculateAttackScore(move); //enleve beaucoup si c'est une attaque --> Normalement JAMAIS le cas car on filtre la liste pour enlever les attauqes avant de la passer en parametre
            return move;
        });
    }

    //ajouter à score de chaque move le bonus selon son type
    private calculateItemScore(move: Move, virtualPlayer: Player): void {
        if (move.type !== MoveType.Item || !move.tile.item) return;

        const item = move.tile.item;

        switch (item.name) {
            case ItemName.Swap:
                console.log('✅ Item Swap reconnu, score += DEFENSIVE_ITEM_SCORE');
                move.score += DEFENSIVE_ITEM_SCORE; // priorité absolue
                break;
            case ItemName.Potion:
                move.score += AGGRESSIVE_ITEM_SCORE;
                break;
            case ItemName.Fire:
                move.score += AGGRESSIVE_ITEM_SCORE;
                break;
            case ItemName.Rubik:
                move.score += AGGRESSIVE_ITEM_SCORE;
                break;
            //normalement seulement lorsque le joueur a le FLAG
            case ItemName.Home:
                if ((virtualPlayer.spawnPoint.tileId = move.tile.id)) {
                    move.score += this.isFlagInInventory(virtualPlayer) ? FLAG_SCORE : INVALID_ITEM_PENALTY;
                } else {
                    move.score += INVALID_ITEM_PENALTY;
                }
                break;
            default:
                move.score += -Infinity; //j'ai change toute seule c'etait a INVALID_ITEM_PENALTY (-200 avant)
        }
    }

    //enleve des moints si le moce est plus loin
    private calculateMovementScore(move: Move, virtualPlayerTile: Tile, virtualPlayer: Player, lobby: Lobby): void {
        let movementCost = 0; //on set les cout a enlever a la valeur de base soit 0
        const path = this.virtualPlayerActions.getPathForMove(move, virtualPlayerTile, lobby); //on calcule le chemian complet le plus court pour aller à la tuile visee --> retourne un tableau de tuile (guess le chemain a prendre pour arriver a la tuile visee)

        if (path) {
            movementCost = this.virtualPlayerActions.calculateTotalMovementCost(path); //on aditionne le cout en point de deplacement pour ce chemain

            //ATTENTION : c'est vraiment pas bon --> Si le chemain coute trop chet et que ce n'est pas SWAP on annule ce move
            if (movementCost > virtualPlayer.movementPoints) {
                // if (move.tile.item?.name !== ItemName.Swap) {
                move.score -= movementCost * IN_RANGE_BONUS; //ATTENTION: je ne penses vraiment pas c'est bon de mettre infini ici pcq il va jamais y aller
                return;
                // }
            }

            //sinon on penalise legerement en fonxtion de la distance
            // if (move.tile.item?.name !== ItemName.Swap) {
            //     move.score -= movementCost;
            // }

            //pour indiquer si le joueur peut atteindre l'item immediatement dans son tour ou s'il doit s y rapprocher tour par tour
            move.inRange = movementCost <= virtualPlayer.movementPoints;
        }
    }

    private calculateAttackScore(move: Move): void {
        if (move.type === MoveType.Attack) {
            move.score = ATTACK_PENALTY;
        }
    }

    //fonction pour home que Teo a fait
    private isFlagInInventory(player: Player): boolean {
        if (!player || !player.inventory) return false;
        return player.inventory.some((item) => item && item.name === ItemName.Flag);
    }

    private getVirtualPlayerTile(virtualPlayer: Player, grid: Tile[][]): Tile {
        return this.gridManagerService.findTileByPlayer(grid, virtualPlayer);
    }

    //coupe le chemain pour pas qu'il depasse movementPoints
    private getPathWithLimitedCost(path: Tile[], maxCost: number): Tile[] {
        const limitedPath: Tile[] = [path[0]]; //path[0] tuile actuelle du joueur
        let totalCost = 0; //on garde une trace du cout total des tuiles qu'on traverse

        for (let i = 1; i < path.length; i++) {
            //on regarde la tuile suivante et on calcule combien elle coute
            const tile = path[i];
            const cost = this.virtualPlayerActions.getMoveCost(tile);

            if (totalCost + cost > maxCost) break;

            totalCost += cost;
            limitedPath.push(tile);
        }

        return limitedPath;
    }

    private moveAlongPath(path: Tile[], fromTile: Tile, lobby: Lobby): void {
        this.virtualPlayerActions.moveAlongPartialPath(path, fromTile, lobby);
    }
}
