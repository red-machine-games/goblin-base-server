const TIMEOUT = ms => new Promise(res => setTimeout(res, ms));

var ts = _.now();
var searching = await matchmaking.searchPvpOpponent('segma', [{ from: 1, to: '+inf' }], 1);
if(_.now() - ts < 1000){
    throw new Error('WHOOPS 1');
}
if(searching.c !== 0 || searching.stat !== 'MM: searching'){
    throw new Error('WHOOPS 2');
}

await TIMEOUT(+clientParams.timeout);

var check = await matchmaking.checkPvpNoSearch();
if(check.c !== -1 || check.stat !== 'MM: neither in queue nor in battle'){
    throw new Error('WHOOPS 3');
}

var thePlayer = await matchmaking.getPlayer('segma', [{ from: 1, to: '+inf' }], 1);

var handSelected = await matchmaking.handSelectPvpOpponent(2);
if(handSelected.c !== 1 || handSelected.stat !== 'MM: accept or decline the game'){
    throw new Error('WHOOPS 4');
}

var accepting = await matchmaking.acceptPvpMatch();
var gameroomData;
if(accepting.c === 2 && accepting.stat === 'MM: waiting for opponent to accept the game'){
    gameroomData = await matchmaking.waitForPvpOpponentToAccept();
} else if(accepting.c === 3 && accepting.stat === 'MM: gameroom allocated'){
    gameroomData = accepting;
} else {
    throw new Error('WHOOPS 5');
}

FunctionResponse({ address: gameroomData.address, key: gameroomData.key });