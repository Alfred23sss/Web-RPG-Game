export enum BonusValue {
    DEFAULT = 2,
}

export enum DiceType {
    D4 = 'D4',
    D6 = 'D6',
}

export enum AttributeType {
    VITALITY = 'vitality',
    SPEED = 'speed',
    ATTACK = 'attack',
    DEFENSE = 'defense',
}

export enum Route {
    WAITING_VIEW = '/waiting-view',
    EDITION_VIEW = '/edition',
    ADMIN_PAGE = '/admin',
    HOME_PAGE = '/home',
    CREATE_PAGE = '/create',
    CREATE_VIEW = '/create',
}

export enum HttpStatus {
    INTERNAL_SERVER_ERROR = 500,
    FORBIDDEN = 403,
}

export enum TimeConstants {
    SECOND_DIVIDER = 1000,
    SECOND_MODULO = 60,
}

export enum ErrorMessages {
    MISSING_CHARACTER_DETAILS = 'Please ensure you have assigned bonuses and dice, and entered a name and avatar.',
    INVALID_GAME_SIZE = 'Invalid game size selected!',
    UNAVAILABLE_GAME_MODE = 'CTF game mode is currently unavailable!',
    MISSING_GAME_DETAILS = 'Please select both game size and game type!',
    INVALID_GAME_MODE = 'Invalid game mode selected!',
    UNAVAILABLE_GAME = "Le jeu n'est plus disponible.",
    DELETION_FAILED = 'Deletion failed',
    CONFIRM_DELETION = 'Are you sure you want to delete this game?',
    FAILED_LOAD="Failed to load games",
}
