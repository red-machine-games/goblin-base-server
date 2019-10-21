if(clientParams.mmDetails && clientParams.mmDetails.whereToSearch){
    let myRating = await getSelfRating(clientParams.segment);

    if(typeof myRating !== 'number'){
        return OnMatchmakingResponse('Don\'t have rating in this segment').asError();
    }

    if(clientParams.mmDetails.whereToSearch === 'forward'){
        OnMatchmakingResponse(
            clientParams.segment, clientParams.strategy,
            { rgs: [{ from: myRating, to: '+inf' }], nran: 1 }
        );
    } else {
        OnMatchmakingResponse(
            clientParams.segment, clientParams.strategy,
            { rgs: [{ from: myRating, to: '-inf' }], nran: 1 }
        );
    }
} else {
    OnMatchmakingResponse('Don\'t understand you!').asError();
}