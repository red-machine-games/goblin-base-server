await lock.self();

if(clientParams && clientParams.theRating){
    setSelfRating('segma', parseInt(clientParams.theRating));
}

FunctionResponse(null);