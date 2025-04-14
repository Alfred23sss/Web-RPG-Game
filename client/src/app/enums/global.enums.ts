export enum GameDecorations {
    Background = '../../../assets/gifs/background4gif.gif',
    ExampleGame = './assets/game-decorations/example.png',
    Logo = './assets/game-decorations/logoC.png',
    Forge = './assets/game-decorations/medieval-forge.png',
    XSwords = './assets/game-decorations/X-sword.png',
    X = './assets/game-decorations/X.png',
    Default = './assets/game-decorations/logo.png',
}

export enum GameModeType {
    Classic = './assets/gamemodes/classic.png',
    CTF = './assets/gamemodes/CTF.png',
    Default = './assets/gamemodes/classic.png',
}

export enum ChatEvents {
    Validate = 'validate',
    ValidateACK = 'validateWithAck',
    BroadcastAll = 'broadcastAll',
    JoinRoom = 'joinRoom',
    RoomMessage = 'roomMessage',

    WordValidated = 'wordValidated',
    MassMessage = 'massMessage',
    Hello = 'hello',
    Clock = 'clock',
    Error = 'error',
}

export enum TeamType {
    RED = 'red',
    BLUE = 'blue',
}

export enum AvatarType {
    SkeletonA = './assets/avatars/skeletonA_Idle.gif',
    SkeletonB = './assets/avatars/skeletonB_Idle.gif',
    SkeletonC = './assets/avatars/skeletonC_Idle.gif',
    FangelA = './assets/avatars/fangelA_Idle.gif',
    FangelB = './assets/avatars/fangelB_Idle.gif',
    FangelC = './assets/avatars/fangelC_Idle.gif',
    ReaperA = './assets/avatars/reaperA_Idle.gif',
    ReaperB = './assets/avatars/reaperB_Idle.gif',
    ReaperC = './assets/avatars/reaperC_Idle.gif',
    ValkyrieA = './assets/avatars/valkyrieA_Idle.gif',
    ValkyrieB = './assets/avatars/valkyrieB_Idle.gif',
    ValkyrieC = './assets/avatars/valkyrieC_Idle.gif',
}

export enum ImageType {
    Water = './assets/tile-items/waterGif.gif',
    Wall = './assets/tile-items/tileset-9-tiles-example.png',
    OpenDoor = './assets/tile-items/door-openedA.png',
    ClosedDoor = './assets/tile-items/door-closedA.png',
    Ice = './assets/tile-items/iceA.PNG',
    Default = './assets/tile-items/floorB.PNG',
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

export enum GameModeLabel {
    Classic = 'Classique',
    CTF = 'Capture Le Drapeau',
}

export enum GameSize {
    Small = 'small',
    Medium = 'medium',
    Large = 'large',
    None = '',
}

export enum GameSizeNumber {
    SmallSize = '10',
    MediumSize = '15',
    LargeSize = '20',
    Default = '',
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
    Game = '/game',
    GameEndPage = '/game-end',
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
    TooManyItemsPlaced = '❌ Trop d’items ont été placés',
    NotEnoughPlayers = '❌ Il n’y a pas assez de joueurs pour commencer la partie',
    LobbyNotLocked = '❌ Le lobby n’est pas verrouillé',
    LockedRoom = "La salle est verrouillée, voulez-vous être redirigé vers la page d'accueil",
    MaxNameLength = 'La longueur maximale de 20 caractères est atteinte',
    MaxPlayersReached = '❌ Le nombre maximal de joueurs est atteint pour cette partie',
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

export enum AccessCodeGenerator {
    Minimum = 1000,
    Maximum = 9000,
}

export enum MouseButton {
    Left = 0,
    Right = 2,
}

export enum ItemCount {
    SmallItemCount = 2,
    MediumItemCount = 4,
    LargeItemCount = 6,
}

export enum Behavior {
    Aggressive = 'aggressive',
    Defensive = 'defensive',
    Null = '',
}
