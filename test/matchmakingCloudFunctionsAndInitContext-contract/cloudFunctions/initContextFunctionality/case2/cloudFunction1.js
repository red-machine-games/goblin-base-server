if(glob.theHackerFunc){
    glob.theHackerFunc();
    FunctionResponse({ okay1: _.isUndefined(global.hello), okay2: _.isUndefined(glob.hello) });
} else {
    FunctionResponse(null);
}