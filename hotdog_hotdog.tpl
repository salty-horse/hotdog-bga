{OVERALL_GAME_HEADER}

<!--
--------
-- BGA framework: © Gregory Isabelli <gisabelli@boardgamearena.com> & Emmanuel Colin <ecolin@boardgamearena.com>
-- Hotdog implementation : © Ori Avtalion <ori@avtalion.name>
--
-- This code has been produced on the BGA studio platform for use on http://boardgamearena.com.
-- See http://en.boardgamearena.com/#!doc/Studio for more information.
-------

    hotdog_hotdog.tpl

    This is the HTML template of your game.

-->

<div id="hd_player_{TOP_PLAYER_ID}_strawmen_wrap" class="whiteblock">
    <h3>Opponent's plate</h3>
    <div>
        <div class="hd_straw" id="hd_playerstraw_{TOP_PLAYER_ID}_1"></div>
        <div class="hd_straw" id="hd_playerstraw_{TOP_PLAYER_ID}_2"></div>
        <div class="hd_straw" id="hd_playerstraw_{TOP_PLAYER_ID}_3"></div>
        <div class="hd_straw" id="hd_playerstraw_{TOP_PLAYER_ID}_4"></div>
        <div class="hd_straw" id="hd_playerstraw_{TOP_PLAYER_ID}_5"></div>
    </div>
</div>

<div id="hd_bidding_box" class="whiteblock"></div>

<div id="hd_centerarea">

<!-- BEGIN player -->
<div id="hd_playertable_{PLAYER_ID}" class="hd_playertable whiteblock">
    <div class="hd_playertablename" style="color:#{PLAYER_COLOR}">
        {PLAYER_NAME}
    </div>
    <div class="hd_playertablecard" id="hd_playertablecard_{PLAYER_ID}"></div>
    <span class="hd_playertable_info">
        <span>{TRICKS_WON}: </span>
        <span id="hd_score_pile_{PLAYER_ID}"></span>
    </span>
</div>
<!-- END player -->

<div id="hd_trumpSelector" class="whiteblock">
    <div>
    <div>{TRUMP_SUIT}:</div>
    <div id="hd_trump_suit" class="hd_trump_indicator"></div>
    </div>
    <br>
    <div>
    <div>{SPECIAL_RANK}:</div>
    <div id="hd_trump_rank" class="hd_trump_indicator"></div>
    </div>
</div>

</div>

<div id="hd_player_{BOTTOM_PLAYER_ID}_strawmen_wrap" class="whiteblock">
    <h3>{MY_STRAWMEN}</h3>
    <div id="hd_mystrawmen">
        <div class="hd_straw" id="hd_playerstraw_{BOTTOM_PLAYER_ID}_1"></div>
        <div class="hd_straw" id="hd_playerstraw_{BOTTOM_PLAYER_ID}_2"></div>
        <div class="hd_straw" id="hd_playerstraw_{BOTTOM_PLAYER_ID}_3"></div>
        <div class="hd_straw" id="hd_playerstraw_{BOTTOM_PLAYER_ID}_4"></div>
        <div class="hd_straw" id="hd_playerstraw_{BOTTOM_PLAYER_ID}_5"></div>
    </div>
</div>
<div id="hd_myhand_wrap" class="whiteblock">
    <h3>{MY_HAND}</h3>
    <div id="hd_myhand">
    </div>
</div>


<script type="text/javascript">

// Javascript HTML templates

var jstpl_cardontable = '<div class="hd_cardontable" id="hd_cardontable_${player_id}" style="background-position:-${x}% -${y}%"></div>';
var jstpl_strawman = '<div class="hd_strawcard" id="hd_straw_${player_id}_${straw_num}" style="background-position:-${x}% -${y}%"></div>';
var jstpl_player_hand_size = '<div class="hd_hand_size">\
    <span id="hd_player_hand_size_${id}">0</span>\
    <span class="fa fa-hand-paper-o"/>\
</div>';
var jstpl_suit_selector = '<ul id="vid_suitSelector">\
    <li data-type="suit" class="hd_suit_icon_1" data-mode='${game_mode}' data-id="1"></li>\
    <li data-type="suit" class="hd_suit_icon_2" data-mode='${game_mode}' data-id="2"></li>\
    <li data-type="suit" class="hd_suit_icon_3" data-mode='${game_mode}' data-id="3"></li>\
    <li data-type="suit" class="hd_suit_icon_4" data-mode='${game_mode}' data-id="4"></li></ul>';

</script>

{OVERALL_GAME_FOOTER}
