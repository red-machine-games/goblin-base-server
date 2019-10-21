await lock.some([1, 2, 3]);

var node1 = await getSomeProfileNode(1, 'profileData.hello.world'),
    node2 = await getSomeProfileNode(2, 'profileData.hello.world');

setSomeonesRating(2, 'hello', -1);
setSomeonesRating(3, 'world', -1);

setSomeProfileNode(1, 'profileData.hello.world', 'dish')
setSomeProfileNode(3, 'profileData.hello.world', 'neighbour');

var validation = await validateStoreReceipt({ receipt: 'B' });

FunctionResponse({ node1, node2 });