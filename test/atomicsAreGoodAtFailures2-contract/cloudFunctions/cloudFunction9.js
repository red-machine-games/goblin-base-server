await lock.some([1, 2, 3]);

try{
    var rec1 = await getSomeonesRating(1, 'world'),
        rec2 = await getSomeonesRating(2, 'world'),
        rec3 = await getSomeonesRating(3, 'world');
} catch(err){}

setSomeonesRating(1, 'world', (rec1 || 0) + 1);
setSomeonesRating(2, 'world', (rec2 || 0) + 1);
setSomeonesRating(3, 'world', (rec3 || 0) + 1);

FunctionResponse({ okay: true });