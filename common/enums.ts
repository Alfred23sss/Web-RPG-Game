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