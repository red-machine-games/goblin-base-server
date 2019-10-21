await lock.some([1, 2, 3]);

var node1 = await getSomeProfileNode(1, 'profileData.hello.world'),
    node2 = await getSomeProfileNode(2, 'profileData.hello.world');

setSomeProfileNode(1, 'profileData.hello.world', 'examination');
setSomeProfileNode(2, 'profileData.hello.world', 'courtship');

setSomeonesRating(1, 'hello', 0);
setSomeonesRating(2, 'hello', 0);
setSomeonesRating(3, 'world', 0);

appendBattleJournalPve(1, { owner: 'hen' });
appendBattleJournalPve(2, { cigarette: 'prosper' });

appendBattleJournalPve(4, { hypothesis: 'cunning' });

FunctionResponse({ node1, node2 });