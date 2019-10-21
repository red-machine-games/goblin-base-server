var turnsToFinish = _.random(50, 100),
    theModel = { turnsToFinish, continuous: 'repetition', currentTurn: 0 };

PveInitResponse(theModel, { turnsToFinish })