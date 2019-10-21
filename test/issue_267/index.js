'use strict';

var expect = require('chai').expect,
    _ = require('lodash'),
    async = require('async'),
    shell = require('shelljs');

var goblinBase = require('../../index.js').getGoblinBase();

var opClients = require('../../lib/operativeSubsystem/opClients.js'),
    gameplayRoom,
    testUtils = require('../utils/testUtils.js');

var Profile = require('../../lib/persistenceSubsystem/dao/profile.js');

const START_AT_HOST = require('../testEntryPoint.js').START_AT_HOST,
    START_AT_PORT = require('../testEntryPoint.js').START_AT_PORT;

describe('Before stuff', () => {
    it('Should do some stuff', () => {
        gameplayRoom = require('../../lib/features/realtimePvp/gameplayRoom.js');
    });
    it('Should do clean before run', done => {
        async.parallel([
            cb => testUtils.removeAllDocuments(cb),
            cb => opClients.getSessionsClient().getRedis().flushall(cb)
        ], done);
    });
});
describe('The cases', () => {
    var cachedMatchmakingStrategy;

    describe('The stuff', () => {
        it('Should do some stuff', () => {
            cachedMatchmakingStrategy = goblinBase.matchmakingConfig.strategy;
            goblinBase.matchmakingConfig.strategy = 'open';
        });
    });

    describe('Adding cloud functions', () => {
        it('Should you know what', done => {
            goblinBase
                .requireAsCloudFunction('./cloudFunctions/createNewProfile.js')
                .requireAsCloudFunction('./cloudFunctions/mmWithRealPlayer.js')
                .requireAsCloudFunction('./cloudFunctions/readProfileData.js')
                .requireAsCloudFunction('./cloudFunctions/setSingleRecordForMm.js')
                .requireAsCloudFunction('./cloudFunctions/pvp/pvpAutoCloseHandler.js')
                .requireAsCloudFunction('./cloudFunctions/pvp/pvpCheckGameOver.js')
                .requireAsCloudFunction('./cloudFunctions/pvp/pvpConnectionHandler.js')
                .requireAsCloudFunction('./cloudFunctions/pvp/pvpGameOverHandler.js')
                .requireAsCloudFunction('./cloudFunctions/pvp/pvpGeneratePayload.js')
                .requireAsCloudFunction('./cloudFunctions/pvp/pvpInitGameplayModel.js')
                .requireAsCloudFunction('./cloudFunctions/pvp/pvpTurnHandler.js')
                ._reinitCloudFunctions(done);
        });
    });

    describe('Case #1', () => {
        var unicorns = [], gClientIds = [], gClientSecrets = [];

        _(2).times(n => {
            it(`Should create new account #${n + 1}`, done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    expect(body).to.have.property('unicorn');
                    expect(body).to.have.property('gClientId');
                    expect(body).to.have.property('gClientSecret');

                    unicorns.push(_unicorn);
                    gClientIds.push(body.gClientId);
                    gClientSecrets.push(body.gClientSecret);

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', null, null, null, callbackFn);
            });
            it(`Should create new profile #${n + 1}`, done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.createProfile', null, unicorns[n], callbackFn);
            });
        });

        var pid1, pid2;

        it('Should get players\' pids', done => {
            let callbackFn = (err, docs) => {
                expect(err).to.be.a('null');
                expect(docs).to.not.be.a('null');
                expect(docs.length).to.be.equal(2);

                [pid1, pid2] = [docs[0]._id.toString(), docs[1]._id.toString()];

                done();
            };

            async.parallel([
                cb => Profile.findOne({ humanId: 1 }, { projection: { _id: 1 } }, cb),
                cb => Profile.findOne({ humanId: 2 }, { projection: { _id: 1 } }, cb)
            ], callbackFn);
        });
        it('Should call function setSingleRecordForMm', done => {
            let callbackFn = (err, response) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.setSingleRecordForMm', null, unicorns[0], callbackFn);
        });

        var roomOccupation;

        it('Should get room occupation by hand ¯\\_(ツ)_/¯', done => {
            let callbackFn = (err, response) => {
                expect(err).to.be.a('null');

                roomOccupation = +response;
                expect(roomOccupation).to.be.equal(goblinBase.pvpConfig.pairsCapacity);

                done();
            };

            opClients.getGameplayRoomClient().getOccupation([goblinBase.pvpConfig.pairsCapacity], callbackFn);
        });
        it('Should add room to matchmaking by hand', done => {
            let callbackFn = err => {
                expect(err).to.be.a('null');

                done();
            };

            var ipAddress = gameplayRoom._getIpAddress();
            opClients.getMatchmakingClient().updateRoomOccupation([ipAddress, 3000, '-1', roomOccupation], callbackFn);
        });

        it('Should push some values into matchmaking redis', done => {
            let callbackFn = err => {
                expect(err).to.be.a('null');

                done();
            };

            async.series([
                cb => opClients.getMatchmakingClient().getRedis().hmset(
                    'grmb:{\"hosts\":{\"asIP\":\"207.154.253.223\",\"asDomain\":\"card-game-dev2.redmachinegames.com\"},\"ports\":{\"wss\":7331,\"ws\":7333}}:39evlr5-23jnt37',
                    'upd', '1551179713309',
                    "opp", pid2,
                    "stat", "0",
                    "pid", pid1,
                    "opbot", "1",
                    "bpd", "-1",
                    cb
                ),
                cb => opClients.getMatchmakingClient().getRedis().hmset(
                    `qplr:${pid1}`,
                    "stat", "4",
                    "grip", "{\"hosts\":{\"asIP\":\"207.154.253.223\",\"asDomain\":\"card-game-dev2.redmachinegames.com\"},\"ports\":{\"wss\":7331,\"ws\":7333}}",
                    "upd", "1551179717512",
                    "pid", pid1,
                    "ky", "39evlr5-23jnt37",
                    "opbot", "1",
                    "opp", pid2,
                    cb
                )
            ], callbackFn);
        });
        it('Should push some values into pvp room redis', done => {
            let callbackFn = err => {
                expect(err).to.be.a('null');

                done();
            };

            async.series([
                cb => opClients.getGameplayRoomClient().getRedis().hmset(
                    'pair:1bqieei',
                    "turb", "1",
                    "plda", "payload|name|Player+7916693|id|baseHp|currentHp|race|level|experience|deck|UnitCards|OrderSoldier|cardRace|rarity|cardCount|cardType|unitInfo|spellInfo|OrderNun|OrderStandardBearer|OrderCommanderGirl|NatureSpearWarrior|ChaosBerserker|ChaosCrossbowman|NatureScout|SpellCards|WaveOfLight|SummonArcher|lastUnitCardId|secondLastUnitCardId|thirdLastUnitCardId|lastSpellCardId|hand|abilities|soundsData|spellCount|isUnit|AvatarId|isBot|campaignData|isA^0|19|19|0|1|0|1|0|0|1|1|0|I|0|0|1|1|0|H|0|0|1|1|0|G|0|1|1|1|0|3A|2|0|1|1|0|3|1|1|1|1|0|F|1|0|1|1|0|K|2|0|1|1|0|7PT|0|2|1|1|1|7QB|0|0|1|1|1|-1|-1|-1|-1|0|0^^$0|$1|2|3|15|4|16|5|17|6|18|7|19|8|1A|9|$A|@$1|B|3|1B|C|1C|D|1D|7|1E|E|1F|F|1G|G|-3|H|-3]|$1|I|3|1H|C|1I|D|1J|7|1K|E|1L|F|1M|G|-3|H|-3]|$1|J|3|1N|C|1O|D|1P|7|1Q|E|1R|F|1S|G|-3|H|-3]|$1|K|3|1T|C|1U|D|1V|7|1W|E|1X|F|1Y|G|-3|H|-3]|$1|L|3|1Z|C|20|D|21|7|22|E|23|F|24|G|-3|H|-3]|$1|M|3|25|C|26|D|27|7|28|E|29|F|2A|G|-3|H|-3]|$1|N|3|2B|C|2C|D|2D|7|2E|E|2F|F|2G|G|-3|H|-3]|$1|O|3|2H|C|2I|D|2J|7|2K|E|2L|F|2M|G|-3|H|-3]]|P|@$1|Q|3|2N|C|2O|D|2P|7|2Q|E|2R|F|2S|G|-3|H|-3]|$1|R|3|2T|C|2U|D|2V|7|2W|E|2X|F|2Y|G|-3|H|-3]]|S|2Z|T|30|U|31|V|32]|W|-3|X|-3|Y|-3|Z|33|10|-2|11|34]|12|-2|13|-3|14|-1]",
                    "pavgb", "105",
                    "hida", "1",
                    "pida", pid1,
                    "mdl", "startTs|randomSeed|model|gmodel|UNIT_CARDS_IN_HAND|SPELL_CARDS_IN_HAND|isGameOver|isNoWinner|player1Wins|player1Turn|player1TurnFirst|turnPhase|randomCounter|turnCount|usePseudoRandom|pseudoRandomSequence|random|_counter|permanentEffectsManager|lastTarget|belongsToPlayer1|isHero|isUnit|position|row|column|player1Hero|name|Player+7916693|id|baseHp|currentHp|race|level|experience|deck|UnitCards|OrderSoldier|cardRace|rarity|cardCount|cardType|unitInfo|spellInfo|OrderNun|OrderStandardBearer|OrderCommanderGirl|NatureSpearWarrior|ChaosBerserker|ChaosCrossbowman|NatureScout|SpellCards|WaveOfLight|SummonArcher|lastUnitCardId|secondLastUnitCardId|thirdLastUnitCardId|lastSpellCardId|hand|abilities|soundsData|spellCount|player1Units|unitName|baseAttack|combatType|size|abilityName|DivineShield|abilityType|abilityId|numericValue|effect|triggering|specialAnimationOnSourceTarget|specialAnimationName|additionalGlobalAnimation|additionalGlobalAnimationBindToSource|additionalGlobalAnimationName|triggerType|target|mainTarget|targetType|positionFilter|typeFilter|typeFilterData|additionalTypeFilter|additionalTypeFilterData|activatedEffectTag|abilityRemainingTurns|unitAbilityAnimationNumber|abilityDescription|HpBonus|effectName|hasOwnAnimation|ownAnimationName|effectType|effectIdValue|effectNumericValue|effectDuration|effectValueMultiplicationTargeting|effectTag|animationEventSequence|effectCondition|isCard|attackAnimationEffectOnTarget|HitWeaponMelee|customSpawnAnimation|pack|FireSeal|AdditionalStrike|Shrub|Thorns|player1Runes|type|runeNumericValue|player2Hero|Player+6671496|player2Units|Block|Stone|player2Runes|nonVerifiedTurns|botMistakes|importantEvents|summonUnit|total|2|3|5|6|9|14|0|1|killUnit|bySpell|byRangedUnit|playSpell|damageToOpponentHero|commandBuffer|player1Command|cardNumInHand|targetBelongsToPlayer1|nullCommand|campaignData^JSLKKFOF|WK3VMP|4|4|1|WK3VMP|Z|1|WK3VNO|-1|-1|0|19|17|0|1|0|1|0|0|1|1|0|I|0|0|1|1|0|H|0|0|1|1|0|G|0|1|1|1|0|3A|2|0|1|1|0|3|1|1|1|1|0|F|1|0|1|1|0|K|2|0|1|1|0|7PT|0|2|1|1|1|7QB|0|0|1|1|1|-1|-1|-1|-1|G|0|1|1|1|0|1|0|0|1|1|0|F|1|0|1|1|0|7QB|0|0|1|1|1|7PT|0|2|1|1|1|3|K|-1|-1|1|K|2|6|2|0|1|5|9|9|1|0|0|0|0|0|0|0|0|-1|0|1|1|3|0|0|0|0|0|-1|0|0|0|0|0|-1|-1|0|3|6|3|1|0|1|6|5|5|1|0|0|0|0|0|0|0|0|-1|0|1|C|7|0|3|2|0|7|3|3|3|0|0|0|0|0|0|0|0|-1|0|4|C|7|0|3|2|0|7|3|3|3|0|0|0|0|0|0|0|0|-1|0|4|0|0|2|0|19|19|0|1|0|1|0|0|1|1|0|I|0|0|1|1|0|H|0|0|1|1|0|G|0|1|1|1|0|3A|2|0|1|1|0|3|1|1|1|1|0|F|1|0|1|1|0|K|2|0|1|1|0|7PT|0|2|1|1|1|7QB|0|0|1|2|1|-1|-1|-1|-1|K|2|0|1|1|0|G|0|1|1|1|0|H|0|0|1|1|0|3A|2|0|1|1|0|7PT|0|2|1|1|1|7QB|0|0|1|2|1|1|-1|-1|-1|1|1|A|2|0|0|1|9|2|2|1|0|1|0|0|0|0|0|0|-1|0|1|1|3|0|0|0|0|0|-1|0|0|0|0|0|-1|-1|0|B|7|0|3|2|0|7|2|2|1|0|1|0|0|0|0|0|0|-1|0|4|0|0|2|0|1|3|0|0|2|0|0|1|0|1|0|2|1|1|1|1|1|1|0|0|0|0|3|0|0|0|3|0|1|0|3|0|1|0^^$0|42|1|43|2|$3|$4|44|5|45|6|-2|7|-2|8|-2|9|-2|A|-1|B|46|1|47|C|48|D|49|E|-2|F|-3|G|$H|4A]|I|-3|J|$K|-1|L|-2|M|-2|N|$O|4B|P|4C]]|Q|$R|S|T|4D|U|4E|V|4F|W|4G|X|4H|Y|4I|Z|$10|@$R|11|T|4J|12|4K|13|4L|X|4M|14|4N|15|4O|16|-3|17|-3]|$R|18|T|4P|12|4Q|13|4R|X|4S|14|4T|15|4U|16|-3|17|-3]|$R|19|T|4V|12|4W|13|4X|X|4Y|14|4Z|15|50|16|-3|17|-3]|$R|1A|T|51|12|52|13|53|X|54|14|55|15|56|16|-3|17|-3]|$R|1B|T|57|12|58|13|59|X|5A|14|5B|15|5C|16|-3|17|-3]|$R|1C|T|5D|12|5E|13|5F|X|5G|14|5H|15|5I|16|-3|17|-3]|$R|1D|T|5J|12|5K|13|5L|X|5M|14|5N|15|5O|16|-3|17|-3]|$R|1E|T|5P|12|5Q|13|5R|X|5S|14|5T|15|5U|16|-3|17|-3]]|1F|@$R|1G|T|5V|12|5W|13|5X|X|5Y|14|5Z|15|60|16|-3|17|-3]|$R|1H|T|61|12|62|13|63|X|64|14|65|15|66|16|-3|17|-3]]|1I|67|1J|68|1K|69|1L|6A]|1M|$10|@$R|1A|T|6B|12|6C|13|6D|X|6E|14|6F|15|6G|16|-3|17|-3]|$R|11|T|6H|12|6I|13|6J|X|6K|14|6L|15|6M|16|-3|17|-3]|$R|1D|T|6N|12|6O|13|6P|X|6Q|14|6R|15|6S|16|-3|17|-3]]|1F|@$R|1H|T|6T|12|6U|13|6V|X|6W|14|6X|15|6Y|16|-3|17|-3]|$R|1G|T|6Z|12|70|13|71|X|72|14|73|15|74|16|-3|17|-3]]|1I|75|1J|76|1K|77|1L|78]|1N|@]|1O|-3|1P|79|M|-2]|1Q|@$1R|1E|T|7A|U|7B|1S|7C|W|7D|1T|7E|1U|-5|X|7F|V|7G|1N|@$1V|1W|1X|7H|1Y|7I|1Z|7J|20|-3|21|$22|-2|23|-4|24|-2|25|-2|26|-4|27|7K|28|$29|7L|2A|7M|2B|7N|2C|7O|2D|7P|2E|7Q|2F|7R]|2G|-4]|2H|7S|2I|7T|2J|-4]|$1V|2K|1X|7U|1Y|7V|1Z|7W|20|$2L|-4|2M|-2|2N|-4|2O|7X|2P|7Y|2Q|7Z|2R|80|28|-3|2S|$29|81|2A|82|2B|83|2C|84|2D|85|2E|86|2F|87]|2T|-4|2U|-1|2V|-3]|21|-3|2H|88|2I|89|2J|-4]]|2W|-5|2X|2Y|2Z|-4|13|8A|1O|-3|30|31]|-3|-3|$1R|1C|T|8B|U|8C|1S|8D|W|8E|1T|8F|1U|-5|X|8G|V|8H|1N|@$1V|32|1X|8I|1Y|8J|1Z|8K|20|-3|21|$22|-2|23|-4|24|-2|25|-2|26|-4|27|8L|28|$29|8M|2A|8N|2B|8O|2C|8P|2D|8Q|2E|8R|2F|8S]|2G|-4]|2H|8T|2I|8U|2J|-4]]|2W|-5|2X|2Y|2Z|-4|13|8V|1O|-3|30|31]|-3|-3|$1R|33|T|8W|U|8X|1S|8Y|W|8Z|1T|90|1U|-5|X|91|V|92|1N|@$1V|34|1X|93|1Y|94|1Z|95|20|-3|21|$22|-2|23|-4|24|-2|25|-2|26|-4|27|96|28|$29|97|2A|98|2B|99|2C|9A|2D|9B|2E|9C|2F|9D]|2G|-4]|2H|9E|2I|9F|2J|-4]]|2W|-5|2X|2Y|2Z|-4|13|9G|1O|-3|30|31]|$1R|33|T|9H|U|9I|1S|9J|W|9K|1T|9L|1U|-5|X|9M|V|9N|1N|@$1V|34|1X|9O|1Y|9P|1Z|9Q|20|-3|21|$22|-2|23|-4|24|-2|25|-2|26|-4|27|9R|28|$29|9S|2A|9T|2B|9U|2C|9V|2D|9W|2E|9X|2F|9Y]|2G|-4]|2H|9Z|2I|A0|2J|-4]]|2W|-5|2X|2Y|2Z|-4|13|A1|1O|-3|30|31]|-3|-3|-3|-3]|35|@-3|-3|-3|-3|-3|-3|-3|-3|-3|-3|$36|A2|1X|A3|37|A4]|-3]|38|$R|39|T|A5|U|A6|V|A7|W|A8|X|A9|Y|AA|Z|$10|@$R|11|T|AB|12|AC|13|AD|X|AE|14|AF|15|AG|16|-3|17|-3]|$R|18|T|AH|12|AI|13|AJ|X|AK|14|AL|15|AM|16|-3|17|-3]|$R|19|T|AN|12|AO|13|AP|X|AQ|14|AR|15|AS|16|-3|17|-3]|$R|1A|T|AT|12|AU|13|AV|X|AW|14|AX|15|AY|16|-3|17|-3]|$R|1B|T|AZ|12|B0|13|B1|X|B2|14|B3|15|B4|16|-3|17|-3]|$R|1C|T|B5|12|B6|13|B7|X|B8|14|B9|15|BA|16|-3|17|-3]|$R|1D|T|BB|12|BC|13|BD|X|BE|14|BF|15|BG|16|-3|17|-3]|$R|1E|T|BH|12|BI|13|BJ|X|BK|14|BL|15|BM|16|-3|17|-3]]|1F|@$R|1G|T|BN|12|BO|13|BP|X|BQ|14|BR|15|BS|16|-3|17|-3]|$R|1H|T|BT|12|BU|13|BV|X|BW|14|BX|15|BY|16|-3|17|-3]]|1I|BZ|1J|C0|1K|C1|1L|C2]|1M|$10|@$R|1E|T|C3|12|C4|13|C5|X|C6|14|C7|15|C8|16|-3|17|-3]|$R|1A|T|C9|12|CA|13|CB|X|CC|14|CD|15|CE|16|-3|17|-3]|$R|19|T|CF|12|CG|13|CH|X|CI|14|CJ|15|CK|16|-3|17|-3]|$R|1B|T|CL|12|CM|13|CN|X|CO|14|CP|15|CQ|16|-3|17|-3]]|1F|@$R|1G|T|CR|12|CS|13|CT|X|CU|14|CV|15|CW|16|-3|17|-3]|$R|1H|T|CX|12|CY|13|CZ|X|D0|14|D1|15|D2|16|-3|17|-3]]|1I|D3|1J|D4|1K|D5|1L|D6]|1N|@]|1O|-3|1P|D7|M|-2]|3A|@-3|-3|-3|$1R|11|T|D8|U|D9|1S|DA|W|DB|1T|DC|1U|-5|X|DD|V|DE|1N|@$1V|3B|1X|DF|1Y|DG|1Z|DH|20|-3|21|$22|-2|23|-4|24|-2|25|-2|26|-4|27|DI|28|$29|DJ|2A|DK|2B|DL|2C|DM|2D|DN|2E|DO|2F|DP]|2G|-4]|2H|DQ|2I|DR|2J|-4]|$1V|2K|1X|DS|1Y|DT|1Z|DU|20|$2L|-4|2M|-2|2N|-4|2O|DV|2P|DW|2Q|DX|2R|DY|28|-3|2S|$29|DZ|2A|E0|2B|E1|2C|E2|2D|E3|2E|E4|2F|E5]|2T|-4|2U|-1|2V|-3]|21|-3|2H|E6|2I|E7|2J|-4]]|2W|-5|2X|2Y|2Z|-4|13|E8|1O|-3|30|31]|-3|-3|-3|$1R|3C|T|E9|U|EA|1S|EB|W|EC|1T|ED|1U|-5|X|EE|V|EF|1N|@$1V|3B|1X|EG|1Y|EH|1Z|EI|20|-3|21|$22|-2|23|-4|24|-2|25|-2|26|-4|27|EJ|28|$29|EK|2A|EL|2B|EM|2C|EN|2D|EO|2E|EP|2F|EQ]|2G|-4]|2H|ER|2I|ES|2J|-4]]|2W|-5|2X|2Y|2Z|-4|13|ET|1O|-3|30|31]|-3|-3|-3|-3]|3D|@$36|EU|1X|EV|37|EW]|-3|-3|-3|-3|-3|$36|EX|1X|EY|37|EZ]|-3|-3|-3|-3|-3]|3E|F0|3F|F1|3G|$3H|$3I|F2|1N|$3J|F3|3K|F4|3L|F5|3M|F6|3N|F7|3O|F8]|1T|$3P|F9]|13|$3P|FA|3Q|FB]|W|$3Q|FC|3J|FD]]|3R|$3I|FE|W|$3K|FF]|3S|FG|3T|FH]|3U|FI|3V|FJ]|3W|@$3X|-1|3Y|FK|15|FL|28|$O|FM|P|FN]|3Z|-1|40|-2]|$3X|-2|3Y|FO|15|FP|28|$O|FQ|P|FR]|3Z|-2|40|-2]|$3X|-1|3Y|FS|15|FT|28|$O|FU|P|FV]|3Z|-1|40|-2]]]|41|-3]]",
                    "stat", "4",
                    "tura", "2",
                    "ppen", "0",
                    "hidb", "2",
                    "cat", "1551173358",
                    "pavga", "187",
                    "pidb", pid2,
                    "pldb", "payload|name|Player+6671496|id|baseHp|currentHp|race|level|experience|deck|UnitCards|OrderSoldier|cardRace|rarity|cardCount|cardType|unitInfo|spellInfo|OrderNun|OrderStandardBearer|OrderCommanderGirl|NatureSpearWarrior|ChaosBerserker|ChaosCrossbowman|NatureScout|SpellCards|WaveOfLight|SummonArcher|lastUnitCardId|secondLastUnitCardId|thirdLastUnitCardId|lastSpellCardId|hand|abilities|soundsData|spellCount|isUnit|AvatarId|isBot|campaignData|isA^0|19|19|0|1|0|1|0|0|1|1|0|I|0|0|1|1|0|H|0|0|1|1|0|G|0|1|1|1|0|3A|2|0|1|1|0|3|1|1|1|1|0|F|1|0|1|1|0|K|2|0|1|1|0|7PT|0|2|1|1|1|7QB|0|0|1|2|1|-1|-1|-1|-1|0|0^^$0|$1|2|3|15|4|16|5|17|6|18|7|19|8|1A|9|$A|@$1|B|3|1B|C|1C|D|1D|7|1E|E|1F|F|1G|G|-3|H|-3]|$1|I|3|1H|C|1I|D|1J|7|1K|E|1L|F|1M|G|-3|H|-3]|$1|J|3|1N|C|1O|D|1P|7|1Q|E|1R|F|1S|G|-3|H|-3]|$1|K|3|1T|C|1U|D|1V|7|1W|E|1X|F|1Y|G|-3|H|-3]|$1|L|3|1Z|C|20|D|21|7|22|E|23|F|24|G|-3|H|-3]|$1|M|3|25|C|26|D|27|7|28|E|29|F|2A|G|-3|H|-3]|$1|N|3|2B|C|2C|D|2D|7|2E|E|2F|F|2G|G|-3|H|-3]|$1|O|3|2H|C|2I|D|2J|7|2K|E|2L|F|2M|G|-3|H|-3]]|P|@$1|Q|3|2N|C|2O|D|2P|7|2Q|E|2R|F|2S|G|-3|H|-3]|$1|R|3|2T|C|2U|D|2V|7|2W|E|2X|F|2Y|G|-3|H|-3]]|S|2Z|T|30|U|31|V|32]|W|-3|X|-3|Y|-3|Z|33|10|-2|11|34]|12|-2|13|-3|14|-2]",
                    "lmsga", "1551173549",
                    "upd", "1551173520010",
                    "lmsgb", "1551173519",
                    cb
                ),
                cb => opClients.getGameplayRoomClient().getRedis().rpush(
                    `ping:${pid1}`,
                    "4", "5", "6", "7", "8", "9", "10", "2", "3", "4",
                    cb
                ),
                cb => opClients.getGameplayRoomClient().getRedis().hmset(
                    'pinx:155i8ec-20ihqme',
                    "prid", "1bqieei",
                    "pid", pid1,
                    cb
                )
            ], callbackFn);
        });

        it('Should wait for some time to clear mm and pvp room', done => setTimeout(done, 5000));

        it('Should check keys in mm redis that should not be there', done => {
            let callbackFn = (err, response) => {
                expect(err).to.be.a('null');
                expect(response).to.deep.equal(0);

                done();
            };

            opClients.getMatchmakingClient().getRedis().exists(
                'grmb:{\"hosts\":{\"asIP\":\"207.154.253.223\",\"asDomain\":\"card-game-dev2.redmachinegames.com\"},\"ports\":{\"wss\":7331,\"ws\":7333}}:39evlr5-23jnt37',
                `qplr:${pid1}`,
                callbackFn
            );
        });
        it('Should check keys in pvp room redis that should not be there', done => {
            let callbackFn = (err, response) => {
                expect(err).to.be.a('null');
                expect(response).to.deep.equal(1);

                done();
            };

            opClients.getGameplayRoomClient().getRedis().exists(
                'pair:1bqieei', `ping:${pid1}`, 'pinx:155i8ec-20ihqme',
                callbackFn
            )
        });
    });
    describe('Case #2', () => {
        it('Should drop databases', done => {
            async.parallel([
                cb => testUtils.removeAllDocuments(cb),
                cb => opClients.getSessionsClient().getRedis().flushall(cb)
            ], done);
        });

        var unicorns = [], gClientIds = [], gClientSecrets = [];

        _(2).times(n => {
            it(`Should create new account #${n + 1}`, done => {
                let callbackFn = (err, response, body, _unicorn) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    expect(body).to.have.property('unicorn');

                    expect(body).to.have.property('unicorn');
                    expect(body).to.have.property('gClientId');
                    expect(body).to.have.property('gClientSecret');

                    unicorns.push(_unicorn);
                    gClientIds.push(body.gClientId);
                    gClientSecrets.push(body.gClientSecret);

                    done();
                };

                testUtils.thePost(START_AT_HOST, START_AT_PORT, 'accounts.getAccount', null, null, null, callbackFn);
            });
            it(`Should create new profile #${n + 1}`, done => {
                let callbackFn = (err, response) => {
                    expect(err).to.be.equal(null);
                    expect(response.statusCode).to.equal(200);

                    done();
                };

                testUtils.theGet(START_AT_HOST, START_AT_PORT, 'profile.createProfile', null, unicorns[n], callbackFn);
            });
        });

        var pid1, pid2;

        it('Should get players\' pids', done => {
            let callbackFn = (err, docs) => {
                expect(err).to.be.a('null');
                expect(docs).to.not.be.a('null');
                expect(docs.length).to.be.equal(2);

                [pid1, pid2] = [docs[0]._id.toString(), docs[1]._id.toString()];

                done();
            };

            async.parallel([
                cb => Profile.findOne({ humanId: 1 }, { projection: { _id: 1 } }, cb),
                cb => Profile.findOne({ humanId: 2 }, { projection: { _id: 1 } }, cb)
            ], callbackFn);
        });
        it('Should call function setSingleRecordForMm', done => {
            let callbackFn = (err, response) => {
                expect(err).to.be.equal(null);
                expect(response.statusCode).to.equal(200);

                done();
            };

            testUtils.theGet(START_AT_HOST, START_AT_PORT, 'act.setSingleRecordForMm', null, unicorns[0], callbackFn);
        });

        var roomOccupation;

        it('Should get room occupation by hand ¯\\_(ツ)_/¯', done => {
            let callbackFn = (err, response) => {
                expect(err).to.be.a('null');

                roomOccupation = +response;
                expect(roomOccupation).to.be.equal(goblinBase.pvpConfig.pairsCapacity);

                done();
            };

            opClients.getGameplayRoomClient().getOccupation([goblinBase.pvpConfig.pairsCapacity], callbackFn);
        });
        it('Should add room to matchmaking by hand', done => {
            let callbackFn = err => {
                expect(err).to.be.a('null');

                done();
            };

            var ipAddress = gameplayRoom._getIpAddress();
            opClients.getMatchmakingClient().updateRoomOccupation([ipAddress, 3000, '-1', roomOccupation], callbackFn);
        });

        it('Should dump gameplayRoom.rcli into pvp room redis', () => {
            shell.cd(__dirname);
            var result = shell.cat('gameplayRoom.rcli').exec('redis-cli -n 5', { silent: true });

            expect(result.code).to.be.equal(0);
        });

        it('Should wait for some time to clear mm and pvp room', done => setTimeout(done, 10000));

        it('Many of pvp redis keys should be gone', done => {
            let callbackFn = (err, response) => {
                expect(err).to.be.a('null');
                expect(response.filter(e => !e.startsWith('metrics')).length).to.be.equal(10);

                done();
            };

            opClients.getGameplayRoomClient().getRedis().keys('*', callbackFn);
        });
    });

    describe('The stuff', () => {
        it('Should undo some stuff', () => {
            goblinBase.matchmakingConfig.strategy = cachedMatchmakingStrategy;
        });
    });
});
describe('After stuff', () => {
    it('Should revert default cloud functions', done => {
        goblinBase
            .requireAsCloudFunction('../defaultCloudFunctions/pvpAutoCloseHandler.js')
            .requireAsCloudFunction('../defaultCloudFunctions/pvpCheckGameOver.js')
            .requireAsCloudFunction('../defaultCloudFunctions/pvpConnectionHandler.js')
            .requireAsCloudFunction('../defaultCloudFunctions/pvpDisconnectionHandler.js')
            .requireAsCloudFunction('../defaultCloudFunctions/pvpGameOverHandler.js')
            .requireAsCloudFunction('../defaultCloudFunctions/pvpGeneratePayload.js')
            .requireAsCloudFunction('../defaultCloudFunctions/pvpInitGameplayModel.js')
            .requireAsCloudFunction('../defaultCloudFunctions/pvpTurnHandler.js')
            ._reinitCloudFunctions(done);
    });
    it('Should clean utils cache', () => {
        testUtils.clearCache();
    });
    it('Should do clean', done => {
        async.parallel([
            cb => testUtils.removeAllDocuments(cb),
            cb => opClients.getSessionsClient().getRedis().flushall(cb)
        ], done);
    });
});