const express = require('express');
const mongoose = require('mongoose');
const methodOverride = require('method-override');

const Item = require('../models/Item');
const User = require('../models/User');
const Finish = require('../models/Finish');

const { ensureAuth } = require('../middleware/auth');

const router = express.Router();


// Method Override
router.use(methodOverride(function (req, res) {

    if (req.body && typeof req.body === 'object' && '_method' in req.body) {
        // look in urlencoded POST bodies and delete it
        let method = req.body._method;
        delete req.body._method;
        return method;
    }

}));



const checkForFinish = function (req, res, next) {
    async function checkForFinishFn (next) {
        try {

            const allItems = await Item.find({}).lean();

            for (let item of allItems) {

                for (let current of item.finishes) {

                    let isNone;
                    let currFinish;
                
                    try {
        
                        finish = await Finish.findById(mongoose.Types.ObjectId(current.id));
        
                    } catch (err) {
                        console.error(err);
                        isNone = true;
                    }        
                                
                    if (isNone == true || finish == null) {
                        
                        let missingExists = item.finishes.map(curFin => {
                            return curFin.id == current.id;
                        });

        
                        if (missingExists.includes(true)) {
        
                            try {

                                const newFinishes = item.finishes.filter(cur => cur.id != current.id);
        
                                await Item.updateOne({ _id: item._id }, { $set: { finishes: newFinishes } });
                                
                            } catch (err) {

                                console.error(err);
                                res.render('error/500');
                            }
        
                            isNull = true;
                        };
                    };
            
                };
            };

            next();
            
        } catch (error) {

            console.error(error);
            next();
            
        }
    }

    checkForFinishFn(next);
}





// ROUTES


router.get('/', checkForFinish, async (req, res) => {

    if (req.user) {
        try {
            const user = await User.findOne({ _id: req.user._id }).lean();
            

            itemsList = await Item.find({ status: 'public' }).lean();
            
            const items = await Promise.all(itemsList.map(async current => {
    
                // currentItem.qty = current.qty;

                for (let curItem of user.cartItems) {
                    
                    if (curItem.id == current._id.toString()){
                        current.exists = true;
                    }        
                }

                return current;
            }));

            
            res.render('items/items', { layout: 'checkout', items: items, msg: req.flash('msg'), err: req.flash('err') });

    
    
        } catch (err) {
            console.error(err);
            res.render('error/500');
        }
    } else {

        try {
            const items = await Item.find({ status: 'public' }).lean();

            res.render('items/items', { layout: 'checkout', items, msg: req.flash('msg'), err: req.flash('err') });
    
        } catch (err) {
            console.error(err);
            res.render('error/500');
        }

    }
});



router.get('/carrito', checkForFinish, ensureAuth, async (req, res) => {
    let user;

    try {
        user = await User.findOne({ _id: req.user._id }).lean();

        Promise.all(user.cartItems.map(async current => {

            let isNone;
            let currItem;

            let item;

            try {

                item = await Item.findById(mongoose.Types.ObjectId(current.id));

            } catch (err) {
                console.error();
                isNone = true;
            }

                        
            if (item === null) {
                
                let missingExists = user.cartItems.map(curItem => {
                    return curItem.id == current.id;
                });

                if (missingExists.includes(true)) {
                    

                    try {

                        await User.updateOne({ _id: req.user._id }, { $pull: { cartItems: { id: current.id } } });
                        
                    } catch (err) {
                        console.error(err);
                        res.render('error/500');
                    }

                    isNull = true;


                } else {

                    try {

                        currentItem = await Item.findById(mongoose.Types.ObjectId(current.id)).lean();

                        currentItem.qty = current.info.qty;
                        currentItem.currentFinish = current.info.finish;
            
                        currItem = currentItem;
                        
                    } catch (err) {
                        console.error(err);
                        res.render('error/500');
                    }
                }

            } else {

                try {

                    currentItem = await Item.findById(mongoose.Types.ObjectId(current.id)).lean();

                    currentItem.qty = current.info.qty;
                    currentItem.currentFinish = current.info.finish;
        
                    currItem = currentItem;

                    
                } catch (err) {
                    console.error(err);
                    res.render('error/500');
                }

            }
    
    
            if (isNone) {
                return null;
            } else if (currItem) {
                return currItem;
            } else {
                return null
            }
    
    
        })).then(itemsUnfiltered => {
        
            const items = itemsUnfiltered.filter(item => {
                return item != null;
            });
    
            let total = 0;
    
            for (let item of items) {
                total += item.price * item.qty;
            }

            
            res.render('items/cart', { layout: 'checkout', items: items, total: total, user: user });
    
    
        }).catch(err => {
    
            console.error(err);
            res.render('error/500');
    
        });
    


    } catch(err) {
        console.error(err);
        return res.render('error/500');
    };
});


