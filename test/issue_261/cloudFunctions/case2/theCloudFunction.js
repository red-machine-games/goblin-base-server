await lock.self();
var profileData = await getProfileNode('profileData');

var response;
try {
    response = profileData.heroes[0].deck.UnitCards.concat(profileData.heroes[0].deck.SpellCards);
} catch (e) {
    response = e.message;
}
FunctionResponse({ response });