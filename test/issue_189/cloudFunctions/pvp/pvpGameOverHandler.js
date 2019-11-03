appendBattleJournalPvp({ hello: 'world' });

await lock.some(args.playerA, args.playerB);

var battlesA = await getSomeProfileNode(args.playerA, 'profileData.battles'),
    battlesB = await getSomeProfileNode(args.playerB, 'profileData.battles');

setSomeProfileNode(args.playerA, 'profileData.battles', (battlesA || 0) + 1);
setSomeProfileNode(args.playerB, 'profileData.battles', (battlesB || 0) + 1);

PvpResponse({ country: 'road' });