if(args && args.battleModel){
    if(args.battleModel.currentTurn === args.battleModel.turnsToFinish){
        PveFinalizeResponse();
    } else {
        throw new Error('Not good!');
    }
} else {
    appendSelfBattleJournalPve({ trip: 'exploration' });
    PveFinalizeResponse();
}