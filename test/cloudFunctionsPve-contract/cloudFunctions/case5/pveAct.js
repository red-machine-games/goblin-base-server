if(!args){
    return PveActResponse(null, null, { save: { visual: 'investment' } }).asError();
}
if(args.battleModel){
    if(args.battleModel.magicWord === 'win'){
        return PveActResponse(true);
    }
    if(args.battleModel.continuous !== 'repetition'){
        return PveActResponse(null, null, { save: { visual: 'investment' } }).asError();
    }
    if(++args.battleModel.currentTurn === args.battleModel.turnsToFinish){
        return PveActResponse(true, null, { over: true });
    } else {
        return PveActResponse(false, args.battleModel, { okay: true });
    }
} else {
    return PveActResponse(false, args.battleModel, { okay: true });
}