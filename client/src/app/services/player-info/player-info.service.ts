import { Injectable } from '@angular/core';
import { AttributeType, DiceType } from '@app/enums/global.enums';
import { PlayerInfo } from '@app/interfaces/player-info';
import { CharacterService } from '@app/services/character-form/character-form.service';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
    providedIn: 'root',
})
export class PlayerInfoService {
    playerInfo$!: Observable<PlayerInfo | null>;
    private playerState = new BehaviorSubject<PlayerInfo | null>(null);

    constructor(private characterService: CharacterService) {
        this.playerInfo$ = this.playerState.asObservable();
    }

    initializePlayer(name: string, avatar: string) {
        const vitality = this.characterService.attributes[AttributeType.Vitality];
        const speed = this.characterService.attributes[AttributeType.Speed];
        const attack = this.characterService.attributes[AttributeType.Attack];
        const defense = this.characterService.attributes[AttributeType.Defense];

        const attackDice = this.characterService.diceAssigned[AttributeType.Attack] ? DiceType.D6 : DiceType.D4;
        const defenseDice = this.characterService.diceAssigned[AttributeType.Attack] ? DiceType.D6 : DiceType.D4;

        const playerInfo: PlayerInfo = {
            name,
            avatar,
            hp: { current: vitality, max: vitality },
            speed,
            attack: { value: attack, bonusDie: attackDice },
            defense: { value: defense, bonusDie: defenseDice },
            movementPoints: 10, // Eventually change to an actual value
            actionPoints: 10, // Eventually change to an actual value
        };
        this.playerState.next(playerInfo);
    }
}
