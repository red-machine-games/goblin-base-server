if(glob && glob.theObj){
    FunctionResponse({ theVal: glob.theObj.theVal });
} else {
    FunctionResponse(null);
}