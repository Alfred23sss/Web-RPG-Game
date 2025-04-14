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

export enum ItemCount {
    SmallItemCount = 2,
    MediumItemCount = 4,
    LargeItemCount = 6,
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

export enum AccessCodeGenerator {
    Minimum = 1000,
    Maximum = 9000,
}

export enum MouseButton {
    Left = 0,
    Right = 2,
}

export enum Behavior {
    Aggressive = 'aggressive',
    Defensive = 'defensive',
    Null = '',
}

export enum SocketEvent {
    GameAbandoned = 'game-abandoned',
    GameDeleted = 'gameDeleted',
    GameEnded = 'gameEnded',
    AdminModeDisabled = 'adminModeDisabled',
    GameStarted = 'gameStarted',
    PlayerMovement = 'playerMovement',
    PlayerUpdate = 'playerUpdate',
    PlayerListUpdate = 'playerListUpdate',
    DoorClicked = 'doorClicked',
    WallClicked = 'wallClicked',
    GridUpdate = 'gridUpdate',
    AdminModeChangedServerSide = 'adminModeChangedServerSide',
    ItemChoice = 'itemChoice',
    ItemDropped = 'itemDropped',
    ItemDrop = 'itemDrop',
    PlayerClientUpdate = 'playerClientUpdate',
}
