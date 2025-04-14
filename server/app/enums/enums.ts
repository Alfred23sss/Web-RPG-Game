export enum GameModeType {
    Classic = 'Classic',
    CTF = 'CTF',
}

export enum GameSizeTileCount {
    Small = '10',
    Medium = '15',
    Large = '20',
}

export enum GameSizePlayerCount {
    Small = 2,
    Medium = 4,
    Large = 6,
}

export enum AttributeType {
    Hp = 'hp',
    Speed = 'Vitesse',
    Attack = 'Attaque',
    Defense = 'Défense',
}

export enum ErrorMessages {
    MissingCharacterDetails = 'Veuillez vous assurer d’avoir attribué des bonus et des dés, et d’avoir saisi un nom et un avatar.',
    InvalidGameSize = 'Taille de jeu invalide sélectionnée !',
    UnavailableGameMode = 'Le mode de jeu CTF n’est actuellement pas disponible !',
    MissingGameDetails = 'Veuillez sélectionner à la fois la taille et le type de jeu !',
    InvalidGameMode = 'Mode de jeu invalide sélectionné !',
    UnavailableGame = "Le jeu n'est plus disponible.",
    DeletionFailed = 'Échec de la suppression',
    ConfirmDeletion = 'Êtes-vous sûr de vouloir supprimer ce jeu ?',
    FailedLoad = 'Échec du chargement des jeux',
    GridNotFound = '❌ Aucune grille trouvée',
    InvalidDoorPlacement = '❌ Une ou plusieurs portes ne sont pas correctement placées',
    InvalidTerrainAmount = '❌ La grille doit être au moins 50% de terrain (Défaut, eau ou glace)',
    InvalidNameSize = '❌ Le nom doit être entre 1 et 30 caractères uniques',
    InvalidDescriptionSize = '❌La description ne peut être vide et doit être de moins de 100 caractères',
    InvalidFlagPlacement = '❌ Le drapeau doit être placé sur la grille',
    ItemsNotPlaced = '❌ Tous les items doivent être placées',
    InnacessibleTerrain = '❌ Aucune tuile de terrain accessible trouvée',
    SomeTilesInnacessible = '❌ Il y a des tuiles inaccesseibles sur le terrain',
    MustPlaceHouseItems = 'items maisons doivent être placées',
}

export enum MoveType {
    Attack = 'attack',
    Item = 'item',
}

export enum EventEmit {
    GameCombatTimer = 'game.combat.timer',
    GameCombatTurnStarted = 'game.combat.turn.started',
    UpdatePlayerList = 'update.player.list',
    UpdatePlayer = 'update.player',
    GameCombatStarted = 'game.combat.started',
    DecrementItem = 'decrement.item',
    // stat
    GameCombatAttackResult = 'game.combat.attack.result',
    GameCombatEscape = 'game.combat.escape',
    GameCombatEnded = 'game.combat.ended',
    AdminModeDisabled = 'admin.mode.disabled',
    // stat
    GameDoorUpdate = 'game.door.update',
    GameTurnTimeout = 'game.turn.timeout',
    GamePlayerMovement = 'game.player.movement',
    GameEnded = 'game.ended',
    GameGridUpdate = 'game.grid.update',
    // stat
    GameTransitionStarted = 'game.transition.started',
    GameTransitionCountdown = 'game.transition.countdown',
    GameTurnStarted = 'game.turn.started',
    GameTurnTimer = 'game.turn.timer',
    GameTurnResumed = 'game.turn.resumed',
    GameWallUpdate = 'game.wall.update',
    ItemChoice = 'item.choice',
    PlayerUpdate = 'player.client.update',
    TeamCreated = 'team.created',
    GameItemCollected = 'game.item.collected',
    GameTileVisited = 'game.tile.visited',
    GameFlagPossessed = 'game.flag.possessed',
    InitializeGameStatistics = 'initialize.game.statistics',
    ShowGlobalStats = 'show.global.stats',
    UpdateDoorStats = 'update.door.stats',
    VPActionDone = 'vp.action.done',
}
