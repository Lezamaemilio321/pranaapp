const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const sharp = require('sharp');
const fs = require('fs');
const methodOverride = require('method-override');

const Item = require('../models/Item');
const Finish = require('../models/Finish');
const User = require('../models/User');

const { ensureAuth, ensureAdmin } = require('../middleware/auth');



const router = express.Router();



// Authentification
router.use(ensureAuth);

router.use(function (req, res, next) {

    (async () => {

        try {

            const user = await User.findById(mongoose.Types.ObjectId(req.user._id)).lean();
            ensureAdmin(req, res, next, user);

        } catch (error) {

            console.log(error)
            return res.redirect('/');

        }    

    })();

});



// Set storage engine
const storage = multer.diskStorage({
    destination: './public/images/uploads/',
    filename: function(req, file, callback) {
        callback(null, file.fieldname + '-' + Date.now().toString().replace(/[-T:\.Z]/g, "") + path.extname(file.originalname));
    }
});

const storageFinish = multer.diskStorage({
    destination: './public/images/finishes/',
    filename: function(req, file, callback) {
        callback(null, file.fieldname + '-' + Date.now().toString().replace(/[-T:\.Z]/g, "") + path.extname(file.originalname));
    }
});

// Init Upload
const upload = multer({
    storage: storage,
    fileFilter: function(req, file, callback) {

        //Checking to see if the file is an image
        
        //Allowed extensions
        const fileTypes = /jpeg|jpg|png|gif/;

        //Check extension
        const extname = fileTypes.test(path.extname(file.originalname).toLocaleLowerCase());

        //Check MIME type
        const mimeType = fileTypes.test(file.mimetype);


        if (mimeType && extname) {
            return callback(null, true);
        } else {
            callback('Error, solo imagenes');
        }

    }
});

const uploadFinish = multer({
    storage: storageFinish,
    fileFilter: function(req, file, callback) {
        //Checking to see if the file is an image
        
        //Allowed extensions
        const fileTypes = /jpeg|jpg|png|gif/;

        //Check extension
        const extname = fileTypes.test(path.extname(file.originalname).toLocaleLowerCase());

        //Check MIME type
        const mimeType = fileTypes.test(file.mimetype);



        if (mimeType && extname) {
            return callback(null, true);
        } else {
            callback('Error, solo imagenes');
        }

    }
});





// Method Override
router.use(methodOverride(function (req, res) {

    const isEmpty = obj => {
        return Object.keys(obj).length === 0 && obj.constructor === Object;
    }

    if ((!req.url.split('/').reverse()[1] == '' && !req.url.split('/').reverse()[1] == 'acabados'  && !isEmpty(req.body)) || (req.url.split('/').reverse()[1] == 'acabados' && !isEmpty(req.body))) {

        if (req.body && typeof req.body === 'object' && '_method' in req.body) {
            // look in urlencoded POST bodies and delete it
            let method = req.body._method;
            delete req.body._method;
            return method;
        }    


    } else if (((req.url.split('/').reverse()[1] == '' || req.url.split('/').reverse()[1] == 'acabados' || req.url.split('/').reverse()[0] == 'acabado') && req.method == 'POST') && isEmpty(req.body)) {

        if (req.get('Content-Type').split(';')[0] == 'multipart/form-data') {

            req.isForm = true;

        }

    }



}));

router.use(function (req, res, next) {

    if (req.isForm) {

        req.isForm = null;

        if (req.url.split('/').reverse()[0] == 'acabado' || req.url.split('/').reverse()[1] == 'acabados' || req.url.split('/').reverse()[0] == 'acabados') {

            try {

                uploadFinish.single('image')(req, res, async (err) => {
    
                    if (err) {
    
                        try {
    
                            if (req.url.split('/').reverse()[0] == 'acabados' && req.url.split('/').reverse()[1] == 'agregar') {
    
                                req.flash('error', err);
                                return res.redirect('/articulos/admin/agregar/acabado');
    
                            } else {

                                const finish = await Finish.findById(mongoose.Types.ObjectId(req.session.finishId)).lean();
                                return res.render('items/edit-item', { layout: 'admin', finish: finish, error: err });        
    
                            }    
                            
                        } catch (error) {
    
                            console.log(error);
                            return res.render('error/500', { layout: 'admin' });
                            
                        }
    
                    }
    
                    req.isProcessed = true;
                    next();
            
                });
                
            } catch (error) {
                console.error(error);
                return res.render('error/500', { layout: 'admin' });
            }
    

        } else {

            try {

                upload.single('image')(req, res, async (err) => {
    
    
                    if (err) {
    
                        try {
    
                            if (req.url.split('/')[0] == '' && req.url.split('/')[1] == '') {
    
                                req.flash('itemErr', err);
    
                                return res.redirect('/articulos/admin/agregar');
    
                            } else {


                                if (req.session.itemId) {

                                    const item = await Item.findById(mongoose.Types.ObjectId(req.session.itemId)).lean();
                                    const finishNames = item.finishes.map(el => el.name);
                                    const finishes = await Finish.find({}).lean();

                                    req.session.itemId = null;
                                    
                                    
                                    return res.render('items/edit-item', { layout: 'admin', finishes: finishes, item: item, finishNames: finishNames, error: err });            

                                } else {
                                    return res.render('error/404', { layout: 'admin' });
                                }
                            
    
                            }    
                            
                        } catch (error) {
    
                            console.log(error);
                            return res.render('error/500', { layout: 'admin' });
                            
                        }
    
                    }
    
                    req.isProcessed = true;
                    next();
            
                });
                
            } catch (error) {
                console.error(error);
                return res.render('error/500', { layout: 'admin' });
            }
    
            
        }

    } else {
        next();
    }
});

