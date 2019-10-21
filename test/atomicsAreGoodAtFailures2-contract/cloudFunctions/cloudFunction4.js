await lock.some(2);

var theNodeOf2 = await getSomeProfileNode(2, 'profileData.complete.asylum');

FunctionResponse({ theNodeOf2 });