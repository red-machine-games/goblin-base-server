if(args.isBot){
    PvpResponse({ isPlayerB: true, isBot: true, bpd: { hello: 'world' } });
} else {
    PvpResponse(args.fromObject);
}