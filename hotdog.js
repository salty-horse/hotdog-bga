/**
 *------
 * BGA framework: © Gregory Isabelli <gisabelli@boardgamearena.com> & Emmanuel Colin <ecolin@boardgamearena.com>
 * Hotdog implementation : © Ori Avtalion <ori@avtalion.name>
 *
 * This code has been produced on the BGA studio platform for use on http://boardgamearena.com.
 * See http://en.boardgamearena.com/#!doc/Studio for more information.
 * -----
 *
 * User interface script
 *
 * In this file, you are describing the logic of your user interface, in Javascript language.
 *
 */

'use strict';

define([
    'dojo',
    'dojo/_base/declare',
    'dojo/dom',
    'dojo/on',
    'ebg/core/gamegui',
    'ebg/counter',
    'ebg/stock'
],
function (dojo, declare) {
    return declare('bgagame.hotdog', ebg.core.gamegui, {
        constructor: function(){
            this.cardWidth = 93;
            this.cardHeight = 93;

            this.suitSymbolToId = {
                '♠': 1,
                '♥': 2,
                '♣': 3,
                '♦': 4,
            };
        },

        /*
            setup:

            This method must set up the game user interface according to current game situation specified
            in parameters.

            The method is called each time the game interface is displayed to a player, ie:
            _ when the game starts
            _ when a player refreshes the game page (F5)

            'gamedatas' argument contains all datas retrieved by your 'getAllDatas' PHP method.
        */


        setup: function(gamedatas) {
            console.log('gamedatas', gamedatas);

            this.suitNames = {
                1: _('spades'),
                2: _('hearts'),
                3: _('clubs'),
                4: _('diamonds'),
            };

            this.gameModes = {
                'ketchup': _('Ketchup'),
                'mustard': _('Mustard'),
                'the_works': _('The Works'),
            };

            this.gameModeDescription = {
                'ketchup': _('High cards are stronger'),
                'mustard': _('Low cards are stronger'),
            };

            // Set dynamic UI strings
            if (this.isSpectator) {
                for (const player_info of Object.values(this.gamedatas.players)) {
                    this.setStrawmanPlayerLabel(player_info);
                }
            } else {
                this.setStrawmanPlayerLabel(gamedatas.players[gamedatas.opponent_id]);
            }

            // Player hand
            this.playerHand = new ebg.stock();
            this.playerHand.setSelectionMode(1);
            this.playerHand.centerItems = true;
            this.playerHand.create(this, $('hd_myhand'), this.cardWidth, this.cardHeight);
            this.playerHand.image_items_per_row = 9;

            dojo.connect(this.playerHand, 'onChangeSelection', this, 'onPlayerHandSelectionChanged');

            // Create cards types
            for (let suit = 1; suit <= 4; suit++) {
                for (let rank = 1; rank <= 9; rank++) {
                    // Build card type id
                    let card_type_id = this.getCardUniqueId(suit, rank);
                    this.playerHand.addItemType(card_type_id, card_type_id, g_gamethemeurl + 'img/cards.png', card_type_id);
                }
            }

            // Used for changing trump graphics
            this.visibleCards = {};

            // Cards in player's hand
            this.initPlayerHand(this.gamedatas.hand);

            // Mapping between strawmen card IDs and elements
            this.strawmenById = {};

            this.trickCounters = {};
            this.handSizes = {};

            for (const [player_id, player_info] of Object.entries(this.gamedatas.players)) {
                // Score piles
                let tricks_won_counter = new ebg.counter();
                this.trickCounters[player_id] = tricks_won_counter;
                tricks_won_counter.create(`hd_tricks_won_${player_id}`);
                tricks_won_counter.setValue(player_info.won_tricks);

                // Hand size counter
                dojo.place(this.format_block('jstpl_player_hand_size', player_info),
                    document.getElementById(`player_board_${player_id}`));
                let hand_size_counter = new ebg.counter();
                this.handSizes[player_id] = hand_size_counter;
                hand_size_counter.create(`hd_player_hand_size_${player_id}`);
                hand_size_counter.setValue(player_info.hand_size);

                // Strawmen
                this.initStrawmen(player_id, player_info.visible_strawmen, player_info.more_strawmen);
            }
            this.addTooltipToClass('hd_hand_size', _('Number of cards in hand'), '');

            // Cards played on table
            for (i in this.gamedatas.cardsontable) {
                var card = this.gamedatas.cardsontable[i];
                var color = card.type;
                var value = card.type_arg;
                var player_id = card.location_arg;
                this.putCardOnTable(player_id, color, value, card.id);
            }

            this.markGameMode();
            this.markTrumps();

            let elem = document.getElementById('hd_special_rank');
            if (this.gamedatas.specialRank != '0') {
                elem.textContent = this.gamedatas.specialRank;
            } else {
                elem.textContent = '?';
            }

            elem = document.getElementById('hd_trump_suit');
            if (this.gamedatas.trumpSuit != '0') {
                elem.className = `hd_trump_indicator hd_suit_icon_${this.gamedatas.trumpSuit}`;
                elem.title = elem['aria-label'] = this.suitNames[this.gamedatas.trumpSuit];
            } else {
                elem.textContent = '?';
                elem.removeAttribute('title');
                elem.className = 'hd_trump_indicator';
            }

            this.addTooltipToClass('hd_playertablecard', _('Card played on the table'), '');

            // Setup game notifications to handle (see "setupNotifications" method below)
            this.setupNotifications();

            this.ensureSpecificImageLoading(['../common/point.png']);
        },

        ///////////////////////////////////////////////////
        //// Game & client states

        // onEnteringState: this method is called each time we are entering into a new game state.
        //                  You can use this method to perform some user interface changes at this moment.
        //
        onEnteringState: function(stateName, args)
        {
            console.log('Entering state:', stateName);

            let bidding_box;
            switch (stateName) {
            case 'pickToppings':
                bidding_box = document.getElementById('hd_bidding_current');
                document.getElementById('hd_bidding_box').style.display = 'block';
                if (this.isCurrentPlayerActive()) {
                    let ketchup_elem = dojo.create('div', null, bidding_box);
                    dojo.place('<h2>Ketchup</h2>', ketchup_elem); // TODO translate
                    let ketchup_selector = dojo.place(this.format_block('jstpl_suit_selector', {'game_mode': 'ketchup'}), ketchup_elem);
                    ketchup_selector.querySelectorAll('div').forEach((node, index, arr) => {
                        dojo.connect(node, 'onclick', this, 'onPickingToppings');
                    });
                    let mustard_elem = dojo.create('div', null, bidding_box);
                    dojo.place('<h2>Mustard</h2>', mustard_elem); // TODO translate
                    let mustard_selector = dojo.place(this.format_block('jstpl_suit_selector', {'game_mode': 'mustard'}), mustard_elem);
                    mustard_selector.querySelectorAll('div').forEach((node, index, arr) => {
                        dojo.connect(node, 'onclick', this, 'onPickingToppings');
                    });
                    let the_works_elem = dojo.create('div', null, bidding_box);
                    let button = dojo.create('button', {innerHTML: 'The Works', class: 'bgabutton bgabutton_blue'}, the_works_elem); // TODO translate
                    button.onclick = () => this.ajaxAction('pickToppings', {topping: 'the_works'});
                    let pass_elem = dojo.create('div', null, bidding_box);
                    button = dojo.create('button', {innerHTML: 'Pass', class: 'bgabutton bgabutton_blue'}, pass_elem); // TODO translate
                    button.onclick = () => this.ajaxAction('pickToppings', {topping: 'pass'});
                } else {
                    bidding_box.innerHTML = '';
                }
                break;

            case 'addRelish':
            case 'addRelishOrSmother':
                document.getElementById('hd_bidding_box').style.display = 'block';
                bidding_box = document.getElementById('hd_bidding_current');
                if (this.isCurrentPlayerActive()) {
                    let elem = dojo.create('div', null, bidding_box);
                    dojo.place('<h2>Special Rank</h2>', elem); // TODO translate
                    let rank_selector = dojo.place(this.format_block('jstpl_rank_selector'), elem);
                    rank_selector.querySelectorAll('div').forEach((node, index, arr) => {
                        dojo.connect(node, 'onclick', this, 'onPickingSpecialRank');
                    });
                    let button = dojo.create('button', {innerHTML: 'No special rank', class: 'bgabutton bgabutton_blue'}, elem); // TODO translate
                    button.onclick = () => { this.ajaxAction('addRelish', {option: 'pass'})};
                    let pass_elem = dojo.create('div', null, bidding_box);

                    if (stateName == 'addRelishOrSmother') {
                        button = dojo.create('button', {innerHTML: 'Smother', class: 'bgabutton bgabutton_blue'}, elem); // TODO translate
                        button.onclick = () => { this.ajaxAction('addRelish', {option: 'smother'})};
                    }
                } else {
                    bidding_box.innerHTML = '';
                }
                break;

            case 'firstTrick':
                document.getElementById('hd_bidding_box').style.display = 'none';
                break;

            // Mark playable cards
            case 'playerTurn':
                this.markActivePlayerTable(true);

                if (!this.isCurrentPlayerActive())
                    break;

                // Highlight playable cards
                for (let card_id of args.args._private.playable_cards) {
                    let elem = document.getElementById(`hd_myhand_item_${card_id}`);
                    // Look for strawman
                    if (!elem) {
                        elem = document.querySelector(`#hd_mystrawmen div[data-card_id="${card_id}"]`)
                    }
                    if (elem) {
                        elem.classList.add('hd_playable');
                    }
                }
                break;

            case 'endHand':
                this.markActivePlayerTable(false);
                break;
            }
        },

        // onLeavingState: this method is called each time we are leaving a game state.
        //                 You can use this method to perform some user interface changes at this moment.
        //
        onLeavingState: function(stateName)
        {
            switch (stateName) {
            case 'selectTrump':
                document.getElementById('hd_rankSelector').style.display = 'none';
                document.getElementById('hd_suitSelector').style.display = 'none';
                document.querySelectorAll('.hd_playertable').forEach(e => e.style.display = '');
                break;
            }
        },

        // onUpdateActionButtons: in this method you can manage 'action buttons' that are displayed in the
        //                        action status bar (ie: the HTML links in the status bar).
        //
        onUpdateActionButtons: function(stateName, args)
        {
            if (this.isCurrentPlayerActive()) {
                switch(stateName) {
                case 'chooseWorksDirection':
                    for (let dir of ['ketchup', 'mustard']) {
                        let label = `${this.gameModes[dir]} (${this.gameModeDescription[dir]})`;
                        this.addActionButton(`hd_dir_${dir}`, label, () => this.ajaxAction('chooseWorksDirection', {'option': dir}));
                    }
                    break;
                }
            }
        },

        ///////////////////////////////////////////////////
        //// Utility methods

        /*

            Here, you can defines some utility methods that you can use everywhere in your javascript
            script.

        */

        ajaxAction: function (action, args, func, err, lock) {
            if (!args) {
                args = [];
            }
            delete args.action;
            if (!args.hasOwnProperty('lock') || args.lock) {
                args.lock = true;
            } else {
                delete args.lock;
            }
            if (typeof func == 'undefined' || func == null) {
                func = result => {};
            }

            let name = this.game_name;
            this.ajaxcall(`/hotdog/hotdog/${action}.html`, args, this, func, err);
        },

        /** Override this function to inject html for log items  */

        /* @Override */
        format_string_recursive: function (log, args) {
            try {
                if (log && args && !args.processed) {
                    args.processed = true;

                    for (let key in args) {
                        if (args[key] && typeof args[key] == 'string' && key == 'suit') {
                            args[key] = this.getSuitDiv(args[key]);
                        }
                    }
                }
            } catch (e) {
                console.error(log, args, "Exception thrown", e.stack);
            }
            return this.inherited(this.format_string_recursive, arguments);
        },

        getSuitDiv: function (suit_symbol) {
            let suit_id = this.suitSymbolToId[suit_symbol];
            if (!suit_id) {
                suit_id = suit_symbol;
            }
            let suit_name = this.suitNames[suit_id];
            return `<div role=\"img\" title=\"${suit_name}\" aria-label=\"${suit_name}\" class=\"hd_log_suit hd_suit_icon_${suit_id}\"></div>`;
        },

        getCardUniqueId: function(suit, rank) {
            return (suit - 1) * 9 + (rank - 1);
        },

        getCardSpriteXY: function(suit, rank) {
            let modifier = 0;
            if (rank == this.gamedatas.specialRank) {
                modifier = 800;
            } else if (suit == this.gamedatas.trumpSuit) {
                modifier = 400;
            }
            return {
                x: 100 * (rank - 1),
                y: 100 * (suit - 1) + modifier,
            }
        },

        initPlayerHand: function(card_list) {
            for (let i in card_list) {
                let card = card_list[i];
                let suit = card.type;
                let rank = card.type_arg;
                this.playerHand.addToStockWithId(this.getCardUniqueId(suit, rank), card.id);
                this.visibleCards[`${suit},${rank}`] = this.playerHand.getItemDivId(card.id);
            }
        },

        initStrawmen: function(player_id, visible_strawmen, more_strawmen) {
            for (const [ix, straw] of visible_strawmen.entries()) {
                if (!straw) continue;
                this.setStrawman(player_id, ix + 1, straw.type, straw.type_arg, straw.id);
                this.visibleCards[`${straw.type},${straw.type_arg}`] = `hd_straw_${player_id}_${ix + 1}`;
                if (!more_strawmen || more_strawmen[ix]) {
                    let more = document.createElement('div');
                    more.className = 'hd_straw_more';
                    document.getElementById(`hd_straw_${player_id}_${ix+1}`).parentNode.appendChild(more);
                }
            }
        },

        setStrawman: function(player_id, straw_num, suit, rank, card_id) {
            let spriteCoords = this.getCardSpriteXY(suit, rank);
            let elem = document.getElementById(`hd_playerstraw_${player_id}_${straw_num}`);
            let newElem = dojo.place(this.format_block('jstpl_strawman', {
                x: spriteCoords.x,
                y: spriteCoords.y,
                player_id: player_id,
                straw_num: straw_num,
            }), elem);
            newElem.dataset.card_id = card_id;
            this.strawmenById[card_id] = newElem;
            if (player_id == this.player_id) {
                dojo.connect(newElem, 'onclick', this, 'onChoosingStrawman');
            }
            return newElem;
        },

        putCardOnTable: function(player_id, suit, rank, card_id) {
            let cardInHand = false;
            let spriteCoords = this.getCardSpriteXY(suit, rank);
            let placedCard = dojo.place(this.format_block('jstpl_cardontable', {
                x : spriteCoords.x,
                y : spriteCoords.y,
                player_id : player_id
            }), 'hd_playertablecard_' + player_id);
            placedCard.dataset.card_id = card_id;
        },

        playCardOnTable: function(player_id, suit, rank, card_id) {
            this.putCardOnTable(player_id, suit, rank, card_id);

            let strawElem = this.strawmenById[card_id];
            if (strawElem) {
                this.placeOnObject('hd_cardontable_' + player_id, strawElem.id);
                strawElem.remove();
                delete this.strawmenById[card_id];
            } else {
                if (player_id != this.player_id) {
                    // Some opponent played a card
                    // Move card from player panel
                    this.placeOnObject('hd_cardontable_' + player_id, 'overall_player_board_' + player_id);
                } else {
                    // You played a card. If it exists in your hand, move card from there and remove
                    // corresponding item
                    if ($('hd_myhand_item_' + card_id)) {
                        this.placeOnObject('hd_cardontable_' + player_id, 'hd_myhand_item_' + card_id);
                        this.playerHand.removeFromStockById(card_id);
                    }
                }
                this.handSizes[player_id].incValue(-1);
            }

            // In any case: move it to its final destination
            this.slideToObject('hd_cardontable_' + player_id, 'hd_playertablecard_' + player_id).play();
        },

        markActivePlayerTable: function(turn_on, player_id) {
            if (!player_id) {
                player_id = this.getActivePlayerId();
            }
            if (turn_on && player_id && document.getElementById(`hd_playertable_${player_id}`).classList.contains('hd_table_currentplayer'))
                // Do nothing
                return;

            // Remove from all players before adding for desired player
            document.querySelectorAll('#hd_centerarea .hd_table_currentplayer').forEach(
                e => e.classList.remove('hd_table_currentplayer'));
            if (!turn_on) {
                return;
            }
            if (!player_id) {
                return;
            }
            document.getElementById(`hd_playertable_${player_id}`).classList.add('hd_table_currentplayer')
        },

        unmarkPlayableCards: function() {
            document.querySelectorAll('#hd_mystrawmen .hd_playable, #hd_myhand .hd_playable').forEach(
                e => e.classList.remove('hd_playable'));
        },

        getPlayerNameHTML: function(player_info) {
            return `<span style="color:#${player_info.color}">${player_info.name}</span>`;
        },

        setStrawmanPlayerLabel: function(player_info) {
            document.querySelector(`#hd_player_${player_info.id}_strawmen_wrap > h3`).innerHTML = dojo.string.substitute(
                _("${player_name}'s plate"),
                {player_name: this.getPlayerNameHTML(player_info)});
        },

        markGameMode: function() {
            let elem = document.getElementById('hd_game_mode');
            let elem2 = document.getElementById('hd_game_mode_direction');
            if (!this.gamedatas.gameMode) {
                elem.textContent = '?';
                elem2.textContent = '';
            } else {
                elem.textContent = this.gameModes[this.gamedatas.gameMode];
                if (this.gamedatas.gameMode == 'the_works') {
                    this.markWorksDirection();
                } else {
                    elem2.textContent = this.gameModeDescription[this.gamedatas.gameMode];
                }
            }
        },

        markWorksDirection: function() {
            let elem = document.getElementById('hd_game_mode_direction');
            let prefix = _('Currently');
            let description;
            switch (this.gamedatas.rankDirection) {
            case 0:
                description = '?';
                break;
            case 1:
                description = this.gameModeDescription['ketchup'];
                break;
            case -1:
                description = this.gameModeDescription['mustard'];
                break;
            }
            elem.textContent = `${prefix}: ${description}`;
        },

        // Change the graphics of the trump cards and reorder player hand
        markTrumps: function() {
            let container = document.getElementById('hd_trump_suit_container');
            if (this.gamedatas.gameMode == 'the_works') {
                container.style.display = 'none';
            } else {
                let elem = document.getElementById('hd_trump_suit');
                if (this.gamedatas.trumpSuit != '0') {
                    elem.textContent = '';
                    elem.className = `hd_trump_indicator hd_suit_icon_${this.gamedatas.trumpSuit}`;
                    elem.title = elem['aria-label'] = this.suitNames[this.gamedatas.trumpSuit];
                } else {
                    elem.textContent = '?';
                    elem.removeAttribute('title');
                    elem.className = 'hd_trump_indicator';
                }
                container.style.display = 'flex';
            }

            container = document.getElementById('hd_special_rank_container');
            if (this.gamedatas.specialRank == -1) {
                container.style.display = 'none';
            } else {
                let elem = document.getElementById('hd_special_rank');
                if (this.gamedatas.specialRank != '0') {
                    elem.textContent = this.gamedatas.specialRank;
                } else {
                    elem.textContent = '?';
                }
                container.style.display = 'flex';
            }

            for (let [key, div_id] of Object.entries(this.visibleCards)) {
                let [suit, rank] = key.split(',');
                if (rank == this.gamedatas.specialRank || suit == this.gamedatas.trumpSuit) {
                    let elem = document.getElementById(div_id);
                    if (elem) {
                        let coords = this.getCardSpriteXY(suit, rank);
                        elem.style['background-position'] = `-${coords.x}% -${coords.y}%`;
                    }
                }
            }

            // let weights = {}
            // for (let suit = 1; suit <= 4; suit++) {
            //     for (let rank = 1; rank <= 9; rank++) {
            //         // Build card type id
            //         let card_type_id = this.getCardUniqueId(suit, rank);

            //         if (rank == this.gamedatas.specialRank) {
            //             weights[card_type_id] = -1000 + card_type_id;
            //         } else if (suit == this.gamedatas.trumpSuit) {
            //             weights[card_type_id] = -100 + card_type_id;
            //         } else {
            //             weights[card_type_id] = card_type_id;
            //         }
            //     }
            // }
            // this.playerHand.changeItemsWeight(weights);
        },

        // /////////////////////////////////////////////////
        // // Player's action

        /*
         *
         * Here, you are defining methods to handle player's action (ex: results of mouse click on game objects).
         *
         * Most of the time, these methods: _ check the action is possible at this game state. _ make a call to the game server
         *
         */

        onPlayerHandSelectionChanged: function() {
            var items = this.playerHand.getSelectedItems();
            if (items.length == 0)
                return
            this.playerHand.unselectAll();
            if (!document.getElementById(this.playerHand.getItemDivId(items[0].id)).classList.contains('hd_playable')) {
                return;
            }

            if (this.checkAction('playCard', true)) {
                var card_id = items[0].id;
                this.ajaxAction('playCard', {
                    id: card_id,
                });
            } else if (this.checkAction('giftCard')) {
                var card_id = items[0].id;
                this.ajaxAction('giftCard', {
                    id: card_id,
                });
            } else {
                this.playerHand.unselectAll();
            }
        },

        onChoosingStrawman: function(event) {
            if (!this.checkAction('playCard', true))
                return;

            if (!event.currentTarget.classList.contains('hd_playable'))
                return;

            let card_id = event.currentTarget.dataset.card_id;
            if (!card_id)
                return;

            this.ajaxAction('playCard', {
                id: card_id,
            });
        },

        onPickingToppings: function(event) {
            if (!this.checkAction('pickToppings'))
                return;

            let data = event.currentTarget.dataset;
            this.ajaxAction('pickToppings', {
                topping: data.mode,
                suit: data.id,
            });
        },

        onPickingSpecialRank: function(event) {
            if (!this.checkAction('addRelish') && !this.checkAction('addRelishOrSmother'))
                return;

            let data = event.currentTarget.dataset;
            this.ajaxAction('addRelish', {
                option: 'relish',
                id: data.id,
            });
        },

        ///////////////////////////////////////////////////
        //// Reaction to cometD notifications

        /*
            setupNotifications:

            In this method, you associate each of your game notifications with your local method to handle it.

            Note: game notification names correspond to 'notifyAllPlayers' and 'notifyPlayer' calls in
                  your template.game.php file.

        */
        setupNotifications: function() {
            console.log('notifications subscriptions setup');

            dojo.subscribe('newHand', this, 'notif_newHand');
            dojo.subscribe('newHandPublic', this, 'notif_newHandPublic');
            dojo.subscribe('selectGameMode', this, 'notif_selectGameMode');
            dojo.subscribe('addRelish', this, 'notif_addRelish');
            dojo.subscribe('worksDirection', this, 'notif_worksDirection');
            dojo.subscribe('playCard', this, 'notif_playCard');
            this.notifqueue.setSynchronous('playCard', 1000);
            dojo.subscribe('revealStrawmen', this, 'notif_revealStrawmen');
            dojo.subscribe('trickWin', this, 'notif_trickWin');
            dojo.subscribe('giveAllCardsToPlayer', this, 'notif_giveAllCardsToPlayer');
            this.notifqueue.setSynchronous('giveAllCardsToPlayer', 1000);
            dojo.subscribe('newScores', this, 'notif_newScores');
        },

        notif_newHandPublic: function(notif) {
            document.getElementById('hd_special_rank').textContent = '?';
            let elem = document.getElementById('hd_trump_suit');
            elem.textContent = '?';
            elem.removeAttribute('title');
            elem.className = 'hd_trump_indicator';
            this.gamedatas.gameMode = null;
            this.gamedatas.trumpSuit = '0';
            this.gamedatas.specialRank = '0';
            this.gamedatas.rankDirection = 0;

            // The spectator doesn't get the private newHand notification
            if (this.isSpectator) {
                this.visibleCards = {};
            }

            this.markTrumps();
            this.markGameMode();

            // Reset scores and hand size
            for (let scorePile of Object.values(this.trickCounters)) {
                scorePile.setValue(0);
            }

            for (let handSize of Object.values(this.handSizes)) {
                handSize.setValue(notif.args.hand_size);
            }

            for (let player_id in notif.args.strawmen) {
                this.initStrawmen(player_id, notif.args.strawmen[player_id]);
            }
        },

        notif_newHand: function(notif) {
            // We received a new full hand of 13 cards.
            this.playerHand.removeAll();

            this.visibleCards = {};
            this.initPlayerHand(notif.args.hand_cards);
        },

        notif_selectGameMode: function(notif) {
            let game_mode = notif.args.game_mode;
            let new_picker = notif.args.new_picker;

            if (new_picker || new_picker == 0) {
                this.gamedatas.newPicker = new_picker;
            }

            document.getElementById('hd_bidding_current').innerHTML = '';
            let player_html = this.getPlayerNameHTML(this.gamedatas.players[notif.args.player_id]);
            if (!game_mode) {
                if (new_picker == 0) {
                    this.gamedatas.gameMode = 'the_works';
                }
            } else if (game_mode == 'the_works') {
                this.gamedatas.gameMode = game_mode;
            }

            if (game_mode == 'ketchup' || game_mode == 'mustard') {
                this.gamedatas.gameMode = game_mode;
                this.gamedatas.trumpSuit = notif.args.suit_id;
            }
            this.markGameMode();
            this.markTrumps();
        },

        notif_addRelish: function(notif) {
            let option = notif.args.option;

            document.getElementById('hd_bidding_current').innerHTML = '';
            if (option == 'smother') {
                this.gamedatas.gameMode = 'the_works';
                this.gamedatas.trumpSuit = '0';
                this.markGameMode();
            } else if (option == 'pass') {
                this.gamedatas.specialRank = -1;
            } else {
                this.gamedatas.specialRank = notif.args.rank;
            }
            this.markTrumps();
        },

        notif_worksDirection: function(notif) {
            this.gamedatas.rankDirection = notif.args.direction;
            this.markWorksDirection();
        },

        notif_playCard: function(notif) {
            // Mark the active player, in case this was an automated move (skipping playerTurn state)
            this.markActivePlayerTable(true, notif.args.player_id);
            this.unmarkPlayableCards();
            this.playCardOnTable(notif.args.player_id, notif.args.suit_id, notif.args.value, notif.args.card_id);
        },

        notif_revealStrawmen: function(notif) {
            for (let [player_id, revealed_card] of Object.entries(notif.args.revealed_cards)) {
                let pile_id = revealed_card.pile;
                let card = revealed_card.card;

                let pileElem = document.getElementById(`hd_playerstraw_${player_id}_${pile_id}`);
                let more = pileElem.querySelector('.hd_straw_more');
                if (more) {
                    this.fadeOutAndDestroy(more);
                }
                let newCard = this.setStrawman(player_id, pile_id, card.type, card.type_arg, card.id);
                newCard.style.opacity = 0;
                dojo.fadeIn({node: newCard}).play();
            }
        },

        notif_trickWin: function(notif) {
            // We do nothing here (just wait in order players can view the cards played before they're gone
        },

        notif_giveAllCardsToPlayer: function(notif) {
            // Move all cards on table to given table, then destroy them
            let winner_id = notif.args.player_id;
            for (let player_id in this.gamedatas.players) {
                // Make sure the moved card is above the winner card
                let animated_id = 'hd_cardontable_' + player_id;
                if (player_id != winner_id) {
                    document.getElementById(animated_id).style.zIndex = 3;
                }

                let anim = this.slideToObject(animated_id, 'hd_cardontable_' + winner_id);
                dojo.connect(anim, 'onEnd', (node) => {
                    dojo.destroy(node);
                });
                anim.play();
            }
            this.trickCounters[winner_id].incValue(1);
        },

        notif_newScores: function(notif) {
            // Update players' scores
            for (let player_id in notif.args.newScores) {
                this.scoreCtrl[player_id].toValue(notif.args.newScores[player_id]);
            }
        },
   });
});
