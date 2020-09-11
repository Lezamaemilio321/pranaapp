const express = require('express');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');


//Env variables
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripePublicKey = process.env.STRIPE_PUBLIC_KEY;

const stripe = require('stripe')(stripeSecretKey);


const router = express.Router();

const { ensureAuth, ensureGuest } = require('../middleware/auth');
const User = require('../models/User');
const Item = require('../models/Item');
const SessionId = require('../models/SessionId');
const { rawListeners } = require('../models/User');


// ROUTES



router.get('/', async (req, res) => {

    if (req.user) {

        try {

            const user = await User.findById(mongoose.Types.ObjectId(req.user._id)).lean();
    
            if (user.isAdmin) {
        
                if (user.isAdmin === process.env.ADMIN_CODE) {
                    return res.redirect('/articulos/admin');
                } else {
                    res.redirect('/articulos');
                }
        
            } else {
                res.redirect('/articulos');
            }  
        
            
        } catch (error) {
            res.redirect('/articulos');
        }    

    } else {
        res.redirect('/articulos');
    }

});


router.get('/nosotros', (req, res) => {

    res.render('home');

});



router.get('/login', ensureGuest, (req, res) => {
    res.render('login');
});



router.get('/success', (req, res) => {

    if (req.query.session_id) {
        stripe.checkout.sessions.retrieve(req.query.session_id, async (err, session) => {
            
            if (err) {
                return res.render('error/404');
            }

            try {
                
                const session_id = await SessionId.findOne({ id: session.id }).lean();
                
                if (session_id) {
                    return res.render('error/404')
                } else {

                    if (session.metadata.isSingle === 'true' && session.metadata.itemId && session.metadata.itemQty) {

                        try {
                            
                            let item = await Item.findById(mongoose.Types.ObjectId(session.metadata.itemId)).lean();

                            

                            const outcome = item.inStock - session.metadata.itemQty;

                            if (outcome <= 0) {
                                
                                if (item.image != "/images/default/default.png") {

                                    const imgPath = path.join(__dirname, `../public${item.image}`)

                                    fs.unlinkSync(imgPath, (err) => {
                                        if (err) {
                                            console.error(err);
                                        }
                                    });

                                }


                                await Item.deleteOne({ _id: item._id });

                                
                            } else {

                                await Item.findOne({ _id: item._id }, function(err, itemData) {

                                    if (err) {
                                        console.error(err);
                                    }

                                    if (itemData) {

                                        itemData.inStock = outcome;
                                        itemData.save((error) => {
                                            if (error) {
                                                console.error(error);
                                            }
                                        })

                                    } else {
                                        console.error(err)
                                    }

                                });

                            }


                            await SessionId.create({ id: session.id });

                            const transporter = nodemailer.createTransport({
                                service: 'gmail',
                                auth: {
                                    user: 'bruh17465@gmail.com',
                                    pass: 'EMILIO2005'
                                }
                            });
        
                            const mailOptions = {
                                from: 'bruh17465@gmail.com',
                                to: 'lezamaemilio000@gmail.com',
                                subject: 'Nueva Orden',
                                text: `Nombre: ${item.name}, Cantidad: ${session.metadata.itemQty}`
                            };
        
                            transporter.sendMail(mailOptions, function(err, info){
                                if (err) {
                                    console.error(err);
                                } else {
                                    console.log('Email sent: ' + info.response);
                                }
                            });


                            const items = [{ name: item.name, qty: session.metadata.itemQty }]

                            res.render('checkout', { items });

                        } catch (err) {
                            console.error(err);
                            res.render('error/500');
                        }

                    } else if (session.metadata.isSingle === 'false' && req.user) {

                        try {
                            
                            let user = await User.findById(req.user._id).lean();

                            const finishesArrayObj = JSON.parse(session.metadata.finishesArray);

                            
                            for (let currentItem of user.cartItems) {

                                const item = await Item.findById(mongoose.Types.ObjectId(currentItem.id)).lean();

                                let finishInfo = finishesArrayObj.find(el => el.id == item._id);

                                if (finishInfo) {

                                    const outcome = item.inStock - finishInfo.qty;

                                    if (outcome <= 0) {
                                        
                                        if (item.image != "/images/default/default.png") {

                                            const imgPath = path.join(__dirname, `../public${item.image}`)
            
                                            fs.unlinkSync(imgPath, (err) => {
                                                if (err) {
                                                    console.error(err);
                                                }
                                            });
            
                                        }
        
                                        await Item.deleteOne({ _id: currentItem.id });        

                                    } else {

                                        await Item.findOne({ _id: item._id }, function(err, itemData) {

                                            if (err) {
                                                console.error(err);
                                            }

                                            if (itemData) {

                                                itemData.inStock = outcome;
                                                itemData.save((error) => {
                                                    if (error) {
                                                        console.error(error);
                                                    }
                                                })

                                            } else {
                                                console.error(err)
                                            }

                                        });

                                    }
    

                                }


                            }


                            await User.updateOne({ _id: user._id }, { $set: { cartItems: [] }});

                            await SessionId.create({ id: session.id });

                            

                            const itemInfo = finishesArrayObj.map((el, index) => {
                                return {
                                    name: `${el.name} [${index}]`,
                                    qty: `${el.qty} [${index}]`
                                }
                            });

                            const names = itemInfo.map(el => el.name);
                            const quantities = itemInfo.map(el => el.qty);

                            const transporter = nodemailer.createTransport({
                                service: 'gmail',
                                auth: {
                                    user: 'bruh17465@gmail.com',
                                    pass: 'EMILIO2005'
                                }
                            });
        
                            const mailOptions = {
                                from: 'bruh17465@gmail.com',
                                to: 'lezamaemilio000@gmail.com',
                                subject: 'Nueva Orden (multiple)',
                                text: `Nombres: ${names}, Cantidades: ${quantities}`
                            };
        
                            transporter.sendMail(mailOptions, function(err, info){
                                if (err) {
                                    console.error(err);
                                } else {
                                    console.log('Email sent: ' + info.response);
                                }
                            });


                            const items = finishesArrayObj.map(el => {
                                return {
                                    name: el.name,
                                    qty: el.qty
                                }
                            });

                            res.render('checkout', { items });


                        } catch (err) {
                            console.error(err);
                            res.render('error/500');
                        }


                    }

                }

            } catch (err) {
                console.error(err);
                res.render('error/404')
            }
            
        });
    } else {
        res.render('error/404');
    }
    
});



