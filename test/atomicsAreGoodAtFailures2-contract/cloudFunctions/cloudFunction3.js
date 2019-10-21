await lock.some([2, 3]);

var node2 = await getSomeProfileNode(2, 'profileData.complete.asylum'),
    node3 = await getSomeProfileNode(3, 'profileData.summit.fat');

setSomeProfileNode(2, 'profileData.complete.asylum', (node2 || 0) + 1);
setSomeProfileNode(3, 'profileData.summit.fat', (node3 || 0) + 1);

FunctionResponse({ okay: true });