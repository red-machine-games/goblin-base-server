await lock.some(2);

try{
    var rec2 = await getSomeonesRating(2, 'deposit');
} catch(err){}

FunctionResponse({ rec2: rec2 || null });