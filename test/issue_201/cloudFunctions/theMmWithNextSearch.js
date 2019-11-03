const timeout = ms => new Promise(res => setTimeout(res, ms));

var searching = await matchmaking.searchPvpOpponent('segma', [{ from: 1, to: '+inf' }], 1);
if(searching.c !== 0 || searching.stat !== 'MM: searching'){
    throw new Error('WHOOPS 1');
}

var checkPvp1 = await matchmaking.checkPvpNoSearch();
if(checkPvp1.c !== 0 || checkPvp1.stat !== 'MM: searching'){
    throw new Error('WHOOPS 2');
}

await timeout(+clientParams.timeout);

var checkPvp2 = await matchmaking.checkPvpNoSearch();
if(checkPvp2.c !== -1 || checkPvp2.stat !== 'MM: neither in queue nor in battle'){
    throw new Error('WHOOPS 3');
}

var searching2 = await matchmaking.searchPvpOpponent('segma', [{ from: 1, to: '+inf' }], 1);
if(searching2.c !== 0 || searching2.stat !== 'MM: searching'){
    throw new Error('WHOOPS 4');
}

FunctionResponse({ searching, checkPvp1, checkPvp2, searching2 });