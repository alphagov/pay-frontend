var views = {
    NOT_FOUND: {
        code: 404,
        view: 'error',
        locals: {
            message: "Page cannot be found"
        },
    },
    ERROR: {
        code: 500,
        view: 'error',
        locals: {
            message: 'There is a problem with the payments platform'
        }
    },
    display: function(res,state,locals){

        if (!this[state]) {
            logger.error("VIEW " + state + " NOT FOUND");
            locals = { message: "View " + state + " not found" };
            state = "ERROR";
        }
        locals = (this[state].locals) ? _.merge(this[state].locals,locals) : locals;
        locals = (locals == undefined) ? {} : locals;
        status = (this[state].code) ? this[state].code : 200;
        locals.viewName = this[state].view;

        res.status(status);
        if (typeof this[state].view == "function") {
            this[state].view(res,locals)
        } else {
            res.render(this[state].view,locals);
        }
    }
}
