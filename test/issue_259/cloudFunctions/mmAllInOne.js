var search = await matchmaking.searchPvpOpponent('segma', [{ from: 1, to: '+inf' }], 1);
if(search.c !== 1 || search.stat !== 'MM: accept or decline the game'){
    throw new Error('WHOOPS 1');
}

var accepting = await matchmaking.acceptPvpMatch();
var gameroomData;
if(accepting.c === 2 && accepting.stat === 'MM: waiting for opponent to accept the game'){
    gameroomData = await matchmaking.waitForPvpOpponentToAccept();
} else if(accepting.c === 3 && accepting.stat === 'MM: gameroom allocated'){
    gameroomData = accepting;
} else {
    throw new Error('WHOOPS 2');
}

FunctionResponse({ address: gameroomData.address, key: gameroomData.key });