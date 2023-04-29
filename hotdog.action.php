<?php
/**
 *------
 * BGA framework: © Gregory Isabelli <gisabelli@boardgamearena.com> & Emmanuel Colin <ecolin@boardgamearena.com>
 * Hotdog implementation : © Ori Avtalion <ori@avtalion.name>
 *
 * This code has been produced on the BGA studio platform for use on https://boardgamearena.com.
 * See http://en.doc.boardgamearena.com/Studio for more information.
 * -----
 *
 * Hotdog main action entry point
 *
 *
 * In this file, you are describing all the methods that can be called from your
 * user interface logic (javascript).
 *
 * If you define a method 'myAction' here, then you can call it from your javascript code with:
 * this.ajaxcall( '/hotdog/hotdog/myAction.html', ...)
 *
 */


class action_hotdog extends APP_GameAction {

    // Constructor: please do not modify
    public function __default() {
        if (self::isArg('notifwindow')) {
            $this->view = "common_notifwindow";
            $this->viewArgs ['table'] = self::getArg("table", AT_posint, true);
        } else {
            $this->view = "hotdog_hotdog";
            self::trace("Complete reinitialization of board game");
        }
    }

    public function pickToppings() {
        self::setAjaxMode();
        $topping = self::getArg('topping', AT_enum, true, null, ['ketchup', 'mustard', 'the_works', 'pass']);
        $trump_suit = self::getArg('suit', AT_posint, false);
        if (in_array($topping, ['ketchup', 'mustard'])) {
            if (!$trump_suit or $trump_suit > 4) {
                throw new BgaUserException(self::_('Invalid trump suit'));
            }
        }

        $this->game->pickToppings($topping, $trump_suit);
        self::ajaxResponse();
    }

    public function addRelish() {
        self::setAjaxMode();
        $option = self::getArg('option', AT_enum, true, null, ['relish', 'pass', 'smother']);
        $special_rank = self::getArg('id', AT_posint, false);
        if ($option == 'relish') {
            if (!$special_rank or $special_rank > 9) {
                throw new BgaUserException(self::_('Invalid trump value'));
            }
        }

        $this->game->addRelish($option, $special_rank);
        self::ajaxResponse();
    }

    public function chooseWorksDirection() {
        self::setAjaxMode();
        $option = self::getArg('option', AT_enum, true, null, ['ketchup', 'mustard']);
        $this->game->chooseWorksDirection($option);
        self::ajaxResponse();
    }

    public function playCard() {
        self::setAjaxMode();
        $card_id = self::getArg('id', AT_posint, true);
        $this->game->playCard($card_id);
        self::ajaxResponse();
    }
}
