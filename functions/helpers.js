
module.exports = {
    // check is the string is empty
    isEmpty(string) {
        // trim para tirar os espaços
        if(string.trim() === '') return true
        else return false;
    },
    
    // validate email
    isEmail(email) {
        // regular expression for a email
        const emailRegEx = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    
        if(email.match(emailRegEx)) return true
        else return false
    }

}
