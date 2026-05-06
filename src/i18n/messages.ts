/**
 * Translation catalog for the UI. Scryfall-provided card text (names,
 * oracle text, type lines) stays in English - it's source data, not
 * UI copy. Only strings authored by this app are translated here.
 */
export type Lang = 'pt' | 'en';

export const LANGS: readonly Lang[] = ['pt', 'en'] as const;

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
  | 'log.init.firstTurn';

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
