var search = await matchmaking.searchPvpOpponent('segma', [{ from: 0, to: '+inf' }], 1);
if(search.c !== 1 || search.stat !== 'MM: accept or decline the game'){
    FunctionResponse({ ts: _.now() - now });
} else {
    throw new Error('Whoops');
}