router.use(function (req, res, next) {

    if (req.isProcessed) {

        req.isProcessed = null;

        methodOverride(function (req, res) {


            if (req.body && typeof req.body === 'object' && '_method' in req.body) {
                // look in urlencoded POST bodies and delete it
                let method = req.body._method;
                delete req.body._method;
                return method;
            }

        })(req, res, next);

    } else {
        next();
    }
});



// ROUTES

router.get('/', async (req, res) => {

    try {

        const items = await Item.find({}).lean();

        res.render('items/admin-items', { layout: 'admin', items: items, msg: req.flash('msg'), err: req.flash('err') });
        
    } catch (error) {
        
    }

});


router.post('/', async (req, res) => {

    
    try {

        requestBody = req.body;

        if (req.file === undefined) {

            requestBody.image = '/images/default/default.png';


            let newItem = requestBody;


            if (requestBody.finishes !== undefined) {
                newFinishes = [];
        
                const allFinishes = await Finish.find({}).lean();

                for (let fin of requestBody.finishes) {
                    let isExisting = allFinishes.map(el => {
                        return fin == el.name;
                    });

                    if (isExisting.includes(true)) {

                        const finish = await Finish.findOne({ name: fin }).lean();

                        const newFinishToPush = { name: fin, image: finish.image, id: finish._id }

                        newFinishes.push(newFinishToPush);
                    }
                }

                newItem.finishes = newFinishes;
            } else {
                newItem.finishes = [];
            }


            try {

                await Item.create(newItem);
                res.redirect('/articulos/admin');

                
            } catch (error) {
                console.error(error);
                res.render('error/500', { layout: 'admin' });
            }

        } else {


            try {

                const image = await sharp(`./public/images/uploads/${req.file.filename}`).resize(500, 500).png().toBuffer();
                fs.writeFileSync(`./public/images/uploads/${req.file.filename}`, image);

                requestBody.image = `/images/uploads/${req.file.filename}`
        
            } catch (err) {

                console.error(err);

                requestBody.image = '/images/default/default.png'
            }

            let newItem = requestBody;

            if (requestBody.finishes !== undefined) {
                newFinishes = [];
        
                const allFinishes = await Finish.find({}).lean();

                for (let fin of requestBody.finishes) {
                    let isExisting = allFinishes.map(el => {
                        return fin == el.name;
                    });

                    if (isExisting.includes(true)) {

                        const finish = await Finish.findOne({ name: fin }).lean();

                        const newFinishToPush = { name: fin, image: finish.image, id: finish._id }

                        newFinishes.push(newFinishToPush);
                    }
                }

                newItem.finishes = newFinishes;
            } else {
                newItem.finishes = [];
            }

            try {

                await Item.create(newItem);
                res.redirect('/articulos/admin');

                
            } catch (error) {
                console.error(error);
                res.render('error/500', { layout: 'admin' });
            }
        }


    } catch (err) {
        console.error(err);
        res.render('error/500', { layout: 'admin' });
    }

});




