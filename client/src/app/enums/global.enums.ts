export enum BonusValue {
    Default = 2,
}

export enum DiceType {
    D4 = 'D4',
    D6 = 'D6',
}

export enum GameMode {
    Classic = 'Classic',
    CTF = 'CTF',
    None = '',
}
export enum GameSize {
    Small = 'small',
    Medium = 'medium',
    Large = 'large',
    None = '',
}

export enum AttributeType {
    Vitality = 'Vitality',
    Speed = 'Speed',
    Attack = 'Attack',
    Defense = 'Defense',
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
