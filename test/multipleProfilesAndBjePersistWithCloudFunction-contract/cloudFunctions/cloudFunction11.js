await lock.some([1, 2, 3]);

var node1 = await getSomeProfileNode(1, 'profileData.hello.world');

setSomeProfileNode(1, 'profileData.hello.world', 'win 1');
setSomeProfileNode(2, 'profileData.hello.world', 'win 2');

var node2 = await getSomeProfileNode(2, 'profileData.hello.world');

setSomeonesRating(1, 'hello', 100);
setSomeonesRating(2, 'hello', 200);
setSomeonesRating(3, 'world', 300);

appendBattleJournalPve(1, { incapable: 'fever' });
appendBattleJournalPve(2, { halt: 'pray' });

FunctionResponse({ node1, node2 });