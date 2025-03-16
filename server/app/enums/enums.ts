export enum GameDecorations {
    Background = 'assets/game-decorations/background.png',
    Door = 'assets/game-decorations/door.png',
    ExampleGame = 'assets/game-decorations/example.png',
    Logo = 'assets/game-decorations/logo.png',
    Forge = 'assets/game-decorations/medieval-forge.png',
    XSwords = 'assets/game-decorations/X-sword.png',
    X = 'assets/game-decorations/X.png',
    Default = 'assets/game-decorations/logo.png',
}

export enum GameModeType {
    Classic = 'assets/gamemodes/classic-game.png',
    CTF = 'assets/gamemodes/CTF-game.png',
    Default = 'assets/gamemodes/classic-game.png',
}

export enum AvatarType {
    Alchemist = 'assets/avatars/avatar_alchemist.png',
    Archer = 'assets/avatars/avatar_archer.png',
    Assassin = 'assets/avatars/avatar_assassin.png',
    Barbarian = 'assets/avatars/avatar_barbarian.png',
    Bard = 'assets/avatars/avatar_bard.png',
    Druid = 'assets/avatars/avatar_druid.png',
    Goblin = 'assets/avatars/avatar_goblin.png',
    Paladin = 'assets/avatars/avatar_paladin.png',
    Ranger = 'assets/avatars/avatar_ranger.png',
    Valkyrie = 'assets/avatars/avatar_valkyrie.png',
    Vampire = 'assets/avatars/avatar_vampire.png',
    Wizard = 'assets/avatars/avatar_wizard.png',
}

export enum ImageType {
    Water = 'assets/tile-items/water.png',
    Wall = 'assets/tile-items/wall.png',
    OpenDoor = 'assets/tile-items/opened-door.png',
    ClosedDoor = 'assets/tile-items/closed-door.png',
    Ice = 'assets/tile-items/ice.png',
    Default = 'assets/tile-items/clay.png',
}

export enum ItemType {
    Home = 'assets/items/home.png',
    HomeGray = 'assets/items/home-gray.png',
    Lightning = 'assets/items/lightning.png',
    LightningGray = 'assets/items/lightning-gray.png',
    Potion = 'assets/items/potion.png',
    PotionGray = 'assets/items/potion-gray.png',
    Stop = 'assets/items/stop.png',
    StopGray = 'assets/items/stop-gray.png',
    QuestionMark = 'assets/items/question-mark.png',
    QuestionMarkGray = 'assets/items/question-mark-gray.png',
    Fire = 'assets/items/fire.png',
    FireGray = 'assets/items/fire-gray.png',
    Rubik = 'assets/items/rubik.png',
    RubikGray = 'assets/items/rubik-gray.png',
    Swap = 'assets/items/swap.png',
    SwapGray = 'assets/items/swap-gray.png',
    Default = 'assets/items/question-mark.png',
}

export enum BonusValue {
    Default = 2,
}

export enum DiceType {
    D4 = 'D4',
    D6 = 'D6',
    Uninitialized = '',
}

export enum JoinLobbyResult {
    RedirectToHome = 'redirectToHome',
    StayInLobby = 'stayInLobby',
    JoinedLobby = 'joinedLobby',
}

export enum GameMode {
    Classic = 'Classique',
    CTF = 'CTF',
    None = '',
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

export enum AttributeType {
    Vitality = 'Vitalité',
    Speed = 'Vitesse',
    Attack = 'Attaque',
    Defense = 'Défense',
}

export enum Routes {
    WaitingView = '/waiting-view',
    EditionView = '/edition',
    AdminPage = '/admin',
    HomePage = '/home',
    CreatePage = '/create',
    CreateView = '/create',
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

export enum TileType {
    Water = 'eau',
    Ice = 'glace',
    Wall = 'mur',
    Door = 'porte',
    Default = 'défaut',
}

export enum ItemDescription {
    Home = 'Point de départ',
    Lightning = 'paralyse',
    Potion = 'soigne',
    Stop = 'arrêt le jeu',
    QuestionMark = 'objet aléatoire',
    Fire = 'inflige des brûlure',
    Rubik = 'bouge les colonnes ou les rangés',
    Swap = 'échange les personnages',
    Default = 'rien',
}
