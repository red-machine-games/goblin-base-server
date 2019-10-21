await lock.self();

var opp1 = await matchmaking.getPlayerByLadder('segma', [{ from: 2, to: '+inf' }], 1, 0);
var opp2 = await matchmaking.getPlayerByLadder('segma', [{ from: 2, to: '-inf' }], 1, 0);

FunctionResponse({ hid1: opp1.humanId, hid2: opp2.humanId });