'use strict';

module.exports = {
    linkCollectionFuncsWithModule
};

function linkCollectionFuncsWithModule(theModule, theCollection){
    theModule.exports.insertOne = theCollection.insertOne.bind(theCollection);
    theModule.exports.insertMany = theCollection.insertMany.bind(theCollection);
    theModule.exports.updateOne = theCollection.updateOne.bind(theCollection);
    theModule.exports.updateMany = theCollection.updateMany.bind(theCollection);
    theModule.exports.findOneAndUpdate = theCollection.findOneAndUpdate.bind(theCollection);
    theModule.exports.findOneAndDelete = theCollection.findOneAndDelete.bind(theCollection);
    theModule.exports.deleteOne = theCollection.deleteOne.bind(theCollection);
    theModule.exports.deleteMany = theCollection.deleteMany.bind(theCollection);
    theModule.exports.bulkWrite = theCollection.bulkWrite.bind(theCollection);
    theModule.exports.find = theCollection.find.bind(theCollection);
    theModule.exports.findOne = theCollection.findOne.bind(theCollection);
    theModule.exports.countDocuments = theCollection.countDocuments.bind(theCollection);
}