router.put('/:id', async (req, res) => {
    
    try {

        if (typeof(req.body.finishes) == 'string') {

            req.body.finishes = [req.body.finishes]

        }

        let existingItem = await Item.findById(mongoose.Types.ObjectId(req.params.id)).lean();


        if (req.body.noNewImage === 'true') {

            delete req.body.noNewImage;

            let newItem = req.body;

            if (req.body.finishes !== undefined) {
                newFinishes = [];
        
                const allFinishes = await Finish.find({}).lean();

                for (let fin of req.body.finishes) {
                    let isExisting = allFinishes.map(el => {
                        return fin == el.name;
                    });

                    if (isExisting.includes(true)) {

                        const finish = await Finish.findOne({ name: fin }).lean();

                        const newFinishToPush = { name: fin, image: finish.image, id: finish._id }

                        newFinishes.push(newFinishToPush);
                    }
                }

                newItem.finishes = newFinishes;
            } else {
                newItem.finishes = [];
            }

            try {

                existingItem = await Item.findOneAndUpdate({ _id: existingItem._id }, newItem, { new: true, runValidators: true });
                res.redirect('/articulos/admin');
                
            } catch (error) {

                console.error(error);
                res.render('error/500', { layout: 'admin' });
                
            }


        } else if (req.body.noNewImage === 'false' && req.file) {


            if (existingItem.image != "/images/default/default.png") {

                try {

                    const image = await sharp(`./public/images/uploads/${req.file.filename}`).resize(500, 500).png().toBuffer();
                    fs.writeFileSync(`./public/images/uploads/${req.file.filename}`, image);
    
                    req.body.image = `/images/uploads/${req.file.filename}`
    
                    const imgPath = path.join(__dirname, `../public${existingItem.image}`)
    
                    fs.unlinkSync(imgPath, (err) => {
                        if (err) {
                            console.error(err);
                        }
                    });
            
                } catch (err) {
    
                    console.error(err);
                    req.body.image = '/images/default/default.png'
                }    

            }

            delete req.body.noNewImage;

            let newItem = req.body;

            if (req.body.finishes !== undefined) {
                newFinishes = [];
        
                const allFinishes = await Finish.find({}).lean();

                for (let fin of req.body.finishes) {
                    let isExisting = allFinishes.map(el => {
                        return fin == el.name;
                    });

                    if (isExisting.includes(true)) {

                        const finish = await Finish.findOne({ name: fin }).lean();

                        const newFinishToPush = { name: fin, image: finish.image, id: finish._id }

                        newFinishes.push(newFinishToPush);
                    }
                }

                newItem.finishes = newFinishes;
            } else {
                newItem.finishes = [];
            }

            
            try {

                existingItem = await Item.findOneAndUpdate({ _id: existingItem._id }, newItem, { new: true, runValidators: true });
                res.redirect('/articulos/admin');
                
            } catch (error) {

                console.error(error);
                res.render('error/500', { layout: 'admin' });
                
            }

        }

    } catch (err) {
        console.error(err);
        res.render('error/500', { layout: 'admin' });
    }

});






router.delete('/:id', async (req, res) => {

    try {

        const item = await Item.findById(mongoose.Types.ObjectId(req.params.id)).lean();

        if (item.image != "/images/default/default.png") {

            try {

                const imgPath = path.join(__dirname, `../public${item.image}`)
    
                fs.unlinkSync(imgPath, (err) => {
                    if (err) {
                        console.error(err);
                    }
                });
                
            } catch (error) {

                console.error(error);
                
            }

        }

        await Item.deleteOne({ _id: item._id });
        res.redirect('/articulos/admin');
        
    } catch (error) {

        console.error(error);
        res.render('error/500', { layout: 'admin' });
        
    }

});


router.put('/acabados/:id', async (req, res) => {


    try {

        let existingFinish = await Finish.findById(mongoose.Types.ObjectId(req.params.id)).lean();


        if (req.body.noNewImage === 'true') {

            delete req.body.noNewImage;

            let newFinish = req.body;

            try {

                Finish.exists({ name: newFinish.name }, async (err, result) => {
                    if (err) {
                        return res.render('error/500', { layout: 'admin' });
                    }
        
                    if (result == true) {
                        req.flash('nameErrorEdit', 'Ese nombre de acabado/color ya se ha usado');
                        res.redirect(`/articulos/admin/editar/acabado/${req.params.id}`);
                    } else {
        
                        existingFinish = await Finish.findOneAndUpdate({ _id: existingFinish._id }, newFinish, { new: true, runValidators: true });

                        req.flash('finMsg', 'Acabado Editado!');
                        res.redirect('/articulos/admin/acabados');
        
                    }
                });
                
            } catch (error) {

                console.error(error);
                res.render('error/500', { layout: 'admin' });                
            }


        } else if (req.body.noNewImage === 'false' && req.file) {

            try {

                const image = await sharp(`./public/images/uploads/${req.file.filename}`).resize(500, 500).png().toBuffer();
                fs.writeFileSync(`./public/images/uploads/${req.file.filename}`, image);

                req.body.image = `/images/uploads/${req.file.filename}`

                const imgPath = path.join(__dirname, `../public${existingFinish.image}`)

                fs.unlinkSync(imgPath, (err) => {
                    if (err) {
                        console.error(err);
                    }
                });
        
            } catch (err) {

                console.error(err);
                req.body.image = existingFinish.image;
            }

            delete req.body.noNewImage;

            let newFinish = req.body;

            try {


                Finish.exists({ name: newFinish.name }, async (err, result) => {
                    if (err) {
                        return res.render('error/500', { layout: 'admin' });
                    }
        
                    if (result == true) {
                        req.flash('nameErrorEdit', 'Ese nombre de acabado/color ya se ha usado');
                        res.redirect(`/articulos/admin/editar/acabado/${req.params.id}`);
                    } else {
        
                        existingFinish = await Finish.findOneAndUpdate({ _id: existingFinish._id }, newFinish, { new: true, runValidators: true });
                
                        req.flash('finMsg', 'Acabado Editado!');
                        res.redirect('/articulos/admin/acabados');
        
                    }
                });
                
            } catch (error) {

                console.error(error);
                res.render('error/500', { layout: 'admin' });                
            }

        } else {
            res.redirect('/articulos/admin/acabados');
        }

    } catch (err) {
        console.error(err);
        res.render('error/404', { layout: 'admin' });
    }


});




