var theEnd = ((args.theModel.model.plrAsq === 14 && args.isA) || (args.theModel.model.plrBsq === 14 && !args.isA));
if(args.isA){
    args.theModel.model.plrAsq++;
    args.theModel.model.lastUpd = now;
    args.theMessage.pvpTurn = 'alpha';
} else {
    args.theModel.model.plrBsq++;
    args.theModel.model.lastUpd = now;
    args.theMessage.pvpTurn = 'beta';
}
if(theEnd){
    let finalMessage = {
        gameIsOver: true,
        finalm: { m: args.theMessage, asq: args.theModel.model.plrAsq, bsq: args.theModel.model.plrBsq }
    };
    PvpMessageHandler(args.theModel, finalMessage);
} else {
    PvpMessageHandler(args.theModel, { sq: args.theModel.model.plrAsq, m: args.theMessage });
}