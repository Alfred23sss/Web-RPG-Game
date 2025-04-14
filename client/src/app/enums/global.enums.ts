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

export enum ItemCount {
    SmallItemCount = 2,
    MediumItemCount = 4,
    LargeItemCount = 6,
}

export enum GameModeLabel {
    Classic = 'Classique',
    CTF = 'Capture Le Drapeau',
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

export enum AccessCodeGenerator {
    Minimum = 1000,
    Maximum = 9000,
}

export enum MouseButton {
    Left = 0,
    Right = 2,
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
    JoinRoom = 'joinRoom',
    UnavailableOption = 'updateUnavailableOptions',
    RequestUnavailableOptions = 'requestUnavailableOptions',
    SelectAvatar = 'selectAvatar',
    DeselectAvatar = 'deselectAvatar',
    ManualDisconnect = 'manualDisconnect',
    UnlockLobby = 'unlockLobby',
    LockLobby = 'lockLobby',
    KickPlayer = 'kickPlayer',
    KickVirtualPlayer = 'kickVirtualPlayer',
    CreateGame = 'createGame',
    CreateVirtualPlayer = 'createVirtualPlayer',
    CombatStarted = 'combatStarted',
    AttackResult = 'attackResult',
    CombatTurnStarted = 'combatTurnStarted',
    CombatTimerUpdate = 'combatTimerUpdate',
    EscapeAttempt = 'escapeAttempt',
    CombatEnded = 'combatEnded',
    CombatEndedLog = 'combatEndedLog',
    CombatStartedLog = 'combatStartedLog',
}

export enum SnackBarMessage {
    LobbyLocked = 'Le lobby est verrouillé et ne peut pas être rejoint.',
    Error = "Une erreur s'est produite.",
    NonExistent = "La partie que vous souhaitez rejoindre n'existe pas!",
    GetImpossible = 'Impossible de récupérer la partie.',
    LobbyFull = 'Le lobby est plein, impossible de le déverrouiller.',
}

export enum LogBookEntry {
    CombatStartedExclamation = 'Combat commencé!',
    CombatStarted = 'Combat commencé',
    AttackResultSuccess = 'réussie',
    AttackResultFail = 'échouée',
    EvadeResultSuccess = 'réussi',
    EvadeResultFail = 'raté',
    Attack = 'Attaque',
    AttackStart = '(Attaque:',
    Defense = ', Défense:',
    EvadeAttempt = "Tentative d'évasion",
    CombatWon = 'Combat gagné par',
    CombatEvaded = 'Combat évadé par',
    PlayerAbandoned = 'Un joueur a abandonne la partie',
    ItemDropped = 'a déposé un item!',
    FlagPickedUp = 'a pris le drapeau!',
    ItemPickedUp = 'a pris un item!',
    GameEnded = 'Fin de la partie',
    DoorClosed = 'Un joueur a fermé une porte',
    DoorOpened = 'Un joueur a ouvert une porte',
    WallAction = 'Un joueur a effectue une action sur un mur!',
    DebugMode = 'Mode debug',
    Activated = 'activé',
    Deactivated = 'désactivé',
}

export enum ClientNotifierMessage {
    CombatWon = 'a gagné le combat !',
    CombatEvaded = 'a evadé le combat !',
    redirectHome = "Trop de joueurs ont abandonné la partie, vous allez être redirigé vers la page d'accueil",
    SoloWin = 'a remporté la partie ! Redirection vers la page de fin sous peu',
    TeamWin = 'ont remporté la partie ! Redirection vers la page de fin sous peu',
    DeactivatedDebug = "Mode debug 'désactivé'",
}

export enum Keys {
    Escape = 'Escape',
}