router.get('/agregar', async (req, res) => {

    const finishes = await Finish.find({}).lean();

    console.log(finishes)
    
    res.render('items/add', { layout: 'admin', finishes, error: req.flash('itemErr') });

});



router.get('/editar/:id', async (req, res) => {

    if (!req.params.id) {
        return res.render('error/404', { layout: 'admin' });
    }

    try {

        const item = await Item.findById(mongoose.Types.ObjectId(req.params.id)).lean();

        const finishNames = item.finishes.map(el => el.name);
    
        const finishes = await Finish.find({}).lean();
    
        req.session.itemId = item._id;

        
        res.render('items/edit-item', { layout: 'admin', finishes: finishes, item: item, finishNames: finishNames });
        
    } catch (error) {

        console.error(error);
        res.render('error/404', { layout: 'admin' });        
    }

});



router.get('/editar/acabado/:id', async (req, res) => {


    if (!req.params.id) {
        return res.render('error/404', { layout: 'admin' });
    }

    try {

        const finish = await Finish.findById(mongoose.Types.ObjectId(req.params.id)).lean();
        req.session.finishId = finish._id;


        res.render('items/edit-finish', { layout: 'admin', finish: finish, error: req.flash('error'), nameError: req.flash('nameErrorEdit') });
        
    } catch (error) {

        console.error(error);
        res.render('error/404', { layout: 'admin' });        
    }

});



router.get('/agregar/acabado', (req, res) => {
    
    res.render('items/add-finish', { layout: 'admin', error: req.flash('error'), nameError: req.flash('nameError') });

});




router.delete('/acabados/:id', async (req, res) => {

    try {

        const finish = await Finish.findById(mongoose.Types.ObjectId(req.params.id)).lean();


        try {

            const imgPath = path.join(__dirname, `../public${finish.image}`)

            fs.unlinkSync(imgPath, (err) => {
                if (err) {
                    console.error(err);
                }
            });
            
        } catch (error) {
            console.error(error);          
        }


        await Finish.deleteOne({ _id: finish._id });

        const finishes = await Finish.find({}).lean();

        req.flash('finMsg', 'Acabado borrado!');

        res.redirect('/articulos/admin/acabados');
        
    } catch (error) {

        console.error(error);

        const finishes = await Finish.find({}).lean();

        req.flash('finErr', 'Ocurrio un error!');

        res.redirect('/articulos/admin/acabados');

    }

});






router.post('/acabados', async (req, res) => {


    if (req.file === undefined) {

        req.flash('error', 'Porfavor proporciona una foto' );
        return res.redirect('/articulos/admin/agregar/acabado');

    } else {

        try {

            const image = await sharp(`./public/images/finishes/${req.file.filename}`).resize(300, 300).png().toBuffer();
            fs.writeFileSync(`./public/images/finishes/${req.file.filename}`, image);

            req.body.image = `/images/finishes/${req.file.filename}`
    
        } catch (error) {

            console.error(error);
            return res.render('error/500', { layout: 'admin' });
        }

        Finish.exists({ name: req.body.name }, async (err, result) => {
            if (err) {
                return res.render('error/500', { layout: 'admin' });
            }

            if (result == true) {

                req.flash('nameError', 'Ese nombre de acabado/color ya se ha usado');
                res.redirect('/articulos/admin/agregar/acabado');

            } else {

                let newFinish = req.body;

                await Finish.create(newFinish);
                res.redirect('/articulos/admin');

            }
        });
    }
});





router.get('/acabados', async (req, res) => {

    try {

        const finishes = await Finish.find({}).lean();

        res.render('items/finishes', { layout: 'admin', finishes, err: req.flash('finErr'), msg: req.flash('finMsg') });


    } catch (error) {

        console.error(error);
        res.render('error/500', { layout: 'admin' });        
    }

});








module.exports = router;