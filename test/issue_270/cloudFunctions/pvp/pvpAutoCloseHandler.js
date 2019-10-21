if(await checkIsBot(args.playerB)){
    appendBattleJournalPvp({ looo: 'sers', lagA: args.lagA }, true, true);

    await lock.some(args.playerA);

    var loosesA = await getSomeProfileNode(args.playerA, 'profileData.looses');
    setSomeProfileNode(args.playerA, 'profileData.looses', (loosesA || 0) + 1);
} else {
    appendBattleJournalPvp({ looo: 'sers', lagA: args.lagA, lagB: args.lagB }, true);

    await lock.some([args.playerA, args.playerB]);

    var loosesA = await getSomeProfileNode(args.playerA, 'profileData.looses'),
        loosesB = await getSomeProfileNode(args.playerB, 'profileData.looses');

    setSomeProfileNode(args.playerA, 'profileData.looses', (loosesA || 0) + 1);
    setSomeProfileNode(args.playerB, 'profileData.looses', (loosesB || 0) + 1);
}
PvpAutoDefeatResponse({ loooser: 'a' }, { loooser: 'b' });