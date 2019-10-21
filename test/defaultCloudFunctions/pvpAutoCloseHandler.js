appendBattleJournalPvp({ hello: 'world', lagA: args.lagA, lagB: args.lagB, theModelIsNull: args.theModel == null }, true, !!args.opponentIsBot);
var msg = { lagA: args.lagA, lagB: args.lagB, hidA: args.playerA, hidB: args.playerB };
PvpAutoDefeatResponse(msg, msg);