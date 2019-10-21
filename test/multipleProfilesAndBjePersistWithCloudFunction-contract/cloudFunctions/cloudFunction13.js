await lock.some([1, 2, 3]);

var node1 = await getSomeProfileNode(1, 'profileData.hello.world');

setSomeProfileNode(1, 'profileData.hello.world', 'solid');
setSomeProfileNode(2, 'profileData.hello.world', 'ceiling');

var node2 = await getSomeProfileNode(2, 'profileData.hello.world');

setSomeonesRating(1, 'hello', 1000);
setSomeonesRating(2, 'hello', 2000);
setSomeonesRating(3, 'world', 3000);

appendBattleJournalPve(1, { dose: 'proud' });
appendBattleJournalPve(2, { lock: 'oppose' });

var validation = await validateStoreReceipt({ receipt: 'A' });

FunctionResponse({ node1, node2 });