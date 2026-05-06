/**
 * Translation catalog for the UI. Scryfall-provided card text (names,
 * oracle text, type lines) stays in English - it's source data, not
 * UI copy. Only strings authored by this app are translated here.
 */
export type Lang = 'pt' | 'en' | 'es' | 'fr';

export const LANGS: readonly Lang[] = ['pt', 'en', 'es', 'fr'] as const;

export type MessageKey =
  | 'app.title'
  | 'turn.label'
  | 'turn.yourMove'
  | 'turn.opponent'
  | 'game.loading'
  | 'game.victory'
  | 'game.defeat'
  | 'game.playAgain'
  | 'game.changeColor'
  | 'color.selectTitle'
  | 'color.toolbarLabel'
  | 'color.W.name'
  | 'color.W.flavor'
  | 'color.U.name'
  | 'color.U.flavor'
  | 'color.B.name'
  | 'color.B.flavor'
  | 'color.R.name'
  | 'color.R.flavor'
  | 'color.G.name'
  | 'color.G.flavor'
  | 'color.announceChoice'
  | 'player.you'
  | 'player.opponent'
  | 'player.lifePrefix'
  | 'player.handLabel'
  | 'player.handSingular'
  | 'player.handPlural'
  | 'player.manaLabel'
  | 'action.attackDirect'
  | 'action.endTurn'
  | 'action.opponentThinking'
  | 'action.attackBlocked'
  | 'battlefield.yourLabel'
  | 'battlefield.opponentLabel'
  | 'battlefield.empty'
  | 'hand.your'
  | 'hand.opponent'
  | 'lang.toggle'
  | 'lang.pt'
  | 'lang.en'
  | 'lang.es'
  | 'lang.fr'
  | 'log.title'
  | 'log.empty'
  | 'log.open'
  | 'log.close'
  | 'log.shortcut'
  | 'log.cannotPlay.noMana'
  | 'hand.cannotPlay.mana'
  | 'card.sickBadge'
  | 'card.exhaustedBadge'
  | 'card.sickAriaSuffix'
  | 'card.exhaustedAriaSuffix'
  | 'card.inspect'
  | 'inspector.type'
  | 'inspector.mana'
  | 'inspector.pt'
  | 'inspector.statusLabel'
  | 'footer.deckSource'
  | 'footer.disclaimer'
  | 'footer.fanPolicy'
  | 'footer.scryfallThanks'
  // Engine-emitted templates. Engine returns { template, vars } and the
  // store glue resolves via this dictionary at log-mint time. Adding a
  // template here is part of the engine contract — see ADR 0006.
  | 'log.play.player'
  | 'log.play.opponent'
  | 'log.cannotPlay.mana'
  | 'log.draw.player'
  | 'log.draw.opponent'
  | 'log.decking.player'
  | 'log.decking.opponent'
  | 'log.turn.player'
  | 'log.turn.opponent'
  | 'log.mana.available'
  | 'log.attack.summoningSick'
  | 'log.attack.exhausted'
  | 'log.attack.cannotAttackDirect'
  | 'log.combat.blocked.both'
  | 'log.combat.blocked.attackerOnly'
  | 'log.combat.blocked.blockerOnly'
  | 'log.combat.blocked.none'
  | 'log.combat.face.byPlayer'
  | 'log.combat.face.byOpponent'
  | 'log.gameOver.victory'
  | 'log.gameOver.defeat'
  | 'log.init.firstTurn'
  | 'help.title'
  | 'help.openButton'
  | 'help.closeButton'
  | 'help.shortcut.help'
  | 'help.shortcut.inspect'
  | 'help.shortcut.log'
  | 'help.shortcut.handNav'
  | 'help.shortcut.handEdge'
  | 'help.shortcut.colorNav'
  | 'help.shortcut.escape'
  | 'help.shortcut.activate';

export const messages: Record<Lang, Record<MessageKey, string>> = {
  pt: {
    'app.title': 'MTG Combat Demo',
    'turn.label': 'Turno',
    'turn.yourMove': 'Sua vez',
    'turn.opponent': 'Oponente',
    'game.loading': 'Distribuindo cartas…',
    'game.victory': 'Vitória! Você derrotou o oponente.',
    'game.defeat': 'Derrota. Sua vida chegou a zero.',
    'game.playAgain': 'Jogar de novo com {color}',
    'game.changeColor': 'Trocar cor',
    'color.selectTitle': 'Escolha sua cor',
    'color.toolbarLabel': 'Cores disponíveis',
    'color.W.name': 'Branco',
    'color.W.flavor': 'Ordem, proteção e tropas em formação',
    'color.U.name': 'Azul',
    'color.U.flavor': 'Voa, esquiva e controla o ritmo',
    'color.B.name': 'Preto',
    'color.B.flavor': 'Ameaças mortais que voltam do cemitério',
    'color.R.name': 'Vermelho',
    'color.R.flavor': 'Velocidade pura e dano direto',
    'color.G.name': 'Verde',
    'color.G.flavor': 'Força bruta e bichões dominando a mesa',
    'color.announceChoice': 'Você escolheu {me}. Oponente jogará com {them}. Distribuindo cartas.',
    'player.you': 'Você',
    'player.opponent': 'Oponente',
    'player.lifePrefix': 'Vida ',
    'player.handLabel': 'mão',
    'player.handSingular': 'carta',
    'player.handPlural': 'cartas',
    'player.manaLabel': 'Mana',
    'action.attackDirect': 'Atacar oponente diretamente',
    'action.endTurn': 'Encerrar turno',
    'action.opponentThinking': 'Oponente pensando…',
    'action.attackBlocked':
      'Não pode atacar diretamente enquanto o oponente tiver criaturas no campo.',
    'battlefield.yourLabel': 'Seu campo de batalha',
    'battlefield.opponentLabel': 'Campo do oponente',
    'battlefield.empty': '{label} - sem criaturas em jogo',
    'hand.your': 'Sua mão',
    'hand.opponent': 'Mão do oponente',
    'lang.toggle': 'Mudar idioma',
    'lang.pt': 'PT',
    'lang.en': 'EN',
    'lang.es': 'ES',
    'lang.fr': 'FR',
    'log.title': 'Registro da partida',
    'log.empty': 'Nenhum evento ainda.',
    'log.open': 'Abrir registro',
    'log.close': 'Fechar registro',
    'log.shortcut': 'Atalho: L',
    'log.cannotPlay.noMana': 'Não pode jogar {name} - custa {cmc}, você tem {available} de mana.',
    'hand.cannotPlay.mana': 'Não pode jogar {name} - custa {cmc}, você tem {available} de mana.',
    'card.sickBadge': 'Enjoo de invocação',
    'card.exhaustedBadge': 'Já atacou',
    'card.sickAriaSuffix': 'Enjoo de invocação: não pode atacar neste turno.',
    'card.exhaustedAriaSuffix': 'Já atacou neste turno.',
    'card.inspect': 'Inspecionar {name}',
    'inspector.type': 'Tipo',
    'inspector.mana': 'Mana',
    'inspector.pt': 'P / R',
    'inspector.statusLabel': 'Status de {label}',
    'footer.deckSource': 'Origem do deck',
    'footer.disclaimer':
      'Este é um projeto de portfólio não oficial, sem fins lucrativos. Magic: The Gathering, nomes de cartas, arte e marcas registradas são propriedade da Wizards of the Coast LLC, subsidiária da Hasbro, Inc. Este projeto não é produzido, endossado, apoiado ou afiliado à Wizards of the Coast.',
    'footer.scryfallThanks':
      'Dados e imagens das cartas são fornecidos pela API pública Scryfall, a quem agradecemos.',
    'footer.fanPolicy':
      'Este conteúdo de fã é permitido sob a Política de Conteúdo de Fãs da Wizards of the Coast.',
    'log.play.player':
      'Você jogou {label} no campo de batalha. Está com enjoo de invocação e não pode atacar neste turno.',
    'log.play.opponent': 'Oponente jogou {label}. Está com enjoo de invocação.',
    'log.cannotPlay.mana': 'Não pode jogar {name} - custa {cmc}, você tem {available} de mana.',
    'log.draw.player': 'Você comprou {name}. Mão com {handSize}.',
    'log.draw.opponent': 'Oponente comprou uma carta. A mão dele tem {handSize}.',
    'log.decking.player': 'Você tentou comprar de um grimório vazio. Você perdeu a partida.',
    'log.decking.opponent': 'Oponente tentou comprar de um grimório vazio. Você venceu a partida.',
    'log.turn.player': 'Turno {turnNumber}. Sua vez.',
    'log.turn.opponent': 'Vez do oponente.',
    'log.mana.available': '{manaMax} de mana disponível.',
    'log.attack.summoningSick': '{name} está com enjoo de invocação e não pode atacar.',
    'log.attack.exhausted': '{name} já atacou neste turno e não pode atacar.',
    'log.attack.cannotAttackDirect':
      'Não pode atacar diretamente enquanto o oponente tiver criaturas no campo.',
    'log.combat.blocked.both':
      '{who} atacou com {attackerLabel}, bloqueado por {blockerLabel}. {attackerName} morre. {blockerName} morre.',
    'log.combat.blocked.attackerOnly':
      '{who} atacou com {attackerLabel}, bloqueado por {blockerLabel}. {attackerName} morre.',
    'log.combat.blocked.blockerOnly':
      '{who} atacou com {attackerLabel}, bloqueado por {blockerLabel}. {blockerName} morre.',
    'log.combat.blocked.none': '{who} atacou com {attackerLabel}, bloqueado por {blockerLabel}.',
    'log.combat.face.byPlayer':
      'Você atacou com {attackerLabel}, causando {damage} de dano. A vida do oponente agora é {defenderLife}.',
    'log.combat.face.byOpponent':
      'Oponente atacou com {attackerLabel}, causando {damage} de dano. Sua vida agora é {defenderLife}.',
    'log.gameOver.victory': 'Vitória! Você derrotou o oponente.',
    'log.gameOver.defeat': 'Derrota. O oponente reduziu sua vida a zero.',
    'log.init.firstTurn':
      'Nova partida. Turno 1. Você tem {life} de vida, {hand} cartas e 1 de mana. Sua vez.',
    'help.title': 'Atalhos de teclado',
    'help.openButton': 'Mostrar atalhos de teclado',
    'help.closeButton': 'Fechar atalhos',
    'help.shortcut.help': 'Mostrar este painel',
    'help.shortcut.inspect': 'Inspecionar a carta em foco',
    'help.shortcut.log': 'Abrir ou fechar o registro da partida',
    'help.shortcut.handNav': 'Navegar pelas cartas da mão',
    'help.shortcut.handEdge': 'Primeira ou última carta da mão',
    'help.shortcut.colorNav': 'Navegar pelas cores na seleção',
    'help.shortcut.escape': 'Fechar diálogo aberto',
    'help.shortcut.activate': 'Jogar ou selecionar a carta em foco',
  },
  en: {
    'app.title': 'MTG Combat Demo',
    'turn.label': 'Turn',
    'turn.yourMove': 'Your move',
    'turn.opponent': 'Opponent',
    'game.loading': 'Dealing cards…',
    'game.victory': 'Victory! You defeated the opponent.',
    'game.defeat': 'Defeat. Your life reached zero.',
    'game.playAgain': 'Play again with {color}',
    'game.changeColor': 'Change color',
    'color.selectTitle': 'Choose your color',
    'color.toolbarLabel': 'Available colors',
    'color.W.name': 'White',
    'color.W.flavor': 'Order, protection, and tight formations',
    'color.U.name': 'Blue',
    'color.U.flavor': 'Flying, evasion, and tempo control',
    'color.B.name': 'Black',
    'color.B.flavor': 'Lethal threats that return from the graveyard',
    'color.R.name': 'Red',
    'color.R.flavor': 'Raw speed and direct damage',
    'color.G.name': 'Green',
    'color.G.flavor': 'Brute force and massive creatures',
    'color.announceChoice': 'You chose {me}. Opponent will play {them}. Dealing cards.',
    'player.you': 'You',
    'player.opponent': 'Opponent',
    'player.lifePrefix': 'Life ',
    'player.handLabel': 'hand',
    'player.handSingular': 'card',
    'player.handPlural': 'cards',
    'player.manaLabel': 'Mana',
    'action.attackDirect': 'Attack opponent directly',
    'action.endTurn': 'End turn',
    'action.opponentThinking': 'Opponent thinking…',
    'action.attackBlocked':
      'Cannot attack directly while the opponent has creatures on the battlefield.',
    'battlefield.yourLabel': 'Your battlefield',
    'battlefield.opponentLabel': 'Opponent battlefield',
    'battlefield.empty': '{label} - no creatures in play',
    'hand.your': 'Your hand',
    'hand.opponent': 'Opponent hand',
    'lang.toggle': 'Change language',
    'lang.pt': 'PT',
    'lang.en': 'EN',
    'lang.es': 'ES',
    'lang.fr': 'FR',
    'log.title': 'Match log',
    'log.empty': 'No events yet.',
    'log.open': 'Open log',
    'log.close': 'Close log',
    'log.shortcut': 'Shortcut: L',
    'log.cannotPlay.noMana': 'Cannot play {name} - costs {cmc}, you have {available} mana.',
    'hand.cannotPlay.mana': 'Cannot play {name} - costs {cmc}, you have {available} mana.',
    'card.sickBadge': 'Summoning sickness',
    'card.exhaustedBadge': 'Already attacked',
    'card.sickAriaSuffix': 'Summoning sickness: cannot attack this turn.',
    'card.exhaustedAriaSuffix': 'Already attacked this turn.',
    'card.inspect': 'Inspect {name}',
    'inspector.type': 'Type',
    'inspector.mana': 'Mana',
    'inspector.pt': 'P / T',
    'inspector.statusLabel': '{label} status',
    'footer.deckSource': 'Deck source',
    'footer.disclaimer':
      'This is an unofficial, non-profit portfolio project. Magic: The Gathering, card names, art, and trademarks are property of Wizards of the Coast LLC, a subsidiary of Hasbro, Inc. This project is not produced, endorsed, supported, or affiliated with Wizards of the Coast.',
    'footer.scryfallThanks':
      'Card data and images are provided by the public Scryfall API, with thanks.',
    'footer.fanPolicy':
      'This fan content is permitted under the Wizards of the Coast Fan Content Policy.',
    'log.play.player':
      'You played {label} to the battlefield. It has summoning sickness and cannot attack this turn.',
    'log.play.opponent': 'Opponent played {label}. It has summoning sickness.',
    'log.cannotPlay.mana': 'Cannot play {name} - costs {cmc}, you have {available} mana.',
    'log.draw.player': 'You drew {name}. Hand size {handSize}.',
    'log.draw.opponent': 'Opponent drew a card. Their hand size is {handSize}.',
    'log.decking.player': 'You tried to draw from an empty deck. You lose the match.',
    'log.decking.opponent': 'Opponent tried to draw from an empty deck. You win the match.',
    'log.turn.player': 'Turn {turnNumber}. Your turn.',
    'log.turn.opponent': "Opponent's turn.",
    'log.mana.available': '{manaMax} mana available.',
    'log.attack.summoningSick': '{name} has summoning sickness and cannot attack.',
    'log.attack.exhausted': '{name} has already attacked this turn and cannot attack.',
    'log.attack.cannotAttackDirect':
      'Cannot attack directly while the opponent has creatures on the battlefield.',
    'log.combat.blocked.both':
      '{who} attacked with {attackerLabel}, blocked by {blockerLabel}. {attackerName} dies. {blockerName} dies.',
    'log.combat.blocked.attackerOnly':
      '{who} attacked with {attackerLabel}, blocked by {blockerLabel}. {attackerName} dies.',
    'log.combat.blocked.blockerOnly':
      '{who} attacked with {attackerLabel}, blocked by {blockerLabel}. {blockerName} dies.',
    'log.combat.blocked.none': '{who} attacked with {attackerLabel}, blocked by {blockerLabel}.',
    'log.combat.face.byPlayer':
      "You attacked with {attackerLabel}, dealing {damage} damage. Opponent's life is now {defenderLife}.",
    'log.combat.face.byOpponent':
      'Opponent attacked with {attackerLabel}, dealing {damage} damage. Your life is now {defenderLife}.',
    'log.gameOver.victory': 'Victory! You defeated the opponent.',
    'log.gameOver.defeat': 'Defeat. The opponent reduced your life to zero.',
    'log.init.firstTurn':
      'New match. Turn 1. You have {life} life, {hand} cards, and 1 mana. Your turn.',
    'help.title': 'Keyboard shortcuts',
    'help.openButton': 'Show keyboard shortcuts',
    'help.closeButton': 'Close shortcuts',
    'help.shortcut.help': 'Show this panel',
    'help.shortcut.inspect': 'Inspect the focused card',
    'help.shortcut.log': 'Toggle the match log',
    'help.shortcut.handNav': 'Move between cards in your hand',
    'help.shortcut.handEdge': 'First or last card in your hand',
    'help.shortcut.colorNav': 'Move between colors during selection',
    'help.shortcut.escape': 'Close any open dialog',
    'help.shortcut.activate': 'Play or select the focused card',
  },
  es: {
    'app.title': 'MTG Combat Demo',
    'turn.label': 'Turno',
    'turn.yourMove': 'Tu turno',
    'turn.opponent': 'Oponente',
    'game.loading': 'Repartiendo cartas…',
    'game.victory': '¡Victoria! Has derrotado al oponente.',
    'game.defeat': 'Derrota. Tu vida llegó a cero.',
    'game.playAgain': 'Jugar otra vez con {color}',
    'game.changeColor': 'Cambiar color',
    'color.selectTitle': 'Elige tu color',
    'color.toolbarLabel': 'Colores disponibles',
    'color.W.name': 'Blanco',
    'color.W.flavor': 'Orden, protección y tropas en formación',
    'color.U.name': 'Azul',
    'color.U.flavor': 'Vuelo, evasión y control del ritmo',
    'color.B.name': 'Negro',
    'color.B.flavor': 'Amenazas mortíferas que regresan del cementerio',
    'color.R.name': 'Rojo',
    'color.R.flavor': 'Pura velocidad y daño directo',
    'color.G.name': 'Verde',
    'color.G.flavor': 'Fuerza bruta y criaturas masivas',
    'color.announceChoice': 'Has elegido {me}. El oponente jugará con {them}. Repartiendo cartas.',
    'player.you': 'Tú',
    'player.opponent': 'Oponente',
    'player.lifePrefix': 'Vida ',
    'player.handLabel': 'mano',
    'player.handSingular': 'carta',
    'player.handPlural': 'cartas',
    'player.manaLabel': 'Maná',
    'action.attackDirect': 'Atacar directamente al oponente',
    'action.endTurn': 'Terminar turno',
    'action.opponentThinking': 'Oponente pensando…',
    'action.attackBlocked':
      'No puedes atacar directamente mientras el oponente tenga criaturas en el campo.',
    'battlefield.yourLabel': 'Tu campo de batalla',
    'battlefield.opponentLabel': 'Campo del oponente',
    'battlefield.empty': '{label} - sin criaturas en juego',
    'hand.your': 'Tu mano',
    'hand.opponent': 'Mano del oponente',
    'lang.toggle': 'Cambiar idioma',
    'lang.pt': 'PT',
    'lang.en': 'EN',
    'lang.es': 'ES',
    'lang.fr': 'FR',
    'log.title': 'Registro de la partida',
    'log.empty': 'Aún no hay eventos.',
    'log.open': 'Abrir registro',
    'log.close': 'Cerrar registro',
    'log.shortcut': 'Atajo: L',
    'log.cannotPlay.noMana': 'No puedes jugar {name} - cuesta {cmc}, tienes {available} de maná.',
    'hand.cannotPlay.mana': 'No puedes jugar {name} - cuesta {cmc}, tienes {available} de maná.',
    'card.sickBadge': 'Mareo de invocación',
    'card.exhaustedBadge': 'Ya atacó',
    'card.sickAriaSuffix': 'Mareo de invocación: no puede atacar este turno.',
    'card.exhaustedAriaSuffix': 'Ya atacó este turno.',
    'card.inspect': 'Inspeccionar {name}',
    'inspector.type': 'Tipo',
    'inspector.mana': 'Maná',
    'inspector.pt': 'F / R',
    'inspector.statusLabel': 'Estado de {label}',
    'footer.deckSource': 'Fuente del mazo',
    'footer.disclaimer':
      'Este es un proyecto de portafolio no oficial, sin fines de lucro. Magic: The Gathering, los nombres de las cartas, el arte y las marcas son propiedad de Wizards of the Coast LLC, una filial de Hasbro, Inc. Este proyecto no es producido, respaldado ni afiliado a Wizards of the Coast.',
    'footer.scryfallThanks':
      'Los datos e imágenes de las cartas son proporcionados por la API pública de Scryfall, a quien agradecemos.',
    'footer.fanPolicy':
      'Este contenido de fan está permitido bajo la Política de Contenido de Fans de Wizards of the Coast.',
    'log.play.player':
      'Jugaste {label} al campo de batalla. Tiene mareo de invocación y no puede atacar este turno.',
    'log.play.opponent': 'El oponente jugó {label}. Tiene mareo de invocación.',
    'log.cannotPlay.mana': 'No puedes jugar {name} - cuesta {cmc}, tienes {available} de maná.',
    'log.draw.player': 'Robaste {name}. Tu mano tiene {handSize}.',
    'log.draw.opponent': 'El oponente robó una carta. Su mano tiene {handSize}.',
    'log.decking.player': 'Intentaste robar de un mazo vacío. Has perdido la partida.',
    'log.decking.opponent': 'El oponente intentó robar de un mazo vacío. Has ganado la partida.',
    'log.turn.player': 'Turno {turnNumber}. Tu turno.',
    'log.turn.opponent': 'Turno del oponente.',
    'log.mana.available': '{manaMax} de maná disponible.',
    'log.attack.summoningSick': '{name} tiene mareo de invocación y no puede atacar.',
    'log.attack.exhausted': '{name} ya atacó este turno y no puede atacar.',
    'log.attack.cannotAttackDirect':
      'No puedes atacar directamente mientras el oponente tenga criaturas en el campo.',
    'log.combat.blocked.both':
      '{who} atacó con {attackerLabel}, bloqueado por {blockerLabel}. {attackerName} muere. {blockerName} muere.',
    'log.combat.blocked.attackerOnly':
      '{who} atacó con {attackerLabel}, bloqueado por {blockerLabel}. {attackerName} muere.',
    'log.combat.blocked.blockerOnly':
      '{who} atacó con {attackerLabel}, bloqueado por {blockerLabel}. {blockerName} muere.',
    'log.combat.blocked.none': '{who} atacó con {attackerLabel}, bloqueado por {blockerLabel}.',
    'log.combat.face.byPlayer':
      'Atacaste con {attackerLabel}, infligiendo {damage} de daño. La vida del oponente ahora es {defenderLife}.',
    'log.combat.face.byOpponent':
      'El oponente atacó con {attackerLabel}, infligiendo {damage} de daño. Tu vida ahora es {defenderLife}.',
    'log.gameOver.victory': '¡Victoria! Has derrotado al oponente.',
    'log.gameOver.defeat': 'Derrota. El oponente redujo tu vida a cero.',
    'log.init.firstTurn':
      'Nueva partida. Turno 1. Tienes {life} de vida, {hand} cartas y 1 de maná. Tu turno.',
    'help.title': 'Atajos de teclado',
    'help.openButton': 'Mostrar atajos de teclado',
    'help.closeButton': 'Cerrar atajos',
    'help.shortcut.help': 'Mostrar este panel',
    'help.shortcut.inspect': 'Inspeccionar la carta enfocada',
    'help.shortcut.log': 'Abrir o cerrar el registro de la partida',
    'help.shortcut.handNav': 'Navegar por las cartas de tu mano',
    'help.shortcut.handEdge': 'Primera o última carta de tu mano',
    'help.shortcut.colorNav': 'Navegar por los colores durante la selección',
    'help.shortcut.escape': 'Cerrar cualquier diálogo abierto',
    'help.shortcut.activate': 'Jugar o seleccionar la carta enfocada',
  },
  fr: {
    'app.title': 'MTG Combat Demo',
    'turn.label': 'Tour',
    'turn.yourMove': 'À toi de jouer',
    'turn.opponent': 'Adversaire',
    'game.loading': 'Distribution des cartes…',
    'game.victory': 'Victoire ! Tu as vaincu l’adversaire.',
    'game.defeat': 'Défaite. Ta vie est tombée à zéro.',
    'game.playAgain': 'Rejouer avec {color}',
    'game.changeColor': 'Changer de couleur',
    'color.selectTitle': 'Choisis ta couleur',
    'color.toolbarLabel': 'Couleurs disponibles',
    'color.W.name': 'Blanc',
    'color.W.flavor': 'Ordre, protection et troupes en formation',
    'color.U.name': 'Bleu',
    'color.U.flavor': 'Vol, esquive et contrôle du tempo',
    'color.B.name': 'Noir',
    'color.B.flavor': 'Menaces létales qui reviennent du cimetière',
    'color.R.name': 'Rouge',
    'color.R.flavor': 'Vitesse pure et dégâts directs',
    'color.G.name': 'Vert',
    'color.G.flavor': 'Force brute et créatures massives',
    'color.announceChoice':
      'Tu as choisi {me}. L’adversaire jouera avec {them}. Distribution des cartes.',
    'player.you': 'Toi',
    'player.opponent': 'Adversaire',
    'player.lifePrefix': 'Vie ',
    'player.handLabel': 'main',
    'player.handSingular': 'carte',
    'player.handPlural': 'cartes',
    'player.manaLabel': 'Mana',
    'action.attackDirect': 'Attaquer l’adversaire directement',
    'action.endTurn': 'Finir le tour',
    'action.opponentThinking': 'L’adversaire réfléchit…',
    'action.attackBlocked':
      'Impossible d’attaquer directement tant que l’adversaire a des créatures sur le champ de bataille.',
    'battlefield.yourLabel': 'Ton champ de bataille',
    'battlefield.opponentLabel': 'Champ de l’adversaire',
    'battlefield.empty': '{label} - aucune créature en jeu',
    'hand.your': 'Ta main',
    'hand.opponent': 'Main de l’adversaire',
    'lang.toggle': 'Changer de langue',
    'lang.pt': 'PT',
    'lang.en': 'EN',
    'lang.es': 'ES',
    'lang.fr': 'FR',
    'log.title': 'Journal de la partie',
    'log.empty': 'Aucun événement pour le moment.',
    'log.open': 'Ouvrir le journal',
    'log.close': 'Fermer le journal',
    'log.shortcut': 'Raccourci : L',
    'log.cannotPlay.noMana': 'Impossible de jouer {name} - coûte {cmc}, tu as {available} de mana.',
    'hand.cannotPlay.mana': 'Impossible de jouer {name} - coûte {cmc}, tu as {available} de mana.',
    'card.sickBadge': 'Mal d’invocation',
    'card.exhaustedBadge': 'A déjà attaqué',
    'card.sickAriaSuffix': 'Mal d’invocation : ne peut pas attaquer ce tour.',
    'card.exhaustedAriaSuffix': 'A déjà attaqué ce tour.',
    'card.inspect': 'Inspecter {name}',
    'inspector.type': 'Type',
    'inspector.mana': 'Mana',
    'inspector.pt': 'F / E',
    'inspector.statusLabel': 'Statut de {label}',
    'footer.deckSource': 'Source du deck',
    'footer.disclaimer':
      'Ceci est un projet de portfolio non officiel, sans but lucratif. Magic: The Gathering, les noms des cartes, les illustrations et les marques sont la propriété de Wizards of the Coast LLC, une filiale de Hasbro, Inc. Ce projet n’est ni produit, ni soutenu, ni affilié à Wizards of the Coast.',
    'footer.scryfallThanks':
      'Les données et images des cartes sont fournies par l’API publique Scryfall, que nous remercions.',
    'footer.fanPolicy':
      'Ce contenu de fan est autorisé sous la Politique de Contenu de Fans de Wizards of the Coast.',
    'log.play.player':
      'Tu as joué {label} sur le champ de bataille. Elle a le mal d’invocation et ne peut pas attaquer ce tour.',
    'log.play.opponent': 'L’adversaire a joué {label}. Elle a le mal d’invocation.',
    'log.cannotPlay.mana': 'Impossible de jouer {name} - coûte {cmc}, tu as {available} de mana.',
    'log.draw.player': 'Tu as pioché {name}. Ta main contient {handSize}.',
    'log.draw.opponent': 'L’adversaire a pioché une carte. Sa main contient {handSize}.',
    'log.decking.player': 'Tu as essayé de piocher d’une bibliothèque vide. Tu as perdu la partie.',
    'log.decking.opponent':
      'L’adversaire a essayé de piocher d’une bibliothèque vide. Tu as gagné la partie.',
    'log.turn.player': 'Tour {turnNumber}. À toi de jouer.',
    'log.turn.opponent': 'Tour de l’adversaire.',
    'log.mana.available': '{manaMax} de mana disponible.',
    'log.attack.summoningSick': '{name} a le mal d’invocation et ne peut pas attaquer.',
    'log.attack.exhausted': '{name} a déjà attaqué ce tour et ne peut pas attaquer.',
    'log.attack.cannotAttackDirect':
      'Impossible d’attaquer directement tant que l’adversaire a des créatures sur le champ de bataille.',
    'log.combat.blocked.both':
      '{who} a attaqué avec {attackerLabel}, bloqué par {blockerLabel}. {attackerName} meurt. {blockerName} meurt.',
    'log.combat.blocked.attackerOnly':
      '{who} a attaqué avec {attackerLabel}, bloqué par {blockerLabel}. {attackerName} meurt.',
    'log.combat.blocked.blockerOnly':
      '{who} a attaqué avec {attackerLabel}, bloqué par {blockerLabel}. {blockerName} meurt.',
    'log.combat.blocked.none': '{who} a attaqué avec {attackerLabel}, bloqué par {blockerLabel}.',
    'log.combat.face.byPlayer':
      'Tu as attaqué avec {attackerLabel}, infligeant {damage} blessures. La vie de l’adversaire est maintenant à {defenderLife}.',
    'log.combat.face.byOpponent':
      'L’adversaire a attaqué avec {attackerLabel}, infligeant {damage} blessures. Ta vie est maintenant à {defenderLife}.',
    'log.gameOver.victory': 'Victoire ! Tu as vaincu l’adversaire.',
    'log.gameOver.defeat': 'Défaite. L’adversaire a réduit ta vie à zéro.',
    'log.init.firstTurn':
      'Nouvelle partie. Tour 1. Tu as {life} points de vie, {hand} cartes et 1 de mana. À toi de jouer.',
    'help.title': 'Raccourcis clavier',
    'help.openButton': 'Afficher les raccourcis clavier',
    'help.closeButton': 'Fermer les raccourcis',
    'help.shortcut.help': 'Afficher ce panneau',
    'help.shortcut.inspect': 'Inspecter la carte ciblée',
    'help.shortcut.log': 'Ouvrir ou fermer le journal de la partie',
    'help.shortcut.handNav': 'Naviguer entre les cartes de la main',
    'help.shortcut.handEdge': 'Première ou dernière carte de la main',
    'help.shortcut.colorNav': 'Naviguer entre les couleurs lors de la sélection',
    'help.shortcut.escape': 'Fermer toute boîte de dialogue ouverte',
    'help.shortcut.activate': 'Jouer ou sélectionner la carte ciblée',
  },
};

/**
 * Substitutes `{name}` tokens in a message. Missing vars are left
 * in place so broken messages are obvious instead of silently empty.
 */
export function format(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, key: string) => {
    const v = vars[key];
    return v !== undefined ? String(v) : `{${key}}`;
  });
}
