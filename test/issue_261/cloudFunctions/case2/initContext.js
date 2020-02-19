var Hero = (function (_super) {
    function Hero(name, deck) {
        var _this = this;
        _this.name = name;
        _this.deck = CardCollection.DeepCopy(deck);
        return _this;
    }

    return Hero;
}());

var Card = (function (_super) {
    function Card(name, id) {
        var _this = this;
        _this.name = name;
        _this.id = id;
        return _this;
    }

    return Card;
}());

var CardCollection = (function (_super) {
    function CardCollection(unitCards, spellCards) {
        var _this = this;
        if (arguments.length === 0) {
            _this.constructor_0();
            return _this;
        }
        _this.constructor_1(unitCards, spellCards);
        return _this;
    }

    CardCollection.prototype.constructor_0 = function () {
        this.UnitCards = new Array(0);
        this.SpellCards = new Array(0);
    };
    CardCollection.prototype.constructor_1 = function (unitCards, spellCards) {
        this.UnitCards = new Array(unitCards.length);
        this.SpellCards = new Array(spellCards.length);
        for (var i = 0; i < unitCards.length; i = i + 1) {
            this.UnitCards[i] = unitCards[i];
        }
        for (var i = 0; i < spellCards.length; i = i + 1) {
            this.SpellCards[i] = spellCards[i];
        }
    };
    CardCollection.DeepCopy = function (other) {
        var result;
        if (other == null) {
            result = null;
        } else {
            var cardCollection = new CardCollection();
            cardCollection.UnitCards = new Array(other.UnitCards.length);
            cardCollection.SpellCards = new Array(other.SpellCards.length);
            for (var i = 0; i < other.UnitCards.length; i = i + 1) {
                cardCollection.UnitCards[i] = other.UnitCards[i];
            }
            for (var i = 0; i < other.SpellCards.length; i = i + 1) {
                cardCollection.SpellCards[i] = other.SpellCards[i];
            }
            result = cardCollection;
        }
        return result;
    };

    return CardCollection;
}());

function DefaultTutorialDeckOrder() {
    var cards = [];
    cards.push(new Card("OrderSoldier", 1));
    cards.push(new Card("OrderNun", 18));

    var spellCards = [];
    spellCards.push(new Card("WaveOfLight", 10001));
    spellCards.push(new Card("SummonArcher", 10019));

    var collection = new CardCollection(cards, spellCards);
    return collection;
}

function getTestHeroTutorialOrder() {
    return new Hero("HeroOrder", DefaultTutorialDeckOrder());
}

defineGlobal('getTestHeroTutorialOrder', getTestHeroTutorialOrder);