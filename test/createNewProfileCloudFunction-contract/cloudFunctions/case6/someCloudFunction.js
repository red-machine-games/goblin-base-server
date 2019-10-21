await lock.self();

if(!_.isNumber(session.strangeCounter)){
    let theCounterNode = await getProfileNode('profileData.strangeCounter');
    session.strangeCounter = session.strangeCounter = theCounterNode;
}
session.strangeCounter++;

FunctionResponse({ theC: session.strangeCounter });