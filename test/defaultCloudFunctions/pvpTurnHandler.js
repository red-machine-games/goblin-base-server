if(args.isA){
    args.theModel.model.plrAsq++;
    args.theModel.model.lastUpd = now;
} else {
    args.theModel.model.plrBsq++;
    args.theModel.model.lastUpd = now;
}

var aMessageForA, aMessageForB;

if(args.theModel.model.plrAsq === 15 || args.theModel.model.plrBsq === 15){
    aMessageForA = aMessageForB = { m: args.theMessage, asq: args.theModel.model.plrAsq, bsq: args.theModel.model.plrBsq }
} else {
    aMessageForA = args.isA ? undefined : args.theMessage;
    aMessageForB = args.isA ? args.theMessage : undefined;
}

PvpMessageHandler(args.theModel, aMessageForA, aMessageForB);