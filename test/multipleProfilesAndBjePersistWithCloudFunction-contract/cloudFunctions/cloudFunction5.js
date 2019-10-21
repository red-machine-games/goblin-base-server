await lock.some([1, 2, 3]);

var rating1 = await getSomeonesRating(1, 'hello'),
    rating2 = await getSomeonesRating(2, 'hello'),
    rating3 = await getSomeonesRating(3, 'hello');

FunctionResponse({ rating1, rating2, rating3 });