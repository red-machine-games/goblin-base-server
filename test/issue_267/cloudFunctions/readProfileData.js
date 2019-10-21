await lock.self();

var soTheFirst = await getSomeProfileNode(1, 'profileData.battles'),
    terrify = await getSomeProfileNode(1, 'profileData.looses');

FunctionResponse({ soTheFirst, terrify });