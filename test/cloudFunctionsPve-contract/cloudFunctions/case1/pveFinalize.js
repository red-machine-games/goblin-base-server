if(args && args.battleModel){
    if(args.battleModel.currentTurn === args.battleModel.turnsToFinish){
        appendSelfBattleJournalPve({ iAmThe: 'law' });
        PveFinalizeResponse();
    } else {
        throw new Error('Not good!');
    }
} else {
    appendSelfBattleJournalPve({ trip: 'exploration' });
    PveFinalizeResponse();
}