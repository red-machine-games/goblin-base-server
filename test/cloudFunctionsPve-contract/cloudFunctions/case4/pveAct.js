if(args){
    if(!args.battleModel){
        PveActResponse(false);
    } else if(args.battleModel.magicWord === 'win'){
        PveActResponse(true);
    } else {
        PveActResponse(null, null, { youShallNot: 'pass!' }).asError();
    }
} else {
    PveActResponse(null, null, { save: { visual: 'investment' } }).asError();
}