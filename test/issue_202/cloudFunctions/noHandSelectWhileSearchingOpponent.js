var searching = await matchmaking.searchPvpOpponent('segma', [{ from: 1, to: '+inf' }], 1);
if(searching.c !== 0 || searching.stat !== 'MM: searching'){
    throw new Error('WHOOPS 1');
}
try{
    await matchmaking.handSelectPvpOpponent(2);
} catch(err){
    return FunctionResponse({ searching, err });
}
throw new Error('WHOOPS 2');