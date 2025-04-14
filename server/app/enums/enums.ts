export enum GameModeType {
    Classic = 'Classic',
    CTF = 'CTF',
}

export enum GameSize {
    Small = 'small',
    Medium = 'medium',
    Large = 'large',
    None = '',
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

export enum TeamType {
    RED = 'red',
    BLUE = 'blue',
}

export enum TileType {
    Water = 'eau',
    Ice = 'glace',
    Wall = 'mur',
    Door = 'porte',
    Default = 'défaut',
}

export enum ItemDescription {
    Home = 'Point de départ',
    Lightning = 'Permet de détruire des murs',
    Potion = "Augmente l'Attaque de 2, mais réduit la Défense de 1.",
    Stop = 'Donne un deuxième D6 au joueur.',
    QuestionMark = 'Objet aléatoire.',
    Fire = "Augmente l'Attaque de 2 lorsque le joueur atteint 50% de sa Vitalité.",
    Rubik = 'Augmente la Vitalité de 2, mais réduit la Vitesse de 1.',
    Swap = 'Augmente défense lorsque le joueur est sur une tuile de glace.',
    Flag = 'Drapeau à capturer.',
    Default = 'rien',
}

export enum ItemType {
    Home = './assets/items/home-removebg-preview.png',
    HomeGray = './assets/items/home-gray.png',
    Lightning = './assets/items/pickaxe.png',
    LightningGray = './assets/items/lightning-gray.png',
    Potion = './assets/items/ice-sword.png',
    PotionGray = './assets/items/potion-gray.png',
    Stop = './assets/items/armor-preview.png',
    StopGray = './assets/items/armor-gray.png',
    QuestionMark = './assets/items/chest.png',
    QuestionMarkGray = './assets/items/chest-gray.png',
    Fire = './assets/items/black-sword-preview.png',
    FireGray = './assets/items/black-sword-gray.png',
    Rubik = './assets/items/erdtree_greatshield.png',
    RubikGray = './assets/items/erdtree_greatshield-gray.png',
    Swap = './assets/items/ice-shield-chat.png',
    SwapGray = './assets/items/ice-shield-gray.png',
    Flag = './assets/items/banner-medieval.png',
    FlagGray = './assets/items/flag-gray.png',
    Default = './assets/items/banner-medieval.png',
}

export enum ItemName {
    Home = 'home',
    Lightning = 'lightning',
    Potion = 'potion',
    Stop = 'stop',
    QuestionMark = 'question',
    Fire = 'fire',
    Rubik = 'rubik',
    Swap = 'swap',
    Flag = 'flag',
    Default = 'default',
}

export enum BonusValue {
    Default = 2,
}

export enum DiceType {
    D4 = 'D4',
    D6 = 'D6',
    Uninitialized = '',
}

export enum AttributeType {
    Hp = 'hp',
    Speed = 'Vitesse',
    Attack = 'Attaque',
    Defense = 'Défense',
}

export enum JoinLobbyResult {
    RedirectToHome = 'redirectToHome',
    StayInLobby = 'stayInLobby',
    JoinedLobby = 'joinedLobby',
}

export enum Routes {
    WaitingView = '/waiting-view',
    EditionView = '/edition',
    AdminPage = '/admin',
    HomePage = '/home',
    CreatePage = '/create',
    CreateView = '/create',
}

export enum HttpStatus {
    InternalServerError = 500,
    Forbidden = 403,
}

export enum TimeConstants {
    SecondDivider = 1000,
    SecondModulo = 60,
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

export enum Behavior {
    Aggressive = 'aggressive',
    Defensive = 'defensive',
    Null = '',
}
