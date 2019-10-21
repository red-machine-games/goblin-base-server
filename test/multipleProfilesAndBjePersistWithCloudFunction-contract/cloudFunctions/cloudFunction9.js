await lock.some([1, 2, 3]);

var node1 = await getSomeProfileNode(1, 'profileData.hello.world'),
    node2 = await getSomeProfileNode(2, 'profileData.hello.world'),
    node3 = await getSomeProfileNode(3, 'profileData.hello.world');

FunctionResponse({ node1, node2, node3 });