router.post('/carrito/:id', ensureAuth, async (req, res) => {
    
    try {

        const user = await User.findById(req.user._id).lean();

        await Item.exists({ _id: mongoose.Types.ObjectId(req.params.id) }, async (err, result) => { 
            if (err) {
                console.log(err);
                
                req.flash('err', 'Perdon, hubo un error en el servidor');

                res.redirect('/articulos');
            } else {
                 
                if (result === false) {
                    
                    let missingExists = user.cartItems.map(current => {
                        return current.id == req.params.id;
                    });

                    if (missingExists.includes(true)) {

                        await User.updateOne({ _id: req.user._id }, { $pull: { cartItems: { id: req.params.id } } });

                        return res.redirect('/articulos');
                    }

                } else {

                    const item = await Item.findById(req.params.id).lean();

                    let isExisting = user.cartItems.map(current => {
                        return current.id == item._id.toString();
                    });
            
            
                    if (isExisting.includes(true)) {
            
                        res.redirect(`/articulos`);
            
                    } else {
                        
                        const newCartItem = { id: item._id.toString(), info: { finish: 'original', qty: 1 } };
            
                        await User.updateOne({ _id: user._id }, { $push: { cartItems: newCartItem } });
            
                        
                        const items = await Item.find({ status: 'public' }).lean();

                        req.flash('msg', 'Añadido al carrito');

                        res.redirect('/articulos')

                    }
                    
                }

            } 
        }); 

    } catch (err) {

        console.error(err);
        res.render('error/404');
    }

});




router.delete('/carrito/:id', ensureAuth, async (req, res) => {
    
    try {

        const user = await User.findById(req.user._id).lean();

        await Item.exists({ _id: mongoose.Types.ObjectId(req.params.id) }, async (err, result) => { 
            if (err) {
                console.log(err);
                return res.render('error/500');
            } else { 
                 
                if (result === false) {
                    
                    let missingExists = user.cartItems.map(current => {
                        return current.id == req.params.id;
                    });

                    if (missingExists.includes(true)) {

                        await User.updateOne({ _id: req.user._id }, { $pull: { cartItems: { id: req.params.id } } });

                        return res.redirect('/articulos/carrito');
                    }

                } else {

                    const item = await Item.findById(mongoose.Types.ObjectId(req.params.id)).lean();

                    let isExisting = user.cartItems.map(current => {
                        return current.id == item._id.toString();
                    });
            
            
                    if (isExisting.includes(true)) {
            
                        await User.updateOne({ _id: user._id }, { $pull: { cartItems: { id: item._id.toString() } } });
            
                        res.redirect(`/articulos/carrito`);
            
                    } else {
            
                        res.render('error/404');
            
                    }

                }

            } 
        }); 



    } catch (err) {

        console.error(err);
        res.render('error/500');
    }

});





router.put('/carrito/:id', ensureAuth, async (req, res) => {
    
    try {

        const user = await User.findById(req.user._id).lean();

        await Item.exists({ _id: mongoose.Types.ObjectId(req.params.id) }, async (err, result) => { 
            if (err) {
                console.log(err);
                return res.render('error/500');
            } else { 
                 
                if (result === false) {
                    
                    let missingExists = user.cartItems.map(current => {
                        return current.id == req.params.id;
                    });

                    if (missingExists.includes(true)) {

                        await User.updateOne({ _id: req.user._id }, { $pull: { cartItems: { id: req.params.id } } });

                        return res.redirect('/articulos/carrito');
                    }

                } else {

                    const item = await Item.findById(req.params.id).lean();

                    let isExisting = user.cartItems.map(current => {
                        return current.id == item._id.toString();
                    });
            
                    if (isExisting.includes(true)) {
            
                        const currentItem = user.cartItems.find(current => current.id == item._id.toString());
            
                        const quantity = req.body.itemQty;
                        const finish = req.body.finish;

                        if (quantity && finish) {

                            await User.findOneAndUpdate({ _id: user._id, "cartItems.id": req.params.id }, { $set: { "cartItems.$.info.qty": quantity } });
                            await User.findOneAndUpdate({ _id: user._id, "cartItems.id": req.params.id }, { $set: { "cartItems.$.info.finish": finish } });
                
                            res.redirect(`/articulos/carrito`);    

                        } else {
                            res.render('error/404');
                        }
            
            
                    } else {
                        res.render('error/404');
                    }

                }

            } 
        }); 



    } catch (err) {

        console.error(err);
        res.render('error/404');
    }

});


module.exports = router;