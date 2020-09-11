module.exports = {
    ensureAuth: function(req, res, next) {
        if (req.isAuthenticated()) {
            return next();
        } else {
            res.redirect('/login');
        }
    },
    ensureGuest: function(req, res, next) {
        if (req.isAuthenticated()) {
            res.redirect('/')
        } else {
            return next();
        }
    },
    ensureAdmin: function (req, res, next, user) {

        if (user.isAdmin) {

            if (user.isAdmin === process.env.ADMIN_CODE) {
                return next();
            } else {
                res.redirect('/');
            }

        } else {
            res.redirect('/');
        }    

    }
}