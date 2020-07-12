// check is the string is empty
const isEmpty = (string) => {
    // trim para tirar os espaços
    if(string.trim() === '') return true
    else return false;
}

// validate email
const isEmail = (email) => {
    // regular expression for a email
    const emailRegEx = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

    if(email.match(emailRegEx)) return true
    else return false
}


exports.validateSignupData = (data) => {
    console.log(data)
    // check erros...
    let errors = {}

    if(isEmpty(data.email)){
        errors(data.email) = "Must not be empty"
    } else if (!isEmail(data.email)){
        errors(data.email) = 'Must be a valid email address'
    }

    if(isEmpty(data.password)) errors.password = "Must not be empty"
    if(data.password !== data.confirmPassword) errors.confirmPassword = "Password must match"
    if(isEmpty(data.handle)) errors.handle = "Must not be empty"

    return {
        errors,
        valid: Object.keys(errors).length === 0 ? true : false
    }
}


exports.validateLoginData = (data) => {
    let errors = {};

    if(isEmpty(data.email)) erros.email = "Must not be empty"
    if(isEmpty(data.password)) erros.password = "Must not be empty"

    return {
        errors,
        valid: Object.keys(errors).length === 0 ? true : false
    }
}



