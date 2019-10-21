await lock.some([1, 2]);

var soTheFirst = await getSomeProfileNode(1, 'profileData.battles'),
    soTheSycound = await getSomeProfileNode(2, 'profileData.battles'),
    terrify = await getSomeProfileNode(1, 'profileData.looses'),
    youth = await getSomeProfileNode(2, 'profileData.looses');

FunctionResponse({ soTheFirst, soTheSycound, terrify, youth });