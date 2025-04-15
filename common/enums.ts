export enum ImageType {
    Water = './assets/tile-items/waterGif.gif',
    Wall = './assets/tile-items/tileset-9-tiles-example.png',
    OpenDoor = './assets/tile-items/door-openedA.png',
    ClosedDoor = './assets/tile-items/door-closedA.png',
    Ice = './assets/tile-items/iceA.PNG',
    Default = './assets/tile-items/floorB.PNG',
}

export enum GameDecorations {
    Background = '../../../assets/gifs/background4gif.gif',
    Door = 'assets/game-decorations/door.png',
    ExampleGame = './assets/game-decorations/example.png',
    Logo = './assets/game-decorations/logoC.png',
    Forge = './assets/game-decorations/medieval-forge.png',
    XSwords = './assets/game-decorations/X-sword.png',
    X = './assets/game-decorations/X.png',
    Default = './assets/game-decorations/logo.png',
}

export enum GameMode {
    Classic = 'Classique',
    CTF = 'CTF',
    None = '',
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

export enum TeamType {
    RED = 'red',
    BLUE = 'blue',
}

export enum ItemType {
    Home = './assets/items/home-removebg-preview.png',
    HomeGray = './assets/items/home-removebg-preview-gray.png',
    Pickaxe = './assets/items/pickaxe.png',
    PickaxeGray = './assets/items/pickaxe-gray.png',
    IceSword = './assets/items/ice-sword.png',
    IceSwordGray = './assets/items/ice-sword-gray.png',
    Armor = './assets/items/armor-preview.png',
    ArmorGray = './assets/items/armor-gray.png',
    Chest = './assets/items/chest.png',
    ChestGray = './assets/items/chest-gray.png',
    BlackSword = './assets/items/black-sword-preview.png',
    BlackSwordGray = './assets/items/black-sword-gray.png',
    GreatShield = './assets/items/erdtree_greatshield.png',
    GreatShieldGray = './assets/items/erdtree_greatshield-gray.png',
    IceShield = './assets/items/ice-shield-chat.png',
    IceShieldGray = './assets/items/ice-shield-gray.png',
    Flag = './assets/items/banner-medieval.png',
    FlagGray = './assets/items/banner-medieval-gray.png',
    Default = './assets/items/banner-medieval.png',
}

export enum ItemName {
    Home = 'home',
    Pickaxe = 'pickaxe',
    IceSword = 'ice-sword',
    Armor = 'armor',
    Chest = 'chest',
    BlackSword = 'black-sword',
    GreatShield = 'great-shield',
    IceShield = 'ice-shield',
    Flag = 'flag',
    Default = 'default',
}

export enum ItemDescription {
    Home = 'Point de départ',
    Pickaxe = 'Permet de détruire des murs',
    BlackSword = "Augmente l'Attaque de 2, mais réduit la Défense de 1.",
    GreatShield = 'Donne un deuxième D6 au joueur.',
    Chest = 'Objet aléatoire.',
    IceSword = "Augmente l'Attaque de 2 lorsque le joueur atteint 50% de sa Vitalité.",
    Armor = 'Augmente la Vitalité de 2, mais réduit la Vitesse de 1.',
    IceShield = 'Augmente défense lorsque le joueur est sur une tuile de glace.', 
    Flag = 'Drapeau à capturer.',
    Default = 'rien',
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

export enum GameSize {
    Small = 'small',
    Medium = 'medium',
    Large = 'large',
    None = '',
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

export enum TileType {
    Water = 'eau',
    Ice = 'glace',
    Wall = 'mur',
    Door = 'porte',
    Default = 'défaut',
}

export enum Behavior {
    Aggressive = 'aggressive',
    Defensive = 'defensive',
    Null = '',
}