router.get('/cancel', (req, res) => {
    res.redirect('/articulos');
});



router.post('/purchase', async (req, res) => {


    if (req.body.item_id && req.body.item_info) {

        try {

            async function createSession() {
    
                const productItem = await Item.findById(mongoose.Types.ObjectId(req.body.item_id)).lean();

                if (req.body.item_info.finish && req.body.item_info.qty) {

                    if (req.body.item_info.qty <= 0) {
                        return res.status(500).end();
                    }

                    if (req.body.item_info.qty > productItem.inStock) {
                        return res.status(500).end();
                    }

                    let finishExists;

                    if (productItem.finishes.length == 0) {
                        finishExists = [true];
                    } else {
                        finishExists = productItem.finishes.map(el => {

                            if (req.body.item_info.finish === 'original') {
                                return true;
                            } else {
                                return req.body.item_info.finish == el.name;
                            }
                        });
                    }
    
                    if (finishExists.includes(true)) {
    
                        let productPrice;
                        let productName;
        
                        if (req.body.item_info.finish == 'original') {
                            productPrice = productItem.price;
                            productName = productItem.name;
                        } else if (req.body.item_info.finish != 'original' && productItem.isExtra == true) {
        
                            productPrice = productItem.price + (productItem.price * 0.20);
                            productName = `${productItem.name} ( ${req.body.item_info.finish} +20% )`
        
                        } else if (req.body.item_info.finish != 'original' && productItem.isExtra == false) {
        
                            productPrice = productItem.price;
                            productName = `${productItem.name} ( ${req.body.item_info.finish} )`
        
                        }
        
                        const newPriceRounded = Math.round(productPrice * 100)
        
                
                        const product = {
            
                            price_data: {
                                currency: 'mxn',
                                product_data: {
                                    name: productName
                                },
                                unit_amount: newPriceRounded,
                            },
                            quantity: req.body.item_info.qty
                        };
        
                        try {
                
                            async function getSession() {
                
                                const session = await stripe.checkout.sessions.create({
                                    payment_method_types: ['card'],
                                    line_items: [
                                        product
                                    ],
                                    mode: 'payment',
                                    success_url: 'https://pranadeco.com/success?session_id={CHECKOUT_SESSION_ID}',
                                    cancel_url: 'https://pranadeco.com/cancel',
                                    shipping_address_collection: {
                                        allowed_countries: ['MX'],
                                    },
                                    metadata: {
                                        isSingle: true,
                                        itemId: productItem._id.toString(),
                                        itemQty: req.body.item_info.qty
                                    }
                                    });
                    
                                    res.json({session_id: session.id});
                    
                            }
                
                            getSession();
                
                
                        } catch(err){
                            console.log(err);
                            res.status(500).end();
                        }
                
                        
                    } else {
                        res.status(404).end();
                    }
    

                } else {
                    res.status(404).end();
                }
        
            }
        
            createSession();    


        } catch (err) {
            console.error(err);
            res.status(404).end();
        }

    } else if (req.body.cartArray) {

        if (!req.user) {
            return res.status(403).end();
        }

        try {

            const user = await User.findById(req.user._id);
    
            async function createSession() {
        
                const productItems = await Promise.all(user.cartItems.map(async el => {
        
                    const dbProduct = await Item.findById(mongoose.Types.ObjectId(el.id)).lean();

                    const currentCartItem = req.body.cartArray.find(item => item.id == dbProduct._id);
                        
                    if (currentCartItem && currentCartItem.finish && currentCartItem.qty) {

                        if (currentCartItem.qty <= 0) {
                            return 'Error';
                        }
    
                        if (currentCartItem.qty > dbProduct.inStock) {
                            return 'Error';
                        }

                        let finishExists;

                        if (dbProduct.finishes.length == 0) {
                            finishExists = [true];
                        } else {
                            finishExists = dbProduct.finishes.map(el => {
    
                                if (req.body.item_info.finish === 'original') {
                                    return true;
                                } else {
                                    return req.body.item_info.finish == el.name;
                                }
                            });
                        }
        
                        if (finishExists.includes(true)) {
                
                            if (currentCartItem) {

                                if (currentCartItem.qty <= 0) {

                                    return 'Error';

                                }
            
                                let productPrice;
                                let productName;
                
                                if (currentCartItem.finish == 'original') {
                                    productPrice = dbProduct.price;
                                    productName = dbProduct.name;
                                } else if (currentCartItem.finish != 'original' && dbProduct.isExtra == true) {
                
                                    productPrice = dbProduct.price + (dbProduct.price * 0.20);
                                    productName = `${dbProduct.name} ( ${currentCartItem.finish} +20%)`
                
                                } else if (currentCartItem.finish != 'original' && dbProduct.isExtra == false) {
                
                                    productPrice = dbProduct.price;
                                    productName = `${dbProduct.name} ( ${currentCartItem.finish} )`
                
                                }

                                const newPriceRounded = Math.round(productPrice * 100)

                                const product = {
                    
                                    price_data: {
                                        currency: 'mxn',
                                        product_data: {
                                            name: productName
                                        },
                                        unit_amount: newPriceRounded,
                                    },
                                    quantity: currentCartItem.qty
                                }

                                return product;
                                
                            }
                        } else {
                            return 'Error';
                        }
                    } else {
                        return 'Error';
                    }
        
                }));

                if (productItems.includes('Error')) {
                    return res.status(500).end();
                }
                
                const itemFinishesUnFiltered = await Promise.all(user.cartItems.map(async item => {
                    
                    let itemFinal = {};
    
                    const reqCartItem = req.body.cartArray.find(el => el.id == item.id);
    
                    if (reqCartItem) {

                        const dbItem = await Item.findById(mongoose.Types.ObjectId(reqCartItem.id)).lean();

                        itemFinal = {
                            id: item.id,
                            name: dbItem.name,
                            finish: reqCartItem.finish,
                            qty: reqCartItem.qty
                        }


                        return itemFinal;
                    } else {
                        return null;
                    }
                    
                }));
    
                const itemFinishes = itemFinishesUnFiltered.filter(item => item != null);
    
                try {
        
                    async function getSession() {
    
                        const session = await stripe.checkout.sessions.create({
                            payment_method_types: ['card'],
                            line_items: productItems,
                            mode: 'payment',
                            success_url: 'https://pranadeco.com/success?session_id={CHECKOUT_SESSION_ID}',
                            cancel_url: 'https://pranadeco.com/cancel',
                            shipping_address_collection: {
                                allowed_countries: ['MX'],
                            },
                            metadata: {
                                isSingle: false,
                                finishesArray: JSON.stringify(itemFinishes)
                            }
                        });

        
                        res.json({session_id: session.id});
        
                    }
        
                    getSession();
        
        
                } catch (error){
                    res.status(500).end();
                    console.log(error);
                }
        
        
            }
        
            createSession();
            
        } catch (err) {
            console.error(err);
            res.status(404).end();
        }
    }

});


module.exports